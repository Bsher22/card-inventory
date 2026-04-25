-- ============================================================
-- eBay Consignments Module
-- ============================================================
-- Adds tables to manage consignments of items (non-card) that
-- IDGAS sells on eBay on behalf of third-party clients.
--
-- Tables:
--   ebay_consigners              - Client whose stuff we sell
--   ebay_consignment_agreements  - Signed agreement header
--   ebay_consignment_items       - Individual items on agreement
--   ebay_consignment_payouts     - Monthly payout / statement record
--
-- Run after schema_v2.sql.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- eBay Consigners (the clients, separate from autograph consigners)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ebay_consigners (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(200) NOT NULL,
    email            VARCHAR(200),
    phone            VARCHAR(50),

    -- Mailing address (appears on the agreement)
    street_address   VARCHAR(500),
    city             VARCHAR(100),
    state            VARCHAR(50),
    postal_code      VARCHAR(20),
    country          VARCHAR(100) DEFAULT 'USA',

    -- Default consigner payout percent used to pre-fill new agreements
    -- (e.g. 80.00 means consigner receives 80% of each sale)
    default_payout_percent NUMERIC(5,2),

    -- How client gets paid
    payment_method   VARCHAR(100),   -- 'Check', 'Venmo', 'PayPal', 'Zelle', 'ACH'
    payment_details  TEXT,           -- account / handle, free text

    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    notes            TEXT,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ebay_consigners_name     ON ebay_consigners (name);
CREATE INDEX IF NOT EXISTS idx_ebay_consigners_active   ON ebay_consigners (is_active);


-- ------------------------------------------------------------
-- eBay Consignment Agreements
-- ------------------------------------------------------------
-- Header for a signed agreement between IDGAS and a consigner.
-- One agreement can cover many items.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ebay_consignment_agreements (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consigner_id          UUID NOT NULL REFERENCES ebay_consigners(id) ON DELETE RESTRICT,

    agreement_number      VARCHAR(50) UNIQUE,   -- auto-generated, e.g. "ECA-2026-0001"
    agreement_date        DATE NOT NULL,

    -- Workflow status
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- draft | sent | signed | active | completed | cancelled

    -- Payout model: percentage of each item's sale price the consigner
    -- receives (before pass-through eBay/payment/shipping fees).  IDGAS
    -- keeps (100 - payout_percent)% as commission.
    payout_percent        NUMERIC(5,2) NOT NULL,

    -- Signature tracking (local only - DocuSign fields below reserved for future)
    client_signature_name VARCHAR(200),
    client_signed_at      TIMESTAMPTZ,
    idgas_signature_name  VARCHAR(200),
    idgas_signed_at       TIMESTAMPTZ,

    -- PDF & optional e-signature future-proofing
    pdf_path              VARCHAR(500),
    docusign_envelope_id  VARCHAR(200),
    docusign_status       VARCHAR(50),

    notes                 TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ebay_agreements_status_check CHECK (
        status IN ('draft','sent','signed','active','completed','cancelled')
    ),
    CONSTRAINT ebay_agreements_payout_check CHECK (
        payout_percent >= 0 AND payout_percent <= 100
    )
);

-- ============================================================
-- Robust column-presence migration
-- ============================================================
-- Handles three possible starting states for already-deployed databases:
--   (a) old column only        (fee_percent / default_fee_percent)
--   (b) new column only        (payout_percent / default_payout_percent)
--   (c) somehow neither (table created from a schema that diverged)
--
-- Strategy:
--   1. Always ADD the new column IF NOT EXISTS (no-op if present).
--   2. If the OLD column exists, copy its value (flipped: new = 100 - old)
--      into the new column for any row whose new column is NULL, then DROP
--      the old column.
--   3. Default any leftover NULL rows to a sensible value so we can re-impose
--      NOT NULL on the agreement-level column.
-- ============================================================

-- ---- ebay_consignment_agreements.payout_percent ----
ALTER TABLE ebay_consignment_agreements
    ADD COLUMN IF NOT EXISTS payout_percent NUMERIC(5,2);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ebay_consignment_agreements'
          AND column_name = 'fee_percent'
    ) THEN
        UPDATE ebay_consignment_agreements
           SET payout_percent = 100 - fee_percent
         WHERE payout_percent IS NULL AND fee_percent IS NOT NULL;
        ALTER TABLE ebay_consignment_agreements DROP COLUMN fee_percent;
    END IF;
END $$;

-- Re-impose NOT NULL + check.  If any rows still NULL (no fee_percent value
-- was ever set), default them to 80% so the constraint can apply.
UPDATE ebay_consignment_agreements
   SET payout_percent = 80 WHERE payout_percent IS NULL;

ALTER TABLE ebay_consignment_agreements
    ALTER COLUMN payout_percent SET NOT NULL;

ALTER TABLE ebay_consignment_agreements
    DROP CONSTRAINT IF EXISTS ebay_agreements_fee_check;
ALTER TABLE ebay_consignment_agreements
    DROP CONSTRAINT IF EXISTS ebay_agreements_payout_check;
ALTER TABLE ebay_consignment_agreements
    ADD CONSTRAINT ebay_agreements_payout_check
    CHECK (payout_percent >= 0 AND payout_percent <= 100);


