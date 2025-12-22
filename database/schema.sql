-- Baseball Card Inventory Management System
-- PostgreSQL Database Schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy matching player names

-- ============================================
-- CORE REFERENCE TABLES
-- ============================================

-- Brands (Topps, Bowman, Panini, etc.)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Lines (2024 Bowman Chrome, 2024 Topps Series 1, etc.)
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

-- Players (normalized player data for analytics)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_normalized VARCHAR(200) NOT NULL,  -- Lowercase, no accents for matching
    team VARCHAR(100),
    position VARCHAR(50),
    debut_year INTEGER,
    is_rookie BOOLEAN DEFAULT FALSE,
    is_prospect BOOLEAN DEFAULT FALSE,
    mlb_id INTEGER,  -- For linking to external data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_players_name_trgm ON players USING gin(name_normalized gin_trgm_ops);
CREATE INDEX idx_players_team ON players(team);

-- ============================================
-- CHECKLIST & CARD TABLES
-- ============================================

-- Card Types (Base, Refractor, Auto, Relic, etc.)
CREATE TABLE card_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),  -- 'base', 'parallel', 'insert', 'auto', 'relic', 'auto_relic'
    description TEXT
);

-- Checklists (master list of all cards in a product line)
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_line_id UUID NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
    card_number VARCHAR(50) NOT NULL,  -- Can be alphanumeric (e.g., "RC-1", "A-25")
    player_id UUID REFERENCES players(id),
    player_name_raw VARCHAR(200),  -- Original name from checklist before matching
    card_type_id UUID REFERENCES card_types(id),
    parallel_name VARCHAR(100),  -- 'Base', 'Refractor', 'Gold /50', etc.
    serial_numbered INTEGER,  -- NULL if not serial numbered, otherwise the print run
    is_autograph BOOLEAN DEFAULT FALSE,
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
-- INVENTORY TABLES
-- ============================================

-- Inventory (what you currently have in stock)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    condition VARCHAR(20) DEFAULT 'NM',  -- 'Raw', 'NM', 'EX', 'VG', 'PSA 10', etc.
    grade_company VARCHAR(20),  -- 'PSA', 'BGS', 'SGC', 'CGC', NULL for raw
    grade_value DECIMAL(3,1),  -- 10.0, 9.5, 9.0, etc.
    storage_location VARCHAR(100),  -- Where it's physically stored
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(checklist_id, condition, grade_company, grade_value)
);

CREATE INDEX idx_inventory_checklist ON inventory(checklist_id);
CREATE INDEX idx_inventory_quantity ON inventory(quantity) WHERE quantity > 0;

-- ============================================
-- FINANCIAL TABLES
-- ============================================

-- Purchases (cost basis tracking)
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

-- Purchase Line Items (individual cards in a purchase)
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL,
    condition VARCHAR(20) DEFAULT 'NM',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_checklist ON purchase_items(checklist_id);

-- Sales (revenue tracking)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    platform VARCHAR(100),  -- 'eBay', 'COMC', 'Local', 'Show', etc.
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

-- Sale Line Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    checklist_id UUID NOT NULL REFERENCES checklists(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price DECIMAL(10, 2) NOT NULL,
    condition VARCHAR(20),
    cost_basis DECIMAL(10, 2),  -- Calculated from purchase_items
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_checklist ON sale_items(checklist_id);

-- ============================================
-- ANALYTICS VIEWS
-- ============================================

-- Player inventory summary view
CREATE OR REPLACE VIEW player_inventory_summary AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    p.team,
    p.position,
    COUNT(DISTINCT c.id) AS unique_cards,
    SUM(i.quantity) AS total_cards,
    SUM(CASE WHEN c.is_autograph THEN i.quantity ELSE 0 END) AS auto_count,
    SUM(CASE WHEN c.is_rookie_card THEN i.quantity ELSE 0 END) AS rookie_count,
    SUM(CASE WHEN c.serial_numbered IS NOT NULL THEN i.quantity ELSE 0 END) AS numbered_count
FROM players p
JOIN checklists c ON c.player_id = p.id
JOIN inventory i ON i.checklist_id = c.id
WHERE i.quantity > 0
GROUP BY p.id, p.name, p.team, p.position;

-- Product line inventory summary view
CREATE OR REPLACE VIEW product_line_inventory_summary AS
SELECT 
    pl.id AS product_line_id,
    b.name AS brand_name,
    pl.name AS product_line_name,
    pl.year,
    COUNT(DISTINCT c.id) AS checklist_cards,
    COUNT(DISTINCT CASE WHEN i.quantity > 0 THEN c.id END) AS cards_in_stock,
    SUM(i.quantity) AS total_quantity,
    ROUND(COUNT(DISTINCT CASE WHEN i.quantity > 0 THEN c.id END)::DECIMAL / 
          NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1) AS completion_pct
FROM product_lines pl
JOIN brands b ON b.id = pl.brand_id
LEFT JOIN checklists c ON c.product_line_id = pl.id
LEFT JOIN inventory i ON i.checklist_id = c.id
GROUP BY pl.id, b.name, pl.name, pl.year;

-- Profit/Loss by card view
CREATE OR REPLACE VIEW card_profit_loss AS
SELECT 
    c.id AS checklist_id,
    p.name AS player_name,
    pl.name AS product_line,
    c.card_number,
    c.parallel_name,
    COALESCE(SUM(pi.quantity * pi.unit_cost), 0) AS total_cost,
    COALESCE(SUM(si.quantity * si.sale_price), 0) AS total_revenue,
    COALESCE(SUM(si.quantity * si.sale_price), 0) - COALESCE(SUM(pi.quantity * pi.unit_cost), 0) AS profit
FROM checklists c
JOIN product_lines pl ON pl.id = c.product_line_id
LEFT JOIN players p ON p.id = c.player_id
LEFT JOIN purchase_items pi ON pi.checklist_id = c.id
LEFT JOIN sale_items si ON si.checklist_id = c.id
GROUP BY c.id, p.name, pl.name, c.card_number, c.parallel_name;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default brands
INSERT INTO brands (name, slug) VALUES 
    ('Topps', 'topps'),
    ('Bowman', 'bowman'),
    ('Panini', 'panini'),
    ('Upper Deck', 'upper-deck'),
    ('Leaf', 'leaf');

-- Insert default card types
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

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
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

-- Function to normalize player names for matching
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

-- Trigger to auto-normalize player names
CREATE OR REPLACE FUNCTION normalize_player_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name_normalized = normalize_player_name(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_name_normalize BEFORE INSERT OR UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION normalize_player_name_trigger();
