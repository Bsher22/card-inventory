/**
 * Player Types - Aligned with Backend Schemas
 */

export interface Player {
  id: string;
  name: string;
  name_normalized: string;
  team: string | null;
  position: string | null;
  debut_year: number | null;
  is_rookie: boolean;
  is_prospect: boolean;
  mlb_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerCreate {
  name: string;
  team?: string | null;
  position?: string | null;
  debut_year?: number | null;
  is_rookie?: boolean;
  is_prospect?: boolean;
  mlb_id?: number | null;
}

export interface PlayerUpdate {
  name?: string;
  team?: string | null;
  position?: string | null;
  debut_year?: number | null;
  is_rookie?: boolean;
  is_prospect?: boolean;
  mlb_id?: number | null;
}

export interface PlayerInventorySummary {
  player_id: string;
  player_name: string;
  team: string | null;
  position: string | null;
  unique_cards: number;
  total_cards: number;
  auto_count: number;
  rookie_count: number;
  first_bowman_count: number;
  numbered_count: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
}
