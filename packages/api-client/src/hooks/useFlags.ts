/**
 * useFlags Hook
 *
 * TanStack Query hook for fetching feature flags.
 * Calls GET /v1/flags endpoint.
 *
 * Reference: SRS Feature Flags system
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { FlagsResponse, FeatureFlags } from '../types';
import type { ApiClientError } from '../client';
import { useApiClient } from '../provider';

/**
 * Flags query key factory
 */
export const flagsKeys = {
  all: ['flags'] as const,
};

/**
 * Default feature flags (MVP defaults)
 * Used when flags are loading or on error
 */
export const DEFAULT_FLAGS: FeatureFlags = {
  WORKSPACE_SEARCH_ENABLED: false,
  CHAT_HISTORY_ENABLED: false,
  STREAMING_ENABLED: false,
  FEEDBACK_ENABLED: true,
  EXPORT_ENABLED: true,
  INFOBANK_SEARCH_ENABLED: false,
};

/**
 * Hook options for useFlags
 */
export interface UseFlagsOptions {
  /**
   * Additional TanStack Query options
   */
  queryOptions?: Omit<
    UseQueryOptions<FlagsResponse, ApiClientError, FeatureFlags>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * useFlags hook for fetching feature flags
 *
 * @param options - Flags query options
 * @returns TanStack Query result with feature flags
 *
 * @example
 * ```typescript
 * const { data: flags, isLoading } = useFlags();
 *
 * if (flags?.FEEDBACK_ENABLED) {
 *   // Show feedback buttons
 * }
 * ```
 */
export function useFlags(options: UseFlagsOptions = {}) {
  const client = useApiClient();
  const { queryOptions } = options;

  return useQuery({
    queryKey: flagsKeys.all,
    queryFn: async () => {
      const response = await client.get<FlagsResponse>('/v1/flags');
      return response.data;
    },
    select: (data) => data.flags,
    // Cache flags for session duration (don't refetch)
    staleTime: Infinity,
    gcTime: Infinity,
    // Retry once on failure
    retry: 1,
    ...queryOptions,
  });
}
