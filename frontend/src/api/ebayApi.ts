/**
 * eBay Sales Import API Client
 */
import { API_BASE, handleResponse, apiRequest } from './base';
import type {
  EbayUploadPreviewResponse,
  EbayImportRequest,
  EbayImportResponse,
  EbayImportBatch,
  EbayImportBatchDetail,
  EbayListingSale,
  EbaySalesAnalytics,
} from '../types/ebay';

const BASE_PATH = '/sales/ebay';

export const ebayApi = {
  /**
   * Upload and preview eBay CSV file
   */
  async uploadPreview(file: File): Promise<EbayUploadPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}${BASE_PATH}/upload/preview`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<EbayUploadPreviewResponse>(response);
  },

  /**
   * Import selected listings
   */
  async importListings(request: EbayImportRequest): Promise<EbayImportResponse> {
    return apiRequest<EbayImportResponse>(`${BASE_PATH}/import`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * List all import batches
   */
  async listBatches(params?: {
    skip?: number;
    limit?: number;
  }): Promise<EbayImportBatch[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    const url = query ? `${BASE_PATH}/batches?${query}` : `${BASE_PATH}/batches`;
    
    return apiRequest<EbayImportBatch[]>(url);
  },

  /**
   * Get single import batch with listings
   */
  async getBatch(batchId: string): Promise<EbayImportBatchDetail> {
    return apiRequest<EbayImportBatchDetail>(`${BASE_PATH}/batches/${batchId}`);
  },

  /**
   * Delete an import batch
   */
  async deleteBatch(batchId: string): Promise<void> {
    await apiRequest(`${BASE_PATH}/batches/${batchId}`, {
      method: 'DELETE',
    });
  },

  /**
   * List eBay listings with optional filters
   */
  async listListings(params?: {
    batch_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<EbayListingSale[]> {
    const queryParams = new URLSearchParams();
    if (params?.batch_id) queryParams.set('batch_id', params.batch_id);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    const url = query ? `${BASE_PATH}/listings?${query}` : `${BASE_PATH}/listings`;
    
    return apiRequest<EbayListingSale[]>(url);
  },

  /**
   * Get eBay sales analytics
   */
  async getAnalytics(): Promise<EbaySalesAnalytics> {
    return apiRequest<EbaySalesAnalytics>(`${BASE_PATH}/analytics`);
  },
};
