-- Migration: 003_card_types_parallels.sql (FIXED)
-- Description: Add base types, parallels, and restructure checklists for prospect cards

BEGIN;

-- ============================================
-- BASE CARD TYPES (Paper, Chrome, Mega, Sapphire)
-- ============================================

CREATE TABLE IF NOT EXISTS card_base_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO card_base_types (name, description, sort_order) VALUES
    ('Paper', 'Standard paper prospect cards (BP- prefix)', 1),
    ('Chrome', 'Base chrome prospect cards (BCP- prefix)', 2),
    ('Mega', 'Mega Box exclusive chrome cards', 3),
    ('Sapphire', 'Sapphire Edition chrome cards', 4)
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PARALLEL CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS parallel_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO parallel_categories (name, sort_order) VALUES
    ('Core', 1),
    ('Patterned', 2),
    ('Shimmer/Wave', 3),
    ('Exclusive', 4),
    ('Snack Pack', 5),
    ('Year-Specific', 6)
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PARALLELS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS parallels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES parallel_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    short_name VARCHAR(50) NOT NULL,
    print_run INTEGER,
    is_numbered BOOLEAN DEFAULT true,
    is_one_of_one BOOLEAN DEFAULT false,
    pattern_description TEXT,
    year_introduced INTEGER,
    typical_source VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Refractors
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Core'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.sort_order
FROM (VALUES
    ('Base', 'Base', NULL::INTEGER, false, NULL::TEXT, 0),
    ('Refractor', 'Refractor', 499, true, 'Silver rainbow effect', 1),
    ('Speckle Refractor', 'Speckle', 299, true, 'Speckled pattern overlay', 2),
    ('Purple Refractor', 'Purple', 250, true, NULL::TEXT, 3),
    ('Blue Refractor', 'Blue', 150, true, NULL::TEXT, 4),
    ('Green Refractor', 'Green', 99, true, NULL::TEXT, 5),
    ('Gold Refractor', 'Gold', 50, true, NULL::TEXT, 6),
    ('Orange Refractor', 'Orange', 25, true, 'Typically Hobby exclusive', 7),
    ('Red Refractor', 'Red', 5, true, NULL::TEXT, 8),
    ('SuperFractor', 'Super', 1, true, 'Gold spiral design, ultimate chase', 9)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, sort_order)
ON CONFLICT (name) DO NOTHING;

-- Patterned Refractors
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Patterned'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.sort_order
FROM (VALUES
    ('Atomic Refractor', 'Atomic', NULL::INTEGER, true, 'Cracked ice pattern', 10),
    ('X-Fractor', 'X-Fractor', NULL::INTEGER, true, 'Checkerboard X pattern', 11),
    ('Lava Refractor', 'Lava', 399, true, 'Volcanic/lava flow pattern', 12),
    ('Mini-Diamond Refractor', 'Mini-Diamond', 150, true, 'Small diamond pattern', 13),
    ('Reptilian Refractor', 'Reptilian', 199, true, 'Scaly reptile skin pattern', 14),
    ('Etched-In Glass', 'Etched', NULL::INTEGER, true, 'Stained-glass style variation', 15),
    ('Prism Refractor', 'Prism', NULL::INTEGER, true, 'Prismatic light pattern', 16)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, sort_order)
ON CONFLICT (name) DO NOTHING;

-- Shimmer/Wave Refractors
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Shimmer/Wave'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.sort_order
FROM (VALUES
    ('Blue Shimmer Refractor', 'Blue Shimmer', NULL::INTEGER, true, 'Blue with shimmer effect', 20),
    ('Gold Shimmer Refractor', 'Gold Shimmer', NULL::INTEGER, true, 'Gold with shimmer effect', 21),
    ('Red Shimmer Refractor', 'Red Shimmer', NULL::INTEGER, true, 'Red with shimmer effect', 22),
    ('Purple Shimmer Refractor', 'Purple Shimmer', NULL::INTEGER, true, 'Purple with shimmer effect', 23),
    ('Blue Wave Refractor', 'Blue Wave', NULL::INTEGER, true, 'Blue with wave pattern', 24),
    ('Green Wave Refractor', 'Green Wave', NULL::INTEGER, true, 'Green with wave pattern', 25),
    ('Gold Wave Refractor', 'Gold Wave', NULL::INTEGER, true, 'Gold with wave pattern', 26)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, sort_order)
ON CONFLICT (name) DO NOTHING;

