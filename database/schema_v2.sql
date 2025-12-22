-- Baseball Card Inventory Management System
-- PostgreSQL Database Schema v2
-- Added: Consignment tracking, PSA submissions, updated inventory status

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CORE REFERENCE TABLES
-- ============================================

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    year INTEGER NOT NULL,
    release_date DATE,
    sport VARCHAR(50) DEFAULT 'Baseball',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, name, year)
);

CREATE INDEX idx_product_lines_brand ON product_lines(brand_id);
CREATE INDEX idx_product_lines_year ON product_lines(year);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_normalized VARCHAR(200) NOT NULL,
    team VARCHAR(100),
    position VARCHAR(50),
    debut_year INTEGER,
    is_rookie BOOLEAN DEFAULT FALSE,
    is_prospect BOOLEAN DEFAULT FALSE,
    mlb_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_players_name_trgm ON players USING gin(name_normalized gin_trgm_ops);
CREATE INDEX idx_players_team ON players(team);

CREATE TABLE card_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    description TEXT
);

-- ============================================
-- CHECKLIST TABLE
-- ============================================

CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_line_id UUID NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
    card_number VARCHAR(50) NOT NULL,
    player_id UUID REFERENCES players(id),
    player_name_raw VARCHAR(200),
    card_type_id UUID REFERENCES card_types(id),
    parallel_name VARCHAR(100),
    serial_numbered INTEGER,
    is_autograph BOOLEAN DEFAULT FALSE,  -- Card is manufactured as an auto
    is_relic BOOLEAN DEFAULT FALSE,
    is_rookie_card BOOLEAN DEFAULT FALSE,
    is_short_print BOOLEAN DEFAULT FALSE,
    team VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_line_id, card_number, parallel_name)
);

CREATE INDEX idx_checklists_product_line ON checklists(product_line_id);
CREATE INDEX idx_checklists_player ON checklists(player_id);
CREATE INDEX idx_checklists_card_number ON checklists(card_number);

-- ============================================
-- INVENTORY TABLE (Updated with signed/slabbed status)
-- ============================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    
    -- Card condition/status
    is_signed BOOLEAN DEFAULT FALSE,      -- Has autograph (via consignment or other)
    is_slabbed BOOLEAN DEFAULT FALSE,     -- Encapsulated by grading company
    
    -- Grading info (only relevant if is_slabbed = true)
    grade_company VARCHAR(20),            -- 'PSA', 'BGS', 'SGC', 'CGC'
    grade_value DECIMAL(4,1),             -- 10, 9.5, 9, etc.
    auto_grade DECIMAL(4,1),              -- For slabbed autos: auto grade (PSA uses 10 scale)
    cert_number VARCHAR(50),              -- Certification number from grader
    
    -- Raw card condition (only relevant if is_slabbed = false)
    raw_condition VARCHAR(20) DEFAULT 'NM',  -- 'Mint', 'NM', 'EX', 'VG', 'Good', 'Poor'
    
    -- Storage & tracking
    storage_location VARCHAR(100),
    notes TEXT,
    
    -- Cost tracking (accumulated from purchases, consignments, grading)
    total_cost DECIMAL(10,2) DEFAULT 0,   -- Total cost basis for this inventory line
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one record per card/status combination
    UNIQUE(checklist_id, is_signed, is_slabbed, grade_company, grade_value, raw_condition)
);

CREATE INDEX idx_inventory_checklist ON inventory(checklist_id);
CREATE INDEX idx_inventory_in_stock ON inventory(quantity) WHERE quantity > 0;
CREATE INDEX idx_inventory_signed ON inventory(is_signed) WHERE is_signed = true;
CREATE INDEX idx_inventory_slabbed ON inventory(is_slabbed) WHERE is_slabbed = true;

-- ============================================
-- CONSIGNER & CONSIGNMENT TABLES
-- ============================================

-- People who get autographs for us at games/events
CREATE TABLE consigners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    location VARCHAR(200),              -- City/area they cover
    default_fee DECIMAL(10,2),          -- Their standard per-card fee
    payment_method VARCHAR(100),        -- Venmo, PayPal, etc.
    payment_details TEXT,               -- Account info
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consigners_active ON consigners(is_active) WHERE is_active = true;

