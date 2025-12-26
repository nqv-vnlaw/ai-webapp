/**
 * SearchResults Component
 *
 * Container component for displaying search results.
 * Integrates with useInfiniteSearch hook for paginated search API calls.
 *
 * Reference: FR-SEARCH-03, FR-SEARCH-04, FR-SEARCH-05
 */

import { useState } from 'react';
import type { Scope, SearchResponse } from '@vnlaw/api-client';
import { SearchSkeleton } from './SearchSkeleton';
import { SearchEmpty } from './SearchEmpty';
import { SearchResultCard } from './SearchResultCard';
import { useInfiniteSearch } from '../../hooks/useInfiniteSearch';

const MAX_QUERY_LENGTH = 500;

export interface SearchResultsProps {
  /**
   * Search query string
   */
  query: string;

  /**
   * Search scope (always 'precedent' for MVP)
   */
  scope: Scope;
}

export function SearchResults({ query, scope: _scope }: SearchResultsProps) {
  // Build search request
  const trimmedQuery = query.trim();
  const isTooLong = trimmedQuery.length > MAX_QUERY_LENGTH;
  const isValidQuery = trimmedQuery.length > 0 && !isTooLong;

  const infiniteQueryResult = useInfiniteSearch({
    query: trimmedQuery,
    scope: 'precedent', // MVP: always 'precedent'
    pageSize: 10,
    enabled: isValidQuery, // Only search when query is valid
  });

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    dataUpdatedAt,
    isStale,
    isFetching,
  } = infiniteQueryResult;

  // Prevent double-click spamming
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Query validation (FR-SEARCH-07): do not call the API for invalid queries
  if (isTooLong) {
    return (
      <div className="mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Query Too Long
          </h3>
          <p className="text-red-700">
            Queries must be {MAX_QUERY_LENGTH} characters or less. Please shorten
            your query and try again.
          </p>
        </div>
      </div>
    );
  }

  const handleLoadMore = async () => {
    if (isFetchingNextPage || isLoadingMore || !hasNextPage) {
      return;
    }
    setIsLoadingMore(true);
    try {
      await fetchNextPage();
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Loading state
  if (isLoading && !data) {
    return <SearchSkeleton count={3} />;
  }

  // Error state (no cached data available)
  if (error && !data) {
    return (
      <div className="mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Search Error
          </h3>
          <p className="text-red-700 mb-2">{error.message}</p>
          {error.requestId && (
            <p className="text-sm text-red-600 font-mono">
              Request ID: {error.requestId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Empty query state (no search executed)
  // Note: This is defensive code - IndexPage now handles empty query by showing SearchEmpty
  // This return null should not be reached in normal flow, but kept for safety
  if (!isValidQuery) {
    return null;
  }

  // Success state
  if (data) {
    // Flatten results from all pages
    const allResults = data.pages.flatMap((page: SearchResponse) => page.results);
    const hasResults = allResults.length > 0;

    // Get status and warnings from first page (all pages should have same status)
    const firstPage = data.pages[0];
    const isPartial = firstPage.status === 'partial';
    const hasWarnings = isPartial && firstPage.warnings && firstPage.warnings.length > 0;

    // SRS §8.3: Show "cached results from ..." warning when serving stale cache due to backend failure
    const showStaleCacheWarning = Boolean(error) && isStale && !isFetching && dataUpdatedAt > 0;
    const staleTimeAgo = showStaleCacheWarning
      ? Math.floor((Date.now() - dataUpdatedAt) / 1000 / 60) // minutes ago
      : 0;
    const formatStaleTime = (minutes: number): string => {
      if (minutes < 1) return 'less than a minute';
      if (minutes === 1) return '1 minute';
      if (minutes < 60) return `${minutes} minutes`;
      const hours = Math.floor(minutes / 60);
      return hours === 1 ? '1 hour' : `${hours} hours`;
    };

    if (!hasResults) {
      return <SearchEmpty query={trimmedQuery} />;
    }

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Results
        </h2>

        {/* Stale cache warning (SRS §8.3) */}
        {showStaleCacheWarning && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-yellow-800">
                  ⚠️ Unable to refresh results. Showing cached results from{' '}
                  {formatStaleTime(staleTimeAgo)} ago.
                </p>
                {error?.requestId && (
                  <p className="mt-1 text-xs text-yellow-700 font-mono">
                    Request ID: {error.requestId}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Partial status warnings banner */}
        {hasWarnings && firstPage.warnings && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Some results may be missing
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {firstPage.warnings.map((warning: string, index: number) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="space-y-4">
          {allResults.map((result: SearchResponse['results'][number], index: number) => (
            <SearchResultCard key={`${result.url}-${index}`} result={result} />
          ))}
        </div>

        {/* Load more button */}
        {hasNextPage && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isFetchingNextPage || isLoadingMore}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              aria-label={
                isFetchingNextPage || isLoadingMore
                  ? 'Loading more results...'
                  : 'Load more results'
              }
            >
              {isFetchingNextPage || isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
