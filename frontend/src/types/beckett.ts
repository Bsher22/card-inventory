/**
 * Beckett Import Types
 */

export interface BeckettParsedCard {
  set_name: string;
  card_number: string;
  card_prefix: string | null;
  card_suffix: string | null;
  player_name: string;
  team: string | null;
  is_rookie_card: boolean;
  is_autograph: boolean;
  is_relic: boolean;
  is_first_bowman: boolean;
  serial_numbered: number | null;
  notes: string | null;
  raw_line: string;
}

export interface BeckettImportPreview {
  product_name: string;
  year: number;
  brand: string;
  total_cards: number;
  first_bowman_count: number;
  auto_count: number;
  rookie_count: number;
  sets_found: Record<string, number>;
  sample_cards: BeckettParsedCard[];
  product_line_exists: boolean;
  product_line_id: string | null;
}

export interface BeckettImportRequest {
  create_product_line: boolean;
}

export interface BeckettImportResponse {
  success: boolean;
  product_line_id: string | null;
  product_line_name: string;
  year: number;
  brand: string;
  total_cards: number;
  cards_created: number;
  cards_updated: number;
  cards_skipped: number;
  players_created: number;
  players_matched: number;
  first_bowman_count: number;
  sets_imported: Record<string, number>;
  errors: string[];
  warnings: string[];
}

export interface BeckettProductInfo {
  name: string;
  year: number;
  brand: string;
  url: string;
}

export interface BeckettScrapeResult {
  products_found: number;
  products: BeckettProductInfo[];
  errors: string[];
}
