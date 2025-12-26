/**
 * SearchEmpty Component
 *
 * Displays empty state when no search results are found.
 * Shows guidance and alternative suggestions.
 *
 * Reference: FR-SEARCH-06
 */

export interface SearchEmptyProps {
  /**
   * The search query that returned no results
   */
  query?: string;
}

export function SearchEmpty({ query }: SearchEmptyProps) {
  return (
    <div className="mt-8 text-center">
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No results found
        </h3>
        {query && (
          <p className="mt-2 text-sm text-gray-500">
            No results found for &quot;{query}&quot;
          </p>
        )}
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-4">Suggestions:</p>
          <ul className="text-sm text-gray-500 space-y-2 text-left max-w-md mx-auto">
            <li>• Check your spelling</li>
            <li>• Try different keywords</li>
            <li>• Use more general terms</li>
            <li>• Remove filters if any</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

