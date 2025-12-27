/**
 * useInfiniteSearch Hook
 *
 * TanStack Query infinite query hook for paginated search API calls.
 * Supports cursor-based pagination with "Load more" functionality.
 *
 * Reference: FR-SEARCH-05
 */

import { useInfiniteQuery, type UseInfiniteQueryOptions } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { SearchRequest, SearchResponse } from '@vnlaw/api-client';
import type { ApiClientError } from '@vnlaw/api-client';
import { useApiClient, searchKeys } from '@vnlaw/api-client';

/**
 * Hook options for useInfiniteSearch
 */
export interface UseInfiniteSearchOptions {
  /**
   * Search query string
   */
  query: string;

  /**
   * Search scope (always 'precedent' for MVP)
   */
  scope: 'precedent';

  /**
   * Page size (default: 10)
   */
  pageSize?: number;

  /**
   * Whether the query is enabled (default: true)
   */
  enabled?: boolean;

  /**
   * Additional TanStack Query infinite query options
   */
  queryOptions?: Omit<
    UseInfiniteQueryOptions<
      SearchResponse,
      ApiClientError,
      InfiniteData<SearchResponse, string | null>,
      ReturnType<typeof searchKeys.query>,
      string | null
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >;
}

/**
 * useInfiniteSearch hook for paginated search queries
 *
 * @param options - Search options
 * @returns TanStack Query infinite query result with flattened results
 *
 * @example
 * ```typescript
 * const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSearch({
 *   query: 'contract law',
 *   scope: 'precedent',
 * });
 *
 * // Flatten results from all pages
 * const allResults = data?.pages.flatMap(page => page.results) ?? [];
 * ```
 */
export function useInfiniteSearch(options: UseInfiniteSearchOptions) {
  const client = useApiClient();
  const { query, scope, pageSize = 10, enabled = true, queryOptions } = options;

  const trimmedQuery = query.trim();
  const isValidQuery = trimmedQuery.length > 0;

  return useInfiniteQuery<
    SearchResponse,
    ApiClientError,
    InfiniteData<SearchResponse, string | null>,
    ReturnType<typeof searchKeys.query>,
    string | null
  >({
    queryKey: searchKeys.query({
      query: trimmedQuery,
      scope,
      pageSize,
      cursor: null, // Cursor is handled by getNextPageParam
    }),
    queryFn: async ({ pageParam }) => {
      const request: SearchRequest = {
        query: trimmedQuery,
        scope,
        pageSize,
        cursor: pageParam ?? null,
      };
      const response = await client.post<SearchResponse>('/v1/search', request);
      // Return response with retryCount metadata for UI tracking
      return {
        ...response.data,
        _retryCount: response.retryCount,
      } as SearchResponse & { _retryCount: number };
    },
    getNextPageParam: (lastPage) => {
      // Return nextCursor if it exists, otherwise undefined (no more pages)
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: null,
    enabled: enabled && isValidQuery,
    ...queryOptions,
  });
}
