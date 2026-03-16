// src/api/prospectsApi.ts
// API client for Top Prospects endpoints

import { apiRequest } from './base';

// ============================================
// TYPES
// ============================================

export interface ProspectEntry {
  rank: number;
  name: string;
  team: string;
  position: string;
  age: number | null;
  source: string;
  has_inventory: boolean;
  inventory_count: number;
  unsigned_count: number;
  signed_count: number;
}

export interface ProspectsResponse {
  pipeline: ProspectEntry[];
  fangraphs: ProspectEntry[];
  last_updated: string | null;
}

export interface MlbOrg {
  id: number;
  name: string;
  abbreviation: string;
}

export interface TeamProspectsResponse {
  team_id: number;
  team_name: string;
  prospects: ProspectEntry[];
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getTopProspects(): Promise<ProspectsResponse> {
  return apiRequest<ProspectsResponse>('/prospects/top100');
}

export async function refreshProspects(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/prospects/refresh', { method: 'POST' });
}

export async function getMlbOrgs(): Promise<MlbOrg[]> {
  return apiRequest<MlbOrg[]>('/prospects/orgs');
}

export async function getTeamProspects(teamId: number): Promise<TeamProspectsResponse> {
  return apiRequest<TeamProspectsResponse>(`/prospects/team/${teamId}`);
}

// ============================================
// EXPORT BARREL
// ============================================

export const prospectsApi = {
  getTopProspects,
  refreshProspects,
  getMlbOrgs,
  getTeamProspects,
};

export default prospectsApi;