-- ---- ebay_consigners.default_payout_percent ----
ALTER TABLE ebay_consigners
    ADD COLUMN IF NOT EXISTS default_payout_percent NUMERIC(5,2);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ebay_consigners'
          AND column_name = 'default_fee_percent'
    ) THEN
        UPDATE ebay_consigners
           SET default_payout_percent = 100 - default_fee_percent
         WHERE default_payout_percent IS NULL AND default_fee_percent IS NOT NULL;
        ALTER TABLE ebay_consigners DROP COLUMN default_fee_percent;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ebay_agreements_consigner ON ebay_consignment_agreements (consigner_id);
CREATE INDEX IF NOT EXISTS idx_ebay_agreements_status    ON ebay_consignment_agreements (status);
CREATE INDEX IF NOT EXISTS idx_ebay_agreements_date      ON ebay_consignment_agreements (agreement_date);


-- ------------------------------------------------------------
-- eBay Consignment Payouts
-- ------------------------------------------------------------
-- Monthly statement generated for a consigner. A payout record
-- "claims" all un-paid-out sold items in its period.  Items keep a
-- FK back so a single sold item is only ever paid out once.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ebay_consignment_payouts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consigner_id        UUID NOT NULL REFERENCES ebay_consigners(id) ON DELETE RESTRICT,

    -- Statement period
    period_year         INT NOT NULL,
    period_month        INT NOT NULL,

    -- Computed totals (locked in at generation time)
    total_gross         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Sum of sold_price
    total_idgas_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Our commission
    total_ebay_fees     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Pass-through eBay fees
    total_other_fees    NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Payment / shipping etc.
    net_payout          NUMERIC(12,2) NOT NULL DEFAULT 0,  -- What client is owed
    item_count          INT NOT NULL DEFAULT 0,

    -- Payment tracking
    is_paid             BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at             TIMESTAMPTZ,
    paid_method         VARCHAR(100),
    paid_reference      VARCHAR(200),

    statement_pdf_path  VARCHAR(500),
    notes               TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ebay_payouts_month_check CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT ebay_payouts_unique_period UNIQUE (consigner_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_ebay_payouts_consigner ON ebay_consignment_payouts (consigner_id);
CREATE INDEX IF NOT EXISTS idx_ebay_payouts_period    ON ebay_consignment_payouts (period_year, period_month);


-- ------------------------------------------------------------
-- eBay Consignment Items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ebay_consignment_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id      UUID NOT NULL REFERENCES ebay_consignment_agreements(id) ON DELETE CASCADE,

    -- Description
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    category          VARCHAR(100),           -- free text: "Memorabilia", "Cards", etc.
    condition         VARCHAR(100),

    -- Pricing
    minimum_price     NUMERIC(10,2) NOT NULL,

    -- Workflow status
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | listed | sold | unsold | returned | cancelled

    -- Listing details
    ebay_listing_id   VARCHAR(100),
    listed_at         TIMESTAMPTZ,

    -- Sale details (populated when status='sold')
    sold_at           TIMESTAMPTZ,
    sold_price        NUMERIC(10,2),
    ebay_fees         NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_fees      NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
    buyer_info        VARCHAR(200),

    -- Links to payout once included in a monthly statement.
    -- Nullable until paid out.  ON DELETE SET NULL lets us regenerate.
    payout_id         UUID REFERENCES ebay_consignment_payouts(id) ON DELETE SET NULL,

    notes             TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ebay_items_status_check CHECK (
        status IN ('pending','listed','sold','unsold','returned','cancelled')
    ),
    CONSTRAINT ebay_items_min_price_check CHECK (minimum_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ebay_items_agreement ON ebay_consignment_items (agreement_id);
CREATE INDEX IF NOT EXISTS idx_ebay_items_status    ON ebay_consignment_items (status);
CREATE INDEX IF NOT EXISTS idx_ebay_items_sold_at   ON ebay_consignment_items (sold_at);
CREATE INDEX IF NOT EXISTS idx_ebay_items_payout    ON ebay_consignment_items (payout_id);


-- ------------------------------------------------------------
-- Auto-generate sequential agreement numbers like ECA-2026-0001
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS ebay_agreement_number_seq START 1;

CREATE OR REPLACE FUNCTION gen_ebay_agreement_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agreement_number IS NULL OR NEW.agreement_number = '' THEN
        NEW.agreement_number := 'ECA-' || TO_CHAR(COALESCE(NEW.agreement_date, CURRENT_DATE), 'YYYY')
                                 || '-' || LPAD(nextval('ebay_agreement_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ebay_agreement_number ON ebay_consignment_agreements;
CREATE TRIGGER trg_ebay_agreement_number
BEFORE INSERT ON ebay_consignment_agreements
FOR EACH ROW EXECUTE FUNCTION gen_ebay_agreement_number();


-- ------------------------------------------------------------
-- Auto-update updated_at on row modification (reuses any existing
-- trigger_set_timestamp function if present, otherwise defines one)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_ebay_consigners ON ebay_consigners;
CREATE TRIGGER set_timestamp_ebay_consigners
BEFORE UPDATE ON ebay_consigners
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_ebay_agreements ON ebay_consignment_agreements;
CREATE TRIGGER set_timestamp_ebay_agreements
BEFORE UPDATE ON ebay_consignment_agreements
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_ebay_items ON ebay_consignment_items;
CREATE TRIGGER set_timestamp_ebay_items
BEFORE UPDATE ON ebay_consignment_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_ebay_payouts ON ebay_consignment_payouts;
CREATE TRIGGER set_timestamp_ebay_payouts
BEFORE UPDATE ON ebay_consignment_payouts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMIT;