-- Batches of cards sent to consigners
CREATE TABLE consignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consigner_id UUID NOT NULL REFERENCES consigners(id) ON DELETE RESTRICT,
    
    -- Tracking
    reference_number VARCHAR(100),       -- Your internal tracking number
    date_sent DATE NOT NULL,
    date_returned DATE,
    expected_return_date DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'partial', 'complete', 'cancelled'
    
    -- Financial
    total_fee DECIMAL(10,2) DEFAULT 0,   -- Total fees for this consignment
    fee_paid BOOLEAN DEFAULT FALSE,
    fee_paid_date DATE,
    
    -- Shipping
    shipping_out_cost DECIMAL(10,2) DEFAULT 0,
    shipping_out_tracking VARCHAR(100),
    shipping_return_cost DECIMAL(10,2) DEFAULT 0,
    shipping_return_tracking VARCHAR(100),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consignments_consigner ON consignments(consigner_id);
CREATE INDEX idx_consignments_status ON consignments(status);
CREATE INDEX idx_consignments_date_sent ON consignments(date_sent);

-- Individual cards in a consignment
CREATE TABLE consignment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consignment_id UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
    
    -- Card reference
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    source_inventory_id UUID REFERENCES inventory(id),  -- Where it came from
    target_inventory_id UUID REFERENCES inventory(id),  -- Where it goes when signed
    
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Per-card fee
    fee_per_card DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'signed', 'refused', 'lost', 'returned_unsigned'
    date_signed DATE,
    
    -- Quality notes
    inscription TEXT,                    -- If they got an inscription
    condition_notes TEXT,                -- Any condition issues
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consignment_items_consignment ON consignment_items(consignment_id);
CREATE INDEX idx_consignment_items_checklist ON consignment_items(checklist_id);
CREATE INDEX idx_consignment_items_status ON consignment_items(status);

-- ============================================
-- GRADING SUBMISSION TABLES
-- ============================================

-- Grading companies reference
CREATE TABLE grading_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,       -- 'PSA', 'BGS', 'SGC', 'CGC', 'HGA'
    code VARCHAR(10) NOT NULL UNIQUE,       -- Short code
    website VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);

-- Service levels for each grading company
CREATE TABLE grading_service_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grading_company_id UUID NOT NULL REFERENCES grading_companies(id),
    name VARCHAR(100) NOT NULL,              -- 'Value', 'Regular', 'Express', 'Super Express'
    code VARCHAR(50),
    max_value DECIMAL(10,2),                 -- Max declared value for this tier
    base_fee DECIMAL(10,2) NOT NULL,
    estimated_days INTEGER,                  -- Typical turnaround
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(grading_company_id, name)
);

-- Submissions to grading companies
CREATE TABLE grading_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grading_company_id UUID NOT NULL REFERENCES grading_companies(id),
    service_level_id UUID REFERENCES grading_service_levels(id),
    
    -- Tracking
    submission_number VARCHAR(100),          -- PSA submission/order number
    reference_number VARCHAR(100),           -- Your internal tracking
    
    -- Dates
    date_submitted DATE NOT NULL,
    date_received DATE,                      -- When PSA received it
    date_graded DATE,                        -- When grading completed
    date_shipped_back DATE,
    date_returned DATE,                      -- When you received it back
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'preparing',  
    -- 'preparing', 'shipped', 'received', 'grading', 'shipped_back', 'complete', 'cancelled'
    
    -- Financial
    total_declared_value DECIMAL(10,2) DEFAULT 0,
    grading_fee DECIMAL(10,2) DEFAULT 0,
    shipping_to_cost DECIMAL(10,2) DEFAULT 0,
    shipping_to_tracking VARCHAR(100),
    shipping_return_cost DECIMAL(10,2) DEFAULT 0,
    shipping_return_tracking VARCHAR(100),
    insurance_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Totals
    total_cards INTEGER DEFAULT 0,
    cards_graded INTEGER DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_grading_submissions_company ON grading_submissions(grading_company_id);
CREATE INDEX idx_grading_submissions_status ON grading_submissions(status);
CREATE INDEX idx_grading_submissions_date ON grading_submissions(date_submitted);

