/**
 * Beckett API Client
 * Handles Beckett scraping and import
 */

import { apiRequest, apiFormRequest } from './base';
import type {
  BeckettImportPreview,
  BeckettImportResponse,
  BeckettScrapeResult,
} from '../types';

export async function previewBeckettImport(file: File): Promise<BeckettImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFormRequest<BeckettImportPreview>('/beckett/preview', formData);
}

export async function importBeckettFile(
  file: File,
  createProductLine = true
): Promise<BeckettImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('create_product_line', String(createProductLine));
  return apiFormRequest<BeckettImportResponse>('/beckett/import', formData);
}

export async function scrapeAvailableProducts(
  year?: number,
  brand?: string
): Promise<BeckettScrapeResult> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (brand) params.set('brand', brand);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<BeckettScrapeResult>(`/beckett/scrape${query}`);
}

export async function downloadAndImport(
  url: string,
  createProductLine = true
): Promise<BeckettImportResponse> {
  return apiRequest<BeckettImportResponse>('/beckett/download-and-import', {
    method: 'POST',
    body: JSON.stringify({ url, create_product_line: createProductLine }),
  });
}

export const beckettApi = {
  previewBeckettImport,
  importBeckettFile,
  scrapeAvailableProducts,
  downloadAndImport,
};
