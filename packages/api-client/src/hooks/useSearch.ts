/**
 * useSearch Hook
 * 
 * TanStack Query hook for search API calls.
 * Provides typed search functionality with error handling and rate limit info.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { SearchRequest, SearchResponse } from '../types';
import type { ApiClientError } from '../client';
import { useApiClient } from '../provider';

/**
 * Search query key factory
 */
export const searchKeys = {
  all: ['search'] as const,
  query: (request: SearchRequest) => ['search', request] as const,
};

/**
 * Hook options for useSearch
 */
export interface UseSearchOptions {
  /**
   * Search request parameters
   */
  request: SearchRequest;

  /**
   * Whether the query is enabled (default: true)
   */
  enabled?: boolean;

  /**
   * Additional TanStack Query options
   */
  queryOptions?: Omit<
    UseQueryOptions<
      SearchResponse,
      ApiClientError,
      SearchResponse,
      ReturnType<typeof searchKeys.query>
    >,
    'queryKey' | 'queryFn'
  >;
}

/**
 * useSearch hook for performing search queries
 * 
 * @param options - Search options
 * @returns TanStack Query result with typed search response
 * 
 * @example
 * ```typescript
 * const { data, error, isLoading } = useSearch({
 *   request: { query: 'contract law', scope: 'precedent' },
 * });
 * ```
 */
export function useSearch(options: UseSearchOptions) {
  const client = useApiClient();
  const { request, enabled = true, queryOptions } = options;

  return useQuery({
    queryKey: searchKeys.query(request),
    queryFn: async () => {
      const response = await client.post<SearchResponse>('/v1/search', request);
      return response.data;
    },
    enabled,
    ...queryOptions,
  });
}

