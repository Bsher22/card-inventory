/**
 * Players API Client
 */

import { apiRequest, buildQueryString } from './base';
import type { Player, PlayerCreate } from '../types';

export async function getPlayers(params?: {
  search?: string;
  team?: string;
  is_rookie?: boolean;
  skip?: number;
  limit?: number;
}): Promise<Player[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Player[]>(`/players${query}`);
}

export async function getPlayer(id: string): Promise<Player> {
  return apiRequest<Player>(`/players/${id}`);
}

export async function createPlayer(data: PlayerCreate): Promise<Player> {
  return apiRequest<Player>('/players', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const playersApi = {
  getPlayers,
  getPlayer,
  createPlayer,
};
