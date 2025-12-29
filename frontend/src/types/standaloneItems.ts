/**
 * Standalone Items Types
 * 
 * Types for item categories, standalone items (memorabilia/collectibles), and sports.
 */

// ============================================
// ITEM CATEGORY TYPES
// ============================================

export interface ItemCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemCategoryCreate {
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface ItemCategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ============================================
// SPORT TYPES
// ============================================

export interface Sport {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

// ============================================
// STANDALONE ITEM TYPES
// ============================================

export interface StandaloneItem {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  sport: string;
  brand: string | null;
  year: number | null;
  
  // Person/Team
  player_name: string | null;
  team: string | null;
  
  // Authentication
  is_authenticated: boolean;
  authenticator: string | null;
  cert_number: string | null;
  
  // Physical attributes
  item_type: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  
  // Condition
  condition: string;
  condition_notes: string | null;
  
  // Flexible specs
  item_specs: Record<string, unknown>;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Nested
  category?: ItemCategory | null;
}

export interface StandaloneItemCreate {
  category_id: string;
  title: string;
  description?: string | null;
  sport?: string;
  brand?: string | null;
  year?: number | null;
  player_name?: string | null;
  team?: string | null;
  is_authenticated?: boolean;
  authenticator?: string | null;
  cert_number?: string | null;
  item_type?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  condition?: string;
  condition_notes?: string | null;
  item_specs?: Record<string, unknown>;
  notes?: string | null;
}

export interface StandaloneItemUpdate {
  category_id?: string;
  title?: string;
  description?: string | null;
  sport?: string;
  brand?: string | null;
  year?: number | null;
  player_name?: string | null;
  team?: string | null;
  is_authenticated?: boolean;
  authenticator?: string | null;
  cert_number?: string | null;
  item_type?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  condition?: string;
  condition_notes?: string | null;
  item_specs?: Record<string, unknown>;
  notes?: string | null;
}

export interface StandaloneItemSummary {
  id: string;
  title: string;
  sport: string;
  category_id: string;
  player_name: string | null;
  team: string | null;
}

export interface StandaloneItemFilters {
  category_id?: string;
  sport?: string;
  player_name?: string;
  team?: string;
  year?: number;
  is_authenticated?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

// ============================================
// UNIFIED INVENTORY TYPES
// ============================================

export type ItemType = 'card' | 'memorabilia' | 'collectible';

export interface UnifiedInventoryItem {
  id: string;
  item_type: ItemType;
  quantity: number;
  total_cost: number;
  
  // Common fields
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company: string | null;
  grade_value: number | null;
  raw_condition: string;
  storage_location: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Card-specific (null for standalone items)
  checklist_id: string | null;
  checklist?: unknown | null; // ChecklistResponse when present
  
  // Standalone-specific (null for cards)
  standalone_item_id: string | null;
  standalone_item?: StandaloneItem | null;
  
  // Computed/display fields
  display_title?: string;
  sport?: string;
  category_name?: string;
}

// ============================================
// STATISTICS
// ============================================

export interface StandaloneItemStats {
  total: number;
  authenticated: number;
  by_category: Record<string, number>;
  by_sport: Record<string, number>;
}

// ============================================
// CONSTANTS
// ============================================

export const ITEM_TYPES: ItemType[] = ['card', 'memorabilia', 'collectible'];

export const SPORTS = [
  'Baseball', 'Basketball', 'Football', 'Hockey',
  'Soccer', 'Golf', 'NASCAR', 'Wrestling', 'MMA', 'Other'
] as const;

export const AUTHENTICATORS = [
  'PSA/DNA', 'JSA', 'Beckett Authentication', 'SGC',
  'Fanatics', 'MLB Authentication', 'Steiner', 'Other'
] as const;

export const MEMORABILIA_TYPES = [
  'Baseball', 'Basketball', 'Football', 'Hockey Puck', 'Golf Ball',
  'Jersey', 'Helmet', 'Bat', 'Glove', 'Cleats',
  'Photo', 'Poster', 'Lithograph',
  'Game-Used', 'Event-Used',
  'Book', 'Magazine',
  'Other'
] as const;

export const COLLECTIBLE_TYPES = [
  'Diecast', 'Bobblehead', 'Figurine', 'Funko Pop',
  'SGA Item', 'Stadium Giveaway',
  'Program', 'Ticket', 'Media Pass',
  'Plaque', 'Award', 'Trophy',
  'Novelty', 'Promotional',
  'Other'
] as const;

export const CONDITIONS = [
  'Mint', 'Near Mint', 'Excellent', 'Very Good',
  'Good', 'Fair', 'Poor'
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get appropriate item types based on category
 */
export function getItemTypesForCategory(categorySlug: string): readonly string[] {
  switch (categorySlug) {
    case 'memorabilia':
      return MEMORABILIA_TYPES;
    case 'collectibles':
      return COLLECTIBLE_TYPES;
    default:
      return [];
  }
}

/**
 * Get display name for item type
 */
export function getItemTypeDisplay(itemType: ItemType): string {
  switch (itemType) {
    case 'card':
      return 'Card';
    case 'memorabilia':
      return 'Memorabilia';
    case 'collectible':
      return 'Collectible';
    default:
      return itemType;
  }
}

/**
 * Get category slug from item type
 */
export function getCategorySlugFromItemType(itemType: ItemType): string {
  switch (itemType) {
    case 'memorabilia':
      return 'memorabilia';
    case 'collectible':
      return 'collectibles';
    default:
      return 'cards';
  }
}
