-- Migration: Add cost breakdown and source tracking to inventory
-- Date: 2026-01-23

-- Add granular cost fields
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS card_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS signing_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grading_cost DECIMAL(10, 2) DEFAULT 0;

-- Add source tracking fields
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS consigner VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS how_obtained VARCHAR(50);

-- Ensure total_cost column exists (it may have been added by previous model updates)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2) DEFAULT 0;

-- Add index for consigner lookups
CREATE INDEX IF NOT EXISTS idx_inventory_consigner ON inventory(consigner) WHERE consigner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_how_obtained ON inventory(how_obtained) WHERE how_obtained IS NOT NULL;
