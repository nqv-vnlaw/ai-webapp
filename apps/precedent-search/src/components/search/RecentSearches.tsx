/**
 * RecentSearches Component
 *
 * Displays recent searches with privacy-safe previews.
 * Provides clear action and toggle to disable/enable.
 *
 * Reference: SRS/06-state-caching.md §8.1, SRS/05-nfr-security.md §7.3.10
 */

import type { RecentSearch } from '../../hooks/useRecentSearches';

export interface RecentSearchesProps {
  /**
   * Recent searches list (preview-only, first 50 chars)
   */
  searches: RecentSearch[];

  /**
   * Whether recent searches are enabled
   */
  enabled: boolean;

  /**
   * Toggle enabled state
   */
  onEnabledChange: (enabled: boolean) => void;

  /**
   * Clear all recent searches
   */
  onClear: () => void;

  /**
   * Callback when a recent search is clicked
   * @param preview - The preview text (first 50 chars) of the search
   */
  onSearchClick?: (preview: string) => void;
}

export function RecentSearches({
  searches,
  enabled,
  onEnabledChange,
  onClear,
  onSearchClick,
}: RecentSearchesProps) {
  const hasSearches = searches.length > 0;

  const handleSearchClick = (preview: string) => {
    onSearchClick?.(preview);
  };

  const handleClear = () => {
    if (window.confirm('Clear all recent searches?')) {
      onClear();
    }
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEnabledChange(e.target.checked);
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">
            Recent Searches
          </h3>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              aria-label="Remember searches"
            />
            <span>Remember searches</span>
          </label>
        </div>
        {hasSearches && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label="Clear recent searches"
          >
            Clear
          </button>
        )}
      </div>

      {!enabled ? (
        <p className="text-sm text-gray-600">
          Search history is disabled. Enable “Remember searches” to save
          previews on this device.
        </p>
      ) : !hasSearches ? (
        <p className="text-sm text-gray-600">
          No recent searches yet. Only the first 50 characters are saved for
          privacy.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {searches.map((search, index) => (
            <button
              key={`${search.ts}-${index}`}
              type="button"
              onClick={() => handleSearchClick(search.preview)}
              className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              title={`Search: ${search.preview}`}
            >
              {search.preview}
              {(search.truncated ?? search.preview.length >= 50) && '…'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
