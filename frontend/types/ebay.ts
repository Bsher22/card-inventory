/**
 * eBay Listing Types
 */

export interface EbayItemSpecifics {
  type: string;
  sport: string;
  league: string;
  manufacturer: string;
  set: string;
  season: string;
  player_athlete: string;
  team: string | null;
  card_number: string | null;
  card_condition: string;
  
  // Autograph fields (only for signed cards)
  autographed: string | null;
  autograph_authentication: string | null;
  autograph_format: string | null;
  signed_by: string | null;
  
  // Variation fields
  parallel_variety: string | null;
  features: string | null;
  serial_numbered: string | null;
}

export interface EbayListingData {
  inventory_id: string;
  title: string;
  min_price: number;
  cost_basis: number;
  quantity: number;
  per_unit_cost: number;
  item_specifics: EbayItemSpecifics;
  
  // Card details
  player_name: string;
  card_number: string;
  year: number;
  product_name: string;
  parallel_name: string | null;
  serial_numbered: number | null;
  serial_number: number | null;
  
  // Status flags
  is_signed: boolean;
  is_slabbed: boolean;
  is_first_bowman: boolean;
  is_rookie: boolean;
  
  // Grading info
  grade_company: string | null;
  grade_value: number | null;
  
  // Auth company
  auth_company: string | null;
}

export interface EbayListingRequest {
  inventory_ids: string[];
}

export interface EbayListingResponse {
  listings: EbayListingData[];
  total_count: number;
  total_min_price: number;
}
