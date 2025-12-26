/**
 * TanStack Query Client Configuration
 * 
 * Configures QueryClient with appropriate defaults for search/chat operations.
 * Disables built-in retry since api-client already handles retries.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance
 * 
 * Configuration:
 * - Retry disabled (api-client handles retries)
 * - Stale time: 0 (search/chat results are fresh on each request)
 * - Cache time: 5 minutes (keep results in cache for quick navigation)
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable TanStack Query retry - api-client handles retries with exponential backoff
        retry: false,
        
        // Search/chat results are fresh on each request
        staleTime: 0,
        
        // Keep results in cache for 5 minutes for quick navigation
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: false,
        
        // Don't refetch on reconnect (user can manually refresh)
        refetchOnReconnect: false,
      },
      mutations: {
        // Disable retry for mutations - api-client handles retries
        retry: false,
      },
    },
  });
}