-- Exclusive Parallels
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, typical_source, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Exclusive'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.source, v.sort_order
FROM (VALUES
    ('Aqua Refractor', 'Aqua', NULL::INTEGER, true, 'Aqua/teal color', 'Breaker exclusive', 30),
    ('Geometric Refractor', 'Geometric', NULL::INTEGER, true, 'Geometric shape pattern', 'Breaker exclusive', 31),
    ('Fuchsia Refractor', 'Fuchsia', 199, true, 'Bright pink/fuchsia', NULL::TEXT, 32),
    ('Pink Refractor', 'Pink', NULL::INTEGER, true, 'Pink coloring', NULL::TEXT, 33),
    ('Black Refractor', 'Black', 10, true, 'Black coloring', NULL::TEXT, 34),
    ('Pearl Refractor', 'Pearl', NULL::INTEGER, true, 'Pearlescent finish', 'Rare pack insert', 35),
    ('Steel Metal Refractor', 'Steel Metal', 100, true, 'Metallic steel finish', NULL::TEXT, 36),
    ('Pulsar Refractor', 'Pulsar', 399, true, 'New in 2025', NULL::TEXT, 37),
    ('Mojo Refractor', 'Mojo', NULL::INTEGER, true, 'Tire-tread pattern', 'Mega Box exclusive', 38),
    ('Rose Gold Mojo Refractor', 'Rose Gold Mojo', 1, true, 'Rose gold tire-tread', 'Mega Box 1/1', 39),
    ('Camo Refractor', 'Camo', NULL::INTEGER, true, 'Camouflage pattern', NULL::TEXT, 40),
    ('Negative Refractor', 'Negative', NULL::INTEGER, true, 'Color inverted', NULL::TEXT, 41),
    ('Sepia Refractor', 'Sepia', NULL::INTEGER, true, 'Sepia tone', NULL::TEXT, 42),
    ('Printing Plate Black', 'Plate Black', 1, true, 'Actual printing plate', NULL::TEXT, 43),
    ('Printing Plate Cyan', 'Plate Cyan', 1, true, 'Actual printing plate', NULL::TEXT, 44),
    ('Printing Plate Magenta', 'Plate Magenta', 1, true, 'Actual printing plate', NULL::TEXT, 45),
    ('Printing Plate Yellow', 'Plate Yellow', 1, true, 'Actual printing plate', NULL::TEXT, 46)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, source, sort_order)
ON CONFLICT (name) DO NOTHING;

-- Snack Pack Parallels
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, typical_source, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Snack Pack'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.source, v.sort_order
FROM (VALUES
    ('Gumball Refractor', 'Gumball', NULL::INTEGER, true, 'Gumball themed', 'Variety pack', 50),
    ('Popcorn Refractor', 'Popcorn', NULL::INTEGER, true, 'Popcorn themed', 'Variety pack', 51),
    ('Sunflower Seeds Refractor', 'Sunflower', NULL::INTEGER, true, 'Sunflower seeds themed', 'Variety pack', 52),
    ('Peanut Refractor', 'Peanut', NULL::INTEGER, true, 'Peanut themed', 'Pearl pack', 53),
    ('Cotton Candy Refractor', 'Cotton Candy', NULL::INTEGER, true, 'Cotton candy themed', 'Variety pack', 54),
    ('Hot Dog Refractor', 'Hot Dog', NULL::INTEGER, true, 'Hot dog themed', 'Variety pack', 55)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, source, sort_order)
ON CONFLICT (name) DO NOTHING;

-- Year-Specific Parallels (2024-2025)
INSERT INTO parallels (category_id, name, short_name, print_run, is_numbered, pattern_description, year_introduced, sort_order)
SELECT 
    (SELECT id FROM parallel_categories WHERE name = 'Year-Specific'),
    v.name, v.short_name, v.print_run::INTEGER, v.is_numbered, v.pattern_desc, v.year_intro, v.sort_order
FROM (VALUES
    ('International Refractor', 'International', NULL::INTEGER, true, 'International variation', 2024, 60),
    ('Color Run Variation', 'Color Run', NULL::INTEGER, true, 'Rookie color run', 2025, 61),
    ('Retrofractor', 'Retrofractor', NULL::INTEGER, true, 'Retro style variation', 2024, 62),
    ('College Variation', 'College', NULL::INTEGER, false, 'College uniform image', 2024, 63),
    ('Image Variation', 'Image Var', NULL::INTEGER, false, 'Alternate photo', 2024, 64),
    ('Prospect Prospectors Die Cut', 'Prospectors', NULL::INTEGER, true, 'Special die cut shape', 2024, 65)
) AS v(name, short_name, print_run, is_numbered, pattern_desc, year_intro, sort_order)
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- UPDATE CHECKLISTS TABLE
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklists' AND column_name = 'base_type_id') THEN
        ALTER TABLE checklists ADD COLUMN base_type_id UUID REFERENCES card_base_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklists' AND column_name = 'card_prefix') THEN
        ALTER TABLE checklists ADD COLUMN card_prefix VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklists' AND column_name = 'card_suffix') THEN
        ALTER TABLE checklists ADD COLUMN card_suffix VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklists' AND column_name = 'set_name') THEN
        ALTER TABLE checklists ADD COLUMN set_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklists' AND column_name = 'raw_checklist_line') THEN
        ALTER TABLE checklists ADD COLUMN raw_checklist_line TEXT;
    END IF;
