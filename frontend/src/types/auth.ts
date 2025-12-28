/**
 * Authentication Types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  is_admin?: boolean;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  password?: string;
  is_active?: boolean;
}
