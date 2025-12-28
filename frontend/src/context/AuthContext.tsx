/**
 * Authentication Context
 *
 * Manages authentication state across the app:
 * - Login/logout
 * - Token storage
 * - User info
 * - Protected route handling
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE } from '../api/base';

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================
// Constants
// ============================================

const TOKEN_KEY = 'idgas_token';

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem(TOKEN_KEY);
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user info when token changes
  useEffect(() => {
    async function fetchUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token invalid - clear it
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Network error - keep token but clear user
        // User will be re-fetched on next request
      }

      setIsLoading(false);
    }

    fetchUser();
  }, [token]);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/auth/login/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();

    // Store token
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Update user info (after profile changes)
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ============================================
// Helper: Get token for API calls
// ============================================

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ============================================
// Helper: Auth headers for fetch
// ============================================

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
}