END $$;


-- ============================================
-- UPDATE INVENTORY TABLE
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory' AND column_name = 'base_type_id') THEN
        ALTER TABLE inventory ADD COLUMN base_type_id UUID REFERENCES card_base_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory' AND column_name = 'parallel_id') THEN
        ALTER TABLE inventory ADD COLUMN parallel_id UUID REFERENCES parallels(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory' AND column_name = 'serial_number') THEN
        ALTER TABLE inventory ADD COLUMN serial_number INTEGER;
    END IF;
END $$;

-- Update unique constraint (drop old, add new)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS uq_inventory_card_status;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS uq_inventory_card_variant;

ALTER TABLE inventory ADD CONSTRAINT uq_inventory_card_variant UNIQUE (
    checklist_id, 
    base_type_id,
    parallel_id,
    is_signed, 
    is_slabbed, 
    grade_company, 
    grade_value, 
    raw_condition
);


-- ============================================
-- CARD PREFIX MAPPING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS card_prefix_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix VARCHAR(20) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    card_type VARCHAR(50) NOT NULL,
    is_autograph BOOLEAN DEFAULT false,
    is_prospect BOOLEAN DEFAULT true,
    base_type_name VARCHAR(50),
    notes TEXT,
    UNIQUE(prefix, product_type)
);

INSERT INTO card_prefix_mappings (prefix, product_type, card_type, is_autograph, is_prospect, base_type_name, notes) VALUES
    ('BP', 'Bowman', 'Paper Prospects', false, true, 'Paper', 'Standard paper prospect cards'),
    ('BCP', 'Bowman', 'Chrome Prospects', false, true, 'Chrome', 'Chrome prospect cards in Bowman'),
    ('BPA', 'Bowman', 'Paper Prospect Autographs', true, true, 'Paper', 'Paper prospect autographs'),
    ('CPA', 'Bowman', 'Chrome Prospect Autographs', true, true, 'Chrome', 'Chrome prospect autographs'),
    ('PPRA', 'Bowman', 'Paper Prospect Retail Autographs', true, true, 'Paper', 'Retail exclusive paper autos'),
    ('BCP', 'Bowman Chrome', 'Chrome Prospects', false, true, 'Chrome', 'Main chrome prospect set'),
    ('CPA', 'Bowman Chrome', 'Chrome Prospect Autographs', true, true, 'Chrome', 'Chrome prospect autographs'),
    ('CRA', 'Bowman Chrome', 'Chrome Rookie Autographs', true, false, 'Chrome', 'Rookie autographs'),
    ('PCS', 'Bowman Chrome', 'Prime Chrome Signatures', true, true, 'Chrome', 'Premium autograph insert'),
    ('BD', 'Bowman Draft', 'Base Prospects', false, true, 'Paper', 'Paper base draft prospects'),
    ('BDC', 'Bowman Draft', 'Chrome Prospects', false, true, 'Chrome', 'Chrome draft prospects'),
    ('CPA', 'Bowman Draft', 'Chrome Prospect Autographs', true, true, 'Chrome', 'Draft chrome autos'),
    ('PDA', 'Bowman Draft', 'Prospect Dual Autographs', true, true, 'Chrome', 'Dual autograph cards'),
    ('DPPA', 'Bowman Draft', 'Draft Portrait Autographs', true, true, 'Chrome', 'Portrait style autos')
ON CONFLICT (prefix, product_type) DO UPDATE SET
    card_type = EXCLUDED.card_type,
    is_autograph = EXCLUDED.is_autograph,
    base_type_name = EXCLUDED.base_type_name;


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_checklists_base_type ON checklists(base_type_id);
CREATE INDEX IF NOT EXISTS idx_checklists_prefix ON checklists(card_prefix);
CREATE INDEX IF NOT EXISTS idx_checklists_set_name ON checklists(set_name);
CREATE INDEX IF NOT EXISTS idx_inventory_base_type ON inventory(base_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_parallel ON inventory(parallel_id);
CREATE INDEX IF NOT EXISTS idx_parallels_category ON parallels(category_id);
CREATE INDEX IF NOT EXISTS idx_parallels_print_run ON parallels(print_run);


COMMIT;