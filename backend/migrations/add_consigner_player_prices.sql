-- Migration: Add consigner_player_prices table
-- Purpose: Track per-player pricing quotes from each consigner
-- Run this on Railway PostgreSQL

-- ============================================
-- CONSIGNER PLAYER PRICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS consigner_player_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consigner_id UUID NOT NULL REFERENCES consigners(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Pricing
    price_per_card DECIMAL(10,2) NOT NULL,

    -- Metadata
    notes TEXT,
    effective_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partial unique index: only one active price per consigner/player combination
CREATE UNIQUE INDEX IF NOT EXISTS uq_consigner_player_active
    ON consigner_player_prices(consigner_id, player_id)
    WHERE is_active = true;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cpp_consigner ON consigner_player_prices(consigner_id);
CREATE INDEX IF NOT EXISTS idx_cpp_player ON consigner_player_prices(player_id);
CREATE INDEX IF NOT EXISTS idx_cpp_active ON consigner_player_prices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cpp_price ON consigner_player_prices(price_per_card);

-- Comments
COMMENT ON TABLE consigner_player_prices IS 'Per-player pricing quotes from consigners';
COMMENT ON COLUMN consigner_player_prices.price_per_card IS 'What this consigner charges for this specific player';
COMMENT ON COLUMN consigner_player_prices.effective_date IS 'When this price quote was received/became effective';
COMMENT ON COLUMN consigner_player_prices.is_active IS 'FALSE to keep historical prices without using them';