-- Individual cards in a grading submission
CREATE TABLE grading_submission_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES grading_submissions(id) ON DELETE CASCADE,
    
    -- Card reference
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    source_inventory_id UUID REFERENCES inventory(id),  -- Raw card being submitted
    target_inventory_id UUID REFERENCES inventory(id),  -- Slabbed card when returned
    
    -- Item details
    line_number INTEGER,                     -- Position in submission
    declared_value DECIMAL(10,2),
    fee_per_card DECIMAL(10,2),
    
    -- Card state when submitted
    was_signed BOOLEAN DEFAULT FALSE,        -- Was it an auto when submitted?
    
    -- Results
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'graded', 'authentic', 'altered', 'counterfeit', 'ungradeable', 'lost'
    
    grade_value DECIMAL(4,1),                -- Final grade: 10, 9.5, 9, etc.
    auto_grade DECIMAL(4,1),                 -- Auto grade if applicable
    cert_number VARCHAR(50),                 -- PSA cert number
    label_type VARCHAR(50),                  -- 'standard', 'auto', 'authentic', 'altered'
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_grading_items_submission ON grading_submission_items(submission_id);
CREATE INDEX idx_grading_items_checklist ON grading_submission_items(checklist_id);
CREATE INDEX idx_grading_items_status ON grading_submission_items(status);
CREATE INDEX idx_grading_items_grade ON grading_submission_items(grade_value);

-- ============================================
-- FINANCIAL TABLES
-- ============================================

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_date DATE NOT NULL,
    vendor VARCHAR(200),
    invoice_number VARCHAR(100),
    total_cost DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL,
    is_signed BOOLEAN DEFAULT FALSE,
    is_slabbed BOOLEAN DEFAULT FALSE,
    grade_company VARCHAR(20),
    grade_value DECIMAL(4,1),
    raw_condition VARCHAR(20) DEFAULT 'NM',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_checklist ON purchase_items(checklist_id);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    platform VARCHAR(100),
    buyer_name VARCHAR(200),
    order_number VARCHAR(100),
    subtotal DECIMAL(10, 2),
    shipping_charged DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    platform_fees DECIMAL(10, 2) DEFAULT 0,
    payment_fees DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price DECIMAL(10, 2) NOT NULL,
    is_signed BOOLEAN DEFAULT FALSE,
    is_slabbed BOOLEAN DEFAULT FALSE,
    grade_company VARCHAR(20),
    grade_value DECIMAL(4,1),
    cost_basis DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_checklist ON sale_items(checklist_id);

-- ============================================
-- COST TRACKING VIEW
-- ============================================

-- View to calculate total cost basis for any inventory item
CREATE OR REPLACE VIEW inventory_cost_breakdown AS
SELECT 
    i.id AS inventory_id,
    i.checklist_id,
    i.quantity,
    i.is_signed,
    i.is_slabbed,
    
    -- Purchase costs
    COALESCE(purchase_costs.total, 0) AS purchase_cost,
    
    -- Consignment fees (for signed cards)
    COALESCE(consignment_costs.total, 0) AS consignment_cost,
    
    -- Grading fees (for slabbed cards)
    COALESCE(grading_costs.total, 0) AS grading_cost,
    
    -- Total cost
    COALESCE(purchase_costs.total, 0) + 
    COALESCE(consignment_costs.total, 0) + 
    COALESCE(grading_costs.total, 0) AS total_cost
    
FROM inventory i

LEFT JOIN LATERAL (
    SELECT SUM(pi.unit_cost * pi.quantity) AS total
    FROM purchase_items pi
    WHERE pi.inventory_id = i.id
) purchase_costs ON true

LEFT JOIN LATERAL (
    SELECT SUM(ci.fee_per_card * ci.quantity) AS total
    FROM consignment_items ci
    WHERE ci.target_inventory_id = i.id
    AND ci.status = 'signed'
) consignment_costs ON true

LEFT JOIN LATERAL (
    SELECT SUM(gi.fee_per_card) AS total
    FROM grading_submission_items gi
    WHERE gi.target_inventory_id = i.id
    AND gi.status = 'graded'
) grading_costs ON true;

