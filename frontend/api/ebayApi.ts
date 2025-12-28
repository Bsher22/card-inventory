/**
 * eBay Listing API Client
 */

import { apiPost, apiGet } from './base';
import type { EbayListingRequest, EbayListingResponse } from '../types/ebay';

export const ebayApi = {
  /**
   * Generate eBay listings for selected inventory items
   */
  generateListings: (inventoryIds: string[]): Promise<EbayListingResponse> =>
    apiPost<EbayListingResponse>('/ebay-listings/generate', { inventory_ids: inventoryIds }),

  /**
   * Preview a single listing
   */
  previewListing: (inventoryId: string): Promise<EbayListingResponse> =>
    apiGet<EbayListingResponse>(`/ebay-listings/preview/${inventoryId}`),
};
