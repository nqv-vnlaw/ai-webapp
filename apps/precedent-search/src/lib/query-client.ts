/**
 * TanStack Query Client Configuration
 * 
 * Configures QueryClient with appropriate defaults for search/chat operations.
 * Disables built-in retry since api-client already handles retries.
 * 
 * Reference: SRS §8.3 (Caching rules)
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance
 * 
 * Configuration:
 * - Retry disabled (api-client handles retries)
 * - Search/chat TTL: 5 minutes (fresh)
 * - Stale-while-revalidate: 5 minutes (keep stale cache for fallback)
 * - Error responses never cached (SRS §8.3)
 * 
 * Note: TanStack Query v5 doesn't cache errors by default - errors are stored separately
 * from data. The error state is cleared when a new query is executed. This satisfies
 * SRS §8.3 requirement that error responses are never cached.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable TanStack Query retry - api-client handles retries with exponential backoff
        retry: false,
        
        // SRS §8.3: TTL 5 minutes
        staleTime: 5 * 60 * 1000,
        
        // Keep stale cache for an additional 5 minutes (SWR window)
        gcTime: 10 * 60 * 1000, // 10 minutes total (formerly cacheTime)
        
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: false,
        
        // Don't refetch on reconnect (user can manually refresh)
        refetchOnReconnect: false,
        
        // SRS §8.3: Never cache error responses
        // TanStack Query v5 doesn't cache errors by default - errors are stored separately
        // and cleared when a new query executes. This satisfies the requirement.
      },
      mutations: {
        // Disable retry for mutations - api-client handles retries
        retry: false,
      },
    },
  });
}
