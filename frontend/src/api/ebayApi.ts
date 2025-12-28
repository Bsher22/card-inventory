/**
 * eBay API Client
 * 
 * Includes:
 * - Listing generation (create eBay listings from inventory)
 * - Sales import (import eBay sales reports)
 */
import { API_BASE, handleResponse, apiRequest } from './base';
import type {
  // Listing Generation
  EbayListingRequest,
  EbayListingResponse,
  // Sales Import
  EbayUploadPreviewResponse,
  EbayImportRequest,
  EbayImportResponse,
  EbayImportBatch,
  EbayImportBatchDetail,
  EbayListingSale,
  EbaySalesAnalytics,
} from '../types/ebay';

export const ebayApi = {
  // ============================================
  // LISTING GENERATION
  // ============================================
  
  /**
   * Generate eBay listings from inventory items
   */
  async generateListings(request: EbayListingRequest): Promise<EbayListingResponse> {
    return apiRequest<EbayListingResponse>('/ebay/generate-listings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // ============================================
  // SALES IMPORT
  // ============================================
  
  /**
   * Upload and preview eBay CSV file
   */
  async uploadPreview(file: File): Promise<EbayUploadPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/sales/ebay/upload/preview`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<EbayUploadPreviewResponse>(response);
  },

  /**
   * Import selected listings
   */
  async importListings(request: EbayImportRequest): Promise<EbayImportResponse> {
    return apiRequest<EbayImportResponse>('/sales/ebay/import', {
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
    const url = query ? `/sales/ebay/batches?${query}` : `/sales/ebay/batches`;
    
    return apiRequest<EbayImportBatch[]>(url);
  },

  /**
   * Get single import batch with listings
   */
  async getBatch(batchId: string): Promise<EbayImportBatchDetail> {
    return apiRequest<EbayImportBatchDetail>(`/sales/ebay/batches/${batchId}`);
  },

  /**
   * Delete an import batch
   */
  async deleteBatch(batchId: string): Promise<void> {
    await apiRequest(`/sales/ebay/batches/${batchId}`, {
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
    const url = query ? `/sales/ebay/listings?${query}` : `/sales/ebay/listings`;
    
    return apiRequest<EbayListingSale[]>(url);
  },

  /**
   * Get eBay sales analytics
   */
  async getAnalytics(): Promise<EbaySalesAnalytics> {
    return apiRequest<EbaySalesAnalytics>(`/sales/ebay/analytics`);
  },
};
