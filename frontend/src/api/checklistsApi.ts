/**
 * Checklists API Client
 */

import { apiRequest, apiFormRequest, buildQueryString, API_BASE } from './base';
import type {
  Checklist,
  ChecklistCreate,
  ChecklistWithDetails,
  ChecklistUploadPreview,
  ChecklistUploadResult,
} from '../types';

export async function getChecklists(params?: {
  product_line_id?: string;
  player_id?: string;
  is_rookie?: boolean;
  is_auto?: boolean;
  is_relic?: boolean;
  is_first_bowman?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<ChecklistWithDetails[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<ChecklistWithDetails[]>(`/checklists${query}`);
}

export async function getChecklist(id: string): Promise<ChecklistWithDetails> {
  return apiRequest<ChecklistWithDetails>(`/checklists/${id}`);
}

export async function createChecklist(data: ChecklistCreate): Promise<Checklist> {
  return apiRequest<Checklist>('/checklists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function previewChecklistUpload(file: File): Promise<ChecklistUploadPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFormRequest<ChecklistUploadPreview>('/checklists/upload/preview', formData);
}

export async function uploadChecklist(
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
  return apiFormRequest<ChecklistUploadResult>('/checklists/upload', formData);
}

export const checklistsApi = {
  getChecklists,
  getChecklist,
  createChecklist,
  previewChecklistUpload,
  uploadChecklist,
};
