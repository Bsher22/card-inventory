// API Client for Card Inventory Management System

import type {
  Brand,
  ProductLineSummary,
  ProductLineWithBrand,
  ProductLineCreate,
  Player,
  ChecklistWithDetails,
  ChecklistUploadPreview,
  ChecklistUploadResult,
  InventoryWithCard,
  InventoryAnalytics,
  PlayerInventorySummary,
  InventoryCreate,
  Purchase,
  PurchaseCreate,
  Sale,
  SaleCreate,
  SalesAnalytics,
  BulkInventoryResult,
  Consigner,
  ConsignerCreate,
  ConsignerStats,
  Consignment,
  ConsignmentCreate,
  ConsignmentReturn,
  PendingConsignmentsValue,
  GradingCompanyWithLevels,
  GradingServiceLevel,
  CardGradingSubmissionResponse,
  CardGradingSubmissionCreate,
  CardGradingResultsSubmit,
  CardGradingStats,
  PendingByCompany,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============================================
  // BRANDS
  // ============================================

  async getBrands(): Promise<Brand[]> {
    return this.request<Brand[]>('/brands');
  }

  async getBrand(id: string): Promise<Brand> {
    return this.request<Brand>(`/brands/${id}`);
  }

  // ============================================
  // PRODUCT LINES
  // ============================================

  async getProductLines(params?: {
    brand_id?: string;
    year?: number;
    skip?: number;
    limit?: number;
  }): Promise<ProductLineSummary[]> {
    const searchParams = new URLSearchParams();
    if (params?.brand_id) searchParams.set('brand_id', params.brand_id);
    if (params?.year) searchParams.set('year', params.year.toString());
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<ProductLineSummary[]>(`/product-lines${query ? `?${query}` : ''}`);
  }

  async getProductLine(id: string): Promise<ProductLineWithBrand> {
    return this.request<ProductLineWithBrand>(`/product-lines/${id}`);
  }

  async createProductLine(data: ProductLineCreate): Promise<ProductLineWithBrand> {
    return this.request<ProductLineWithBrand>('/product-lines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteProductLine(id: string): Promise<void> {
    return this.request<void>(`/product-lines/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // PLAYERS
  // ============================================

  async getPlayers(params?: {
    search?: string;
    team?: string;
    is_rookie?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Player[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.team) searchParams.set('team', params.team);
    if (params?.is_rookie !== undefined) searchParams.set('is_rookie', params.is_rookie.toString());
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Player[]>(`/players${query ? `?${query}` : ''}`);
  }

  // ============================================
  // CHECKLISTS
  // ============================================

  async getChecklists(params?: {
    product_line_id?: string;
    player_id?: string;
    is_rookie?: boolean;
    is_auto?: boolean;
    is_relic?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<ChecklistWithDetails[]> {
    const searchParams = new URLSearchParams();
    if (params?.product_line_id) searchParams.set('product_line_id', params.product_line_id);
    if (params?.player_id) searchParams.set('player_id', params.player_id);
    if (params?.is_rookie !== undefined) searchParams.set('is_rookie', params.is_rookie.toString());
    if (params?.is_auto !== undefined) searchParams.set('is_auto', params.is_auto.toString());
    if (params?.is_relic !== undefined) searchParams.set('is_relic', params.is_relic.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<ChecklistWithDetails[]>(`/checklists${query ? `?${query}` : ''}`);
  }

  async getChecklist(id: string): Promise<ChecklistWithDetails> {
    return this.request<ChecklistWithDetails>(`/checklists/${id}`);
  }

  async previewChecklistUpload(file: File): Promise<ChecklistUploadPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/checklists/upload/preview`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async uploadChecklist(
    file: File,
    productLineId: string,
    columnMapping?: Record<string, string>
  ): Promise<ChecklistUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('product_line_id', productLineId);
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping));
    }

    const response = await fetch(`${API_BASE}/checklists/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // INVENTORY
  // ============================================

  async getInventory(params?: {
    product_line_id?: string;
    player_id?: string;
    brand_id?: string;
    in_stock_only?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<InventoryWithCard[]> {
    const searchParams = new URLSearchParams();
    if (params?.product_line_id) searchParams.set('product_line_id', params.product_line_id);
    if (params?.player_id) searchParams.set('player_id', params.player_id);
    if (params?.brand_id) searchParams.set('brand_id', params.brand_id);
    if (params?.in_stock_only !== undefined) searchParams.set('in_stock_only', params.in_stock_only.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<InventoryWithCard[]>(`/inventory${query ? `?${query}` : ''}`);
  }

  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    return this.request<InventoryAnalytics>('/inventory/analytics');
  }

  async getInventoryByPlayer(params?: {
    skip?: number;
    limit?: number;
  }): Promise<PlayerInventorySummary[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<PlayerInventorySummary[]>(`/inventory/by-player${query ? `?${query}` : ''}`);
  }

  async createInventory(data: InventoryCreate): Promise<InventoryWithCard> {
    return this.request<InventoryWithCard>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async bulkCreateInventory(items: InventoryCreate[]): Promise<BulkInventoryResult> {
    return this.request<BulkInventoryResult>('/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async updateInventory(id: string, data: Partial<InventoryCreate>): Promise<InventoryWithCard> {
    return this.request<InventoryWithCard>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInventory(id: string): Promise<void> {
    return this.request<void>(`/inventory/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // PURCHASES
  // ============================================

  async getPurchases(params?: {
    vendor?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<Purchase[]> {
    const searchParams = new URLSearchParams();
    if (params?.vendor) searchParams.set('vendor', params.vendor);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Purchase[]>(`/purchases${query ? `?${query}` : ''}`);
  }

  async createPurchase(data: PurchaseCreate, addToInventory = true): Promise<Purchase> {
    return this.request<Purchase>(`/purchases?add_to_inventory=${addToInventory}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePurchase(id: string): Promise<void> {
    return this.request<void>(`/purchases/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // SALES
  // ============================================

  async getSales(params?: {
    platform?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<Sale[]> {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set('platform', params.platform);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Sale[]>(`/sales${query ? `?${query}` : ''}`);
  }

  async getSalesAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SalesAnalytics> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    
    const query = searchParams.toString();
    return this.request<SalesAnalytics>(`/sales/analytics${query ? `?${query}` : ''}`);
  }

  async createSale(data: SaleCreate, removeFromInventory = true): Promise<Sale> {
    return this.request<Sale>(`/sales?remove_from_inventory=${removeFromInventory}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSale(id: string): Promise<void> {
    return this.request<void>(`/sales/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // CONSIGNERS
  // ============================================

  async getConsigners(params?: {
    active_only?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Consigner[]> {
    const searchParams = new URLSearchParams();
    if (params?.active_only !== undefined) searchParams.set('active_only', params.active_only.toString());
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Consigner[]>(`/consigners${query ? `?${query}` : ''}`);
  }

  async getConsigner(id: string): Promise<Consigner> {
    return this.request<Consigner>(`/consigners/${id}`);
  }

  async getConsignerStats(id: string): Promise<ConsignerStats> {
    return this.request<ConsignerStats>(`/consigners/${id}/stats`);
  }

  async createConsigner(data: ConsignerCreate): Promise<Consigner> {
    return this.request<Consigner>('/consigners', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConsigner(id: string, data: Partial<ConsignerCreate & { is_active: boolean }>): Promise<Consigner> {
    return this.request<Consigner>(`/consigners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // CONSIGNMENTS
  // ============================================

  async getConsignments(params?: {
    consigner_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Consignment[]> {
    const searchParams = new URLSearchParams();
    if (params?.consigner_id) searchParams.set('consigner_id', params.consigner_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Consignment[]>(`/consignments${query ? `?${query}` : ''}`);
  }

  async getConsignment(id: string): Promise<Consignment> {
    return this.request<Consignment>(`/consignments/${id}`);
  }

  async getPendingConsignmentsValue(): Promise<PendingConsignmentsValue> {
    return this.request<PendingConsignmentsValue>('/consignments/pending-value');
  }

  async createConsignment(data: ConsignmentCreate): Promise<Consignment> {
    return this.request<Consignment>('/consignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async processConsignmentReturn(id: string, data: ConsignmentReturn): Promise<Consignment> {
    return this.request<Consignment>(`/consignments/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markConsignmentFeePaid(id: string, feePaidDate?: string): Promise<Consignment> {
    const params = feePaidDate ? `?fee_paid_date=${feePaidDate}` : '';
    return this.request<Consignment>(`/consignments/${id}/mark-paid${params}`, {
      method: 'POST',
    });
  }

  // ============================================
  // GRADING COMPANIES
  // ============================================

  async getGradingCompanies(activeOnly = true): Promise<GradingCompanyWithLevels[]> {
    return this.request<GradingCompanyWithLevels[]>(`/grading/companies?active_only=${activeOnly}`);
  }

  async getServiceLevels(companyId: string, activeOnly = true): Promise<GradingServiceLevel[]> {
    return this.request<GradingServiceLevel[]>(
      `/grading/companies/${companyId}/service-levels?active_only=${activeOnly}`
    );
  }

  // ============================================
  // GRADING SUBMISSIONS
  // ============================================

  async getGradingSubmissions(params?: {
    grading_company_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<CardGradingSubmissionResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.grading_company_id) searchParams.set('grading_company_id', params.grading_company_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<CardGradingSubmissionResponse[]>(`/grading/submissions${query ? `?${query}` : ''}`);
  }

  async getGradingSubmission(id: string): Promise<CardGradingSubmissionResponse> {
    return this.request<CardGradingSubmissionResponse>(`/grading/submissions/${id}`);
  }

  async getGradingStats(): Promise<CardGradingStats> {
    return this.request<CardGradingStats>('/grading/submissions/stats');
  }

  async getPendingByCompany(): Promise<PendingByCompany[]> {
    return this.request<PendingByCompany[]>('/grading/submissions/pending-by-company');
  }

  async createGradingSubmission(data: CardGradingSubmissionCreate): Promise<CardGradingSubmissionResponse> {
    return this.request<CardGradingSubmissionResponse>('/grading/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubmissionStatus(
    id: string,
    data: {
      status: string;
      date_received?: string;
      date_graded?: string;
      date_shipped_back?: string;
      shipping_return_tracking?: string;
    }
  ): Promise<CardGradingSubmissionResponse> {
    return this.request<CardGradingSubmissionResponse>(`/grading/submissions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async processGradedItems(id: string, data: CardGradingResultsSubmit): Promise<CardGradingSubmissionResponse> {
    return this.request<CardGradingSubmissionResponse>(`/grading/submissions/${id}/grades`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();