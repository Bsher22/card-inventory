/**
 * API Base Configuration
 * Shared utilities for all API clients
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Handle API response and throw on error
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

/**
 * Make a JSON API request
 */
export async function apiRequest<T>(
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

  return handleResponse<T>(response);
}

/**
 * Make a form data API request (for file uploads)
 */
export async function apiFormRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<T>(response);
}
