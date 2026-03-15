-- Migration: Add consigner_home_teams table
-- Purpose: Track which MiLB teams each consigner attends home games for
-- Run this on Railway PostgreSQL

CREATE TABLE IF NOT EXISTS consigner_home_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consigner_id UUID NOT NULL REFERENCES consigners(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    team_abbreviation VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_consigner_home_team
    ON consigner_home_teams(consigner_id, team_id);

CREATE INDEX IF NOT EXISTS idx_cht_consigner
    ON consigner_home_teams(consigner_id);

COMMENT ON TABLE consigner_home_teams IS 'MiLB teams whose home games each consigner attends for autographs';
COMMENT ON COLUMN consigner_home_teams.team_id IS 'MLB Stats API team ID';
COMMENT ON COLUMN consigner_home_teams.team_name IS 'Cached team name for display';
