/**
 * SearchEmpty Component
 *
 * Displays empty state when no search query is entered or no results are found.
 * Shows guidance and clickable example suggestions.
 *
 * Reference: FR-SEARCH-06
 */

export interface SearchEmptyProps {
  /**
   * The search query that returned no results (if any)
   * If undefined, shows initial empty state with example suggestions
   */
  query?: string;

  /**
   * Callback when a suggestion is clicked
   * @param suggestion - The suggestion text to search for
   */
  onSuggestionClick?: (suggestion: string) => void;
}

/**
 * Example search suggestions for legal research
 */
const EXAMPLE_SUGGESTIONS = [
  'contract breach',
  'intellectual property',
  'employment law',
  'corporate governance',
  'tax disputes',
  'merger and acquisition',
];

/**
 * General suggestions for improving search
 */
const GENERAL_SUGGESTIONS = [
  'Check your spelling',
  'Try different keywords',
  'Use more general terms',
  'Remove filters if any',
];

export function SearchEmpty({ query, onSuggestionClick }: SearchEmptyProps) {
  const isInitialState = !query;

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
          {isInitialState ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          {isInitialState ? 'Start your search' : 'No results found'}
        </h3>
        {query && (
          <p className="mt-2 text-sm text-gray-500">
            No results found for &quot;{query}&quot;
          </p>
        )}

        {/* Example suggestions (clickable when in initial state) */}
        {isInitialState && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Try searching for:
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {EXAMPLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* General suggestions (shown when query exists but no results) */}
        {!isInitialState && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-4">Suggestions:</p>
            <ul className="text-sm text-gray-500 space-y-2 text-left max-w-md mx-auto">
              {GENERAL_SUGGESTIONS.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

