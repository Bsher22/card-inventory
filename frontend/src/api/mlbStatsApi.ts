// src/api/mlbStatsApi.ts
// API client for MiLB Stats proxy endpoints

import { apiRequest, buildQueryString } from './base';

// ============================================
// TYPES
// ============================================

export interface MilbTeam {
  id: number;
  name: string;
  abbreviation: string;
  league: string | null;
  division: string | null;
  venue: string | null;
  sport_id: number | null;
  sport_name: string | null;
}

export interface ScheduleGame {
  date: string;
  game_pk: number;
  home_team: string;
  home_team_id: number;
  away_team: string;
  away_team_id: number;
  venue: string;
}

export interface RosterPlayer {
  player_id: number;
  full_name: string;
  position: string;
  jersey_number: string;
}

export interface PlayerInventoryMatch {
  player_id: number;
  full_name: string;
  position: string;
  jersey_number: string;
  has_inventory: boolean;
  inventory_count: number;
  unsigned_count: number;
  signed_count: number;
}

export interface GameWithInventory {
  date: string;
  game_pk: number;
  home_team: string;
  home_team_id: number;
  away_team: string;
  away_team_id: number;
  venue: string;
  home_roster: PlayerInventoryMatch[];
  away_roster: PlayerInventoryMatch[];
  home_players_in_inventory: number;
  away_players_in_inventory: number;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getMilbTeams(season?: number): Promise<MilbTeam[]> {
  const query = season ? buildQueryString({ season }) : '';
  return apiRequest<MilbTeam[]>(`/mlb-stats/teams${query}`);
}

export async function getSchedule(params: {
  team_id: number;
  start_date?: string;
  end_date?: string;
  season?: number;
}): Promise<ScheduleGame[]> {
  const query = buildQueryString(params);
  return apiRequest<ScheduleGame[]>(`/mlb-stats/schedule${query}`);
}

export async function getRoster(params: {
  team_id: number;
  season?: number;
}): Promise<RosterPlayer[]> {
  const query = buildQueryString(params);
  return apiRequest<RosterPlayer[]>(`/mlb-stats/roster${query}`);
}

export async function getScheduleWithInventory(params: {
  team_id: number;
  start_date?: string;
  end_date?: string;
  season?: number;
}): Promise<GameWithInventory[]> {
  const query = buildQueryString(params);
  return apiRequest<GameWithInventory[]>(`/mlb-stats/schedule/inventory-match${query}`);
}

// ============================================
// EXPORT BARREL
// ============================================

export const mlbStatsApi = {
  getMilbTeams,
  getSchedule,
  getRoster,
  getScheduleWithInventory,
};

export default mlbStatsApi;
