/**
 * API Client Provider
 * 
 * Provides API client instance to the React component tree.
 * Uses auth context to get access tokens.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './client';
import { useAuth } from '@vnlaw/auth';

/**
 * API Client Context
 */
const ApiClientContext = createContext<ApiClient | null>(null);

/**
 * API Client Provider Props
 */
export interface ApiClientProviderProps {
  /**
   * Base URL for the API (defaults to VITE_API_BASE_URL)
   */
  baseUrl?: string;

  /**
   * Children components
   */
  children: ReactNode;
}

/**
 * API Client Provider
 * 
 * Creates and provides an API client instance to child components.
 * The client is configured with authentication from the auth context.
 * 
 * @param props - Provider props
 */
export function ApiClientProvider({
  baseUrl,
  children,
}: ApiClientProviderProps) {
  const { getAccessToken } = useAuth();

  const client = useMemo(() => {
    const apiBaseUrl =
      baseUrl || import.meta.env.VITE_API_BASE_URL || 'https://api.vnlaw.app';

    return createApiClient({
      baseUrl: apiBaseUrl,
      getAccessToken,
    });
  }, [baseUrl, getAccessToken]);

  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

/**
 * Hook to access the API client instance
 * 
 * @returns API client instance
 * @throws Error if used outside ApiClientProvider
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return client;
}

