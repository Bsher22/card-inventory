/**
 * Types for consigner player pricing feature
 */

// ============================================
// BASE TYPES
// ============================================

export interface ConsignerPlayerPrice {
  id: string;
  consigner_id: string;
  player_id: string;
  price_per_card: number;
  notes: string | null;
  effective_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  consigner_name: string | null;
  player_name: string | null;
}

export interface ConsignerPlayerPriceCreate {
  consigner_id: string;
  player_id: string;
  price_per_card: number;
  notes?: string;
  effective_date?: string;
  is_active?: boolean;
}

export interface ConsignerPlayerPriceUpdate {
  price_per_card?: number;
  notes?: string;
  effective_date?: string;
  is_active?: boolean;
}

// ============================================
// MATRIX TYPES
// ============================================

export interface PlayerPriceInfo {
  price_id: string | null;
  price_per_card: number | null;
  notes: string | null;
  effective_date: string | null;
}

export interface ConsignerColumn {
  id: string;
  name: string;
  default_fee: number | null;
  is_active: boolean;
}

export interface PlayerRow {
  id: string;
  name: string;
  team: string | null;
  /** Map of consigner_id -> price info */
  prices: Record<string, PlayerPriceInfo>;
}

export interface PricingMatrixResponse {
  consigners: ConsignerColumn[];
  players: PlayerRow[];
  total_players: number;
  total_consigners: number;
}

export interface PricingMatrixParams {
  consigner_ids?: string[];
  player_search?: string;
  only_with_prices?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface BulkPriceEntry {
  consigner_id: string;
  player_id: string;
  price_per_card: number;
  notes?: string;
}

export interface BulkPriceCreate {
  prices: BulkPriceEntry[];
  replace_existing?: boolean;
}

export interface BulkPriceResult {
  created: number;
  updated: number;
  errors: string[];
}

// ============================================
// LOOKUP TYPES
// ============================================

export interface PriceLookupResponse {
  player_id: string;
  player_name: string;
  best_consigner_id: string | null;
  best_consigner_name: string | null;
  best_price: number | null;
  all_prices: ConsignerPlayerPrice[];
}

export interface ConsignerPriceSummary {
  consigner_id: string;
  consigner_name: string;
  total_players_priced: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface PriceEditState {
  consignerId: string;
  playerId: string;
  currentPrice: number | null;
  isEditing: boolean;
}

export type SortField = 'player' | 'consigner' | 'price';
export type SortDirection = 'asc' | 'desc';

export interface MatrixSortState {
  field: SortField;
  direction: SortDirection;
  consignerId?: string; // For sorting by a specific consigner's prices
}
