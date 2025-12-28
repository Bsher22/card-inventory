/**
 * eBay Types
 * 
 * Includes:
 * - Listing Generation (for creating eBay listings from inventory)
 * - Sales Import (for importing eBay sales reports)
 */

// ============================================
// LISTING GENERATION TYPES
// ============================================

export interface EbayItemSpecifics {
  type: string;
  sport: string;
  league: string;
  manufacturer: string;
  set: string;
  season: string;
  player_athlete: string;
  team?: string;
  card_number?: string;
  card_condition: string;
  
  // Conditional fields
  autographed?: string;
  autograph_authentication?: string;
  autograph_format?: string;
  signed_by?: string;
  
  parallel_variety?: string;
  features?: string;
  serial_numbered?: string;
}

export interface EbayListingData {
  inventory_id: string;
  title: string;
  
  min_price: number;
  cost_basis: number;
  quantity: number;
  per_unit_cost: number;
  
  item_specifics: EbayItemSpecifics;
  
  player_name: string;
  card_number: string;
  year: number;
  product_name: string;
  parallel_name?: string;
  serial_numbered?: number;
  serial_number?: number;
  
  is_signed: boolean;
  is_slabbed: boolean;
  is_first_bowman: boolean;
  is_rookie: boolean;
  
  grade_company?: string;
  grade_value?: number;
  auth_company?: string;
}

export interface EbayListingRequest {
  inventory_ids: string[];
}

export interface EbayListingResponse {
  listings: EbayListingData[];
  total_count: number;
  total_min_price: number;
}

// ============================================
// SALES IMPORT TYPES
// ============================================

export interface EbayListingPreview {
  row_index: number;
  selected: boolean;
  
  // Core listing data
  listing_title: string;
  ebay_item_id: string;
  quantity_sold: number;
  
  // Financial summary
  item_sales: number;
  total_selling_costs: number;
  net_sales: number;
  average_selling_price: number;
  
  // Full financial data
  total_sales: number;
  shipping_collected: number;
  taxes_to_seller: number;
  taxes_to_ebay: number;
  
  // Fees breakdown
  insertion_fees: number;
  listing_upgrade_fees: number;
  final_value_fees: number;
  promoted_general_fees: number;
  promoted_priority_fees: number;
  ads_express_fees: number;
  promoted_offsite_fees: number;
  international_fees: number;
  other_ebay_fees: number;
  deposit_processing_fees: number;
  fee_credits: number;
  shipping_label_cost: number;
  
  // Sales type breakdown
  quantity_via_promoted: number;
  quantity_via_best_offer: number;
  quantity_via_seller_offer: number;
}

export interface EbayUploadPreviewResponse {
  success: boolean;
  message: string;
  
  // Report metadata
  report_start_date: string | null;
  report_end_date: string | null;
  
  // Parsed listings
  listings: EbayListingPreview[];
  
  // Summary stats
  total_rows: number;
  total_quantity: number;
  total_item_sales: number;
  total_net_sales: number;
  
  // Any parsing warnings
  warnings: string[];
}

export interface EbayListingCreate {
  listing_title: string;
  ebay_item_id: string;
  quantity_sold: number;
  
  total_sales: number;
  item_sales: number;
  shipping_collected: number;
  taxes_to_seller: number;
  taxes_to_ebay: number;
  
  total_selling_costs: number;
  insertion_fees: number;
  listing_upgrade_fees: number;
  final_value_fees: number;
  promoted_general_fees: number;
  promoted_priority_fees: number;
  ads_express_fees: number;
  promoted_offsite_fees: number;
  international_fees: number;
  other_ebay_fees: number;
  deposit_processing_fees: number;
  fee_credits: number;
  shipping_label_cost: number;
  
  net_sales: number;
  average_selling_price: number;
  
  quantity_via_promoted: number;
  quantity_via_best_offer: number;
  quantity_via_seller_offer: number;
}

export interface EbayImportRequest {
  report_start_date: string;
  report_end_date: string;
  listings: EbayListingCreate[];
  notes?: string;
}

export interface EbayImportResponse {
  success: boolean;
  message: string;
  batch_id?: string;
  imported_count: number;
  total_item_sales: number;
  total_net_sales: number;
}

export interface EbayListingSale {
  id: string;
  import_batch_id: string;
  
  listing_title: string;
  ebay_item_id: string;
  quantity_sold: number;
  
  total_sales: number;
  item_sales: number;
  shipping_collected: number;
  taxes_to_seller: number;
  taxes_to_ebay: number;
  
  total_selling_costs: number;
  final_value_fees: number;
  shipping_label_cost: number;
  fee_credits: number;
  
  net_sales: number;
  average_selling_price: number;
  
  quantity_via_promoted: number;
  quantity_via_best_offer: number;
  quantity_via_seller_offer: number;
  
  checklist_id?: string;
  created_at: string;
}

export interface EbayImportBatch {
  id: string;
  report_start_date: string;
  report_end_date: string;
  import_date: string;
  
  total_listings: number;
  total_quantity_sold: number;
  total_item_sales: number;
  total_net_sales: number;
  
  notes?: string;
}

export interface EbayImportBatchDetail extends EbayImportBatch {
  listing_sales: EbayListingSale[];
}

export interface EbaySalesAnalytics {
  total_batches: number;
  total_listings: number;
  total_quantity_sold: number;
  total_item_sales: number;
  total_net_sales: number;
  total_fees: number;
  average_fee_percentage: number;
}