-- ============================================
-- ANALYTICS VIEWS
-- ============================================

-- Consigner performance summary
CREATE OR REPLACE VIEW consigner_summary AS
SELECT 
    c.id AS consigner_id,
    c.name,
    c.is_active,
    COUNT(DISTINCT con.id) AS total_consignments,
    COUNT(ci.id) AS total_cards_sent,
    SUM(CASE WHEN ci.status = 'signed' THEN ci.quantity ELSE 0 END) AS cards_signed,
    SUM(CASE WHEN ci.status = 'refused' THEN ci.quantity ELSE 0 END) AS cards_refused,
    SUM(CASE WHEN ci.status = 'pending' THEN ci.quantity ELSE 0 END) AS cards_pending,
    SUM(ci.fee_per_card * ci.quantity) FILTER (WHERE ci.status = 'signed') AS total_fees_paid,
    ROUND(
        SUM(CASE WHEN ci.status = 'signed' THEN ci.quantity ELSE 0 END)::DECIMAL / 
        NULLIF(SUM(ci.quantity), 0) * 100, 1
    ) AS success_rate
FROM consigners c
LEFT JOIN consignments con ON con.consigner_id = c.id
LEFT JOIN consignment_items ci ON ci.consignment_id = con.id
GROUP BY c.id, c.name, c.is_active;

-- Grading submission summary
CREATE OR REPLACE VIEW grading_submission_summary AS
SELECT 
    gs.id AS submission_id,
    gc.name AS grading_company,
    gsl.name AS service_level,
    gs.submission_number,
    gs.status,
    gs.date_submitted,
    gs.date_returned,
    gs.total_cards,
    gs.cards_graded,
    AVG(gsi.grade_value) FILTER (WHERE gsi.status = 'graded') AS avg_grade,
    COUNT(*) FILTER (WHERE gsi.grade_value = 10) AS gem_mint_count,
    COUNT(*) FILTER (WHERE gsi.grade_value >= 9) AS mint_plus_count,
    gs.grading_fee + gs.shipping_to_cost + gs.shipping_return_cost + gs.insurance_cost AS total_cost
FROM grading_submissions gs
JOIN grading_companies gc ON gc.id = gs.grading_company_id
LEFT JOIN grading_service_levels gsl ON gsl.id = gs.service_level_id
LEFT JOIN grading_submission_items gsi ON gsi.submission_id = gs.id
GROUP BY gs.id, gc.name, gsl.name;

-- Player inventory with full cost breakdown
CREATE OR REPLACE VIEW player_inventory_full AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    p.team,
    COUNT(DISTINCT c.id) AS unique_cards,
    SUM(i.quantity) AS total_cards,
    SUM(CASE WHEN i.is_signed THEN i.quantity ELSE 0 END) AS signed_count,
    SUM(CASE WHEN i.is_slabbed THEN i.quantity ELSE 0 END) AS slabbed_count,
    SUM(CASE WHEN c.is_rookie_card THEN i.quantity ELSE 0 END) AS rookie_count,
    SUM(i.total_cost) AS total_cost_basis
FROM players p
JOIN checklists c ON c.player_id = p.id
JOIN inventory i ON i.checklist_id = c.id
WHERE i.quantity > 0
GROUP BY p.id, p.name, p.team;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO brands (name, slug) VALUES 
    ('Topps', 'topps'),
    ('Bowman', 'bowman'),
    ('Panini', 'panini'),
    ('Upper Deck', 'upper-deck'),
    ('Leaf', 'leaf');

