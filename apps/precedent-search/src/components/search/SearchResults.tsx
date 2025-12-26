/**
 * SearchResults Component
 *
 * Container component for displaying search results.
 * Integrates with useSearch hook to execute search API calls.
 *
 * Reference: FR-SEARCH-03, FR-SEARCH-04
 */

import { useSearch } from '@vnlaw/api-client';
import type { Scope } from '@vnlaw/api-client';
import { SearchSkeleton } from './SearchSkeleton';
import { SearchEmpty } from './SearchEmpty';

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
  const isValidQuery = trimmedQuery.length > 0;

  const { data, error, isLoading } = useSearch({
    request: {
      query: trimmedQuery,
      scope: 'precedent', // MVP: always 'precedent' (scope prop reserved for future use)
      pageSize: 10,
      cursor: null, // First page
    },
    enabled: isValidQuery, // Only search when query is non-empty
  });

  // Loading state
  if (isLoading) {
    return <SearchSkeleton count={3} />;
  }

  // Error state
  if (error) {
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
  if (!isValidQuery) {
    return null; // Don't show anything when query is empty
  }

  // Success state
  if (data) {
    const hasResults = data.results && data.results.length > 0;
    const hasMore = !!data.nextCursor;

    if (!hasResults) {
      return <SearchEmpty query={trimmedQuery} />;
    }

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Results
        </h2>
        <div className="space-y-4">
          {/* Results list placeholder - will be replaced with SearchResultCard in next phase */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>
              Found {data.results.length} result{data.results.length !== 1 ? 's' : ''}
            </p>
            <p className="mt-2 text-sm">
              Results list will be rendered here in next phase
            </p>
          </div>

          {/* Load more placeholder */}
          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled
                aria-label="Load more results (coming in next phase)"
              >
                Load more (placeholder)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}

