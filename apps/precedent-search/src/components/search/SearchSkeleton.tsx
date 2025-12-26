/**
 * SearchSkeleton Component
 *
 * Loading skeleton component for search results.
 * Displays placeholder content while search is in progress.
 *
 * Reference: FR-SEARCH-04 (loading state)
 */

export interface SearchSkeletonProps {
  /**
   * Number of skeleton items to display (default: 3)
   */
  count?: number;
}

export function SearchSkeleton({ count = 3 }: SearchSkeletonProps) {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