INSERT INTO card_types (name, category, description) VALUES
    ('Base', 'base', 'Standard base card'),
    ('Refractor', 'parallel', 'Chrome refractor parallel'),
    ('Gold Refractor', 'parallel', 'Gold chrome refractor'),
    ('Orange Refractor', 'parallel', 'Orange chrome refractor'),
    ('Blue Refractor', 'parallel', 'Blue chrome refractor'),
    ('Purple Refractor', 'parallel', 'Purple chrome refractor'),
    ('Green Refractor', 'parallel', 'Green chrome refractor'),
    ('Red Refractor', 'parallel', 'Red chrome refractor'),
    ('Superfractor', 'parallel', '1/1 Superfractor'),
    ('Printing Plate', 'parallel', '1/1 Printing plate'),
    ('Auto', 'auto', 'Autographed card'),
    ('Refractor Auto', 'auto', 'Autographed refractor'),
    ('Relic', 'relic', 'Game-used memorabilia card'),
    ('Auto Relic', 'auto_relic', 'Autographed memorabilia card'),
    ('Insert', 'insert', 'Insert set card'),
    ('Short Print', 'base', 'Short print variation'),
    ('Image Variation', 'base', 'Image variation/SSP'),
    ('1st Bowman', 'base', 'First Bowman card'),
    ('1st Bowman Chrome', 'base', 'First Bowman Chrome card'),
    ('Prospect', 'base', 'Prospect card');

INSERT INTO grading_companies (name, code, website, is_active) VALUES
    ('PSA', 'PSA', 'https://www.psacard.com', true),
    ('BGS', 'BGS', 'https://www.beckett.com/grading', true),
    ('SGC', 'SGC', 'https://www.sgccard.com', true),
    ('CGC', 'CGC', 'https://www.cgccards.com', true),
    ('HGA', 'HGA', 'https://www.hybridga.com', true);

INSERT INTO grading_service_levels (grading_company_id, name, code, max_value, base_fee, estimated_days) 
SELECT id, 'Value', 'VALUE', 499, 25.00, 65 FROM grading_companies WHERE code = 'PSA'
UNION ALL
SELECT id, 'Regular', 'REGULAR', 1499, 50.00, 45 FROM grading_companies WHERE code = 'PSA'
UNION ALL
SELECT id, 'Express', 'EXPRESS', 2499, 100.00, 20 FROM grading_companies WHERE code = 'PSA'
UNION ALL
SELECT id, 'Super Express', 'SUPER', 4999, 200.00, 10 FROM grading_companies WHERE code = 'PSA'
UNION ALL
SELECT id, 'Walk-Through', 'WALK', 9999, 600.00, 3 FROM grading_companies WHERE code = 'PSA';

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_lines_updated_at BEFORE UPDATE ON product_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consigners_updated_at BEFORE UPDATE ON consigners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consignments_updated_at BEFORE UPDATE ON consignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consignment_items_updated_at BEFORE UPDATE ON consignment_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grading_submissions_updated_at BEFORE UPDATE ON grading_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grading_items_updated_at BEFORE UPDATE ON grading_submission_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to normalize player names
CREATE OR REPLACE FUNCTION normalize_player_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRANSLATE(name, 'áéíóúàèìòùâêîôûäëïöüñ', 'aeiouaeiouaeiouaeioun'),
                '[^a-zA-Z0-9\s]', '', 'g'
            ),
            '\s+', ' ', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION normalize_player_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name_normalized = normalize_player_name(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_name_normalize BEFORE INSERT OR UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION normalize_player_name_trigger();

-- Function to update inventory cost when consignment item is marked signed
CREATE OR REPLACE FUNCTION update_inventory_from_consignment()
RETURNS TRIGGER AS $$
BEGIN
    -- When item is marked as signed, update target inventory cost
    IF NEW.status = 'signed' AND OLD.status != 'signed' AND NEW.target_inventory_id IS NOT NULL THEN
        UPDATE inventory 
        SET total_cost = total_cost + (NEW.fee_per_card * NEW.quantity)
        WHERE id = NEW.target_inventory_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consignment_item_signed AFTER UPDATE ON consignment_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_from_consignment();

-- Function to update inventory cost when grading is complete
CREATE OR REPLACE FUNCTION update_inventory_from_grading()
RETURNS TRIGGER AS $$
BEGIN
    -- When item is graded, update target inventory cost
    IF NEW.status = 'graded' AND OLD.status != 'graded' AND NEW.target_inventory_id IS NOT NULL THEN
        UPDATE inventory 
        SET total_cost = total_cost + COALESCE(NEW.fee_per_card, 0)
        WHERE id = NEW.target_inventory_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grading_item_complete AFTER UPDATE ON grading_submission_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_from_grading();
