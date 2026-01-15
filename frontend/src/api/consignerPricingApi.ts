/**
 * API client for consigner player pricing
 */

import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from './base';
import type {
  ConsignerPlayerPrice,
  ConsignerPlayerPriceCreate,
  ConsignerPlayerPriceUpdate,
  PricingMatrixResponse,
  PricingMatrixParams,
  BulkPriceCreate,
  BulkPriceResult,
  PriceLookupResponse,
  ConsignerPriceSummary,
} from '../types/consignerPricing';

const BASE_URL = '/consigner-prices';

export const consignerPricingApi = {
  // ============================================
  // MATRIX
  // ============================================

  /**
   * Get the pricing matrix (players vs consigners)
   */
  async getMatrix(params: PricingMatrixParams = {}): Promise<PricingMatrixResponse> {
    const queryParams: Record<string, unknown> = {};

    if (params.consigner_ids?.length) {
      queryParams.consigner_ids = params.consigner_ids.join(',');
    }
    if (params.player_search) {
      queryParams.player_search = params.player_search;
    }
    if (params.only_with_prices) {
      queryParams.only_with_prices = 'true';
    }
    if (params.limit) {
      queryParams.limit = params.limit;
    }
    if (params.offset) {
      queryParams.offset = params.offset;
    }

    const query = buildQueryString(queryParams);
    return apiGet<PricingMatrixResponse>(`${BASE_URL}/matrix${query}`);
  },

  // ============================================
  // CRUD
  // ============================================

  /**
   * Create a new price entry
   */
  async createPrice(data: ConsignerPlayerPriceCreate): Promise<ConsignerPlayerPrice> {
    return apiPost<ConsignerPlayerPrice>(BASE_URL, data);
  },

  /**
   * Get a single price by ID
   */
  async getPrice(priceId: string): Promise<ConsignerPlayerPrice> {
    return apiGet<ConsignerPlayerPrice>(`${BASE_URL}/${priceId}`);
  },

  /**
   * Update a price entry
   */
  async updatePrice(
    priceId: string,
    data: ConsignerPlayerPriceUpdate
  ): Promise<ConsignerPlayerPrice> {
    return apiPatch<ConsignerPlayerPrice>(`${BASE_URL}/${priceId}`, data);
  },

  /**
   * Delete (deactivate) a price entry
   */
  async deletePrice(priceId: string): Promise<void> {
    return apiDelete<void>(`${BASE_URL}/${priceId}`);
  },

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk create or update prices
   */
  async bulkUpsert(data: BulkPriceCreate): Promise<BulkPriceResult> {
    return apiPost<BulkPriceResult>(`${BASE_URL}/bulk`, data);
  },

  // ============================================
  // LOOKUPS
  // ============================================

  /**
   * Look up best price for a player
   */
  async lookupPlayerPrice(
    playerId: string,
    preferConsignerId?: string
  ): Promise<PriceLookupResponse> {
    const params = preferConsignerId
      ? `?prefer_consigner_id=${preferConsignerId}`
      : '';
    return apiGet<PriceLookupResponse>(
      `${BASE_URL}/lookup/player/${playerId}${params}`
    );
  },

  /**
   * Get pricing summary for a consigner
   */
  async getConsignerSummary(consignerId: string): Promise<ConsignerPriceSummary> {
    return apiGet<ConsignerPriceSummary>(
      `${BASE_URL}/consigner/${consignerId}/summary`
    );
  },

  /**
   * Get all prices for a consigner
   */
  async getConsignerPrices(consignerId: string): Promise<ConsignerPlayerPrice[]> {
    return apiGet<ConsignerPlayerPrice[]>(
      `${BASE_URL}/consigner/${consignerId}/prices`
    );
  },
};

export default consignerPricingApi;
