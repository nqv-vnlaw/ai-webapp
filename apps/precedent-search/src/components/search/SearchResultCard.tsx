/**
 * SearchResultCard Component
 *
 * Displays a single search result with title, snippet, source, and link.
 * Placeholder implementation - will integrate with SearchResult type in next phase.
 *
 * Reference: FR-SEARCH-04
 */

export interface SearchResultCardProps {
  /**
   * Result title
   */
  title: string;

  /**
   * Result snippet/preview
   */
  snippet: string;

  /**
   * Result source (precedent/infobank/workspace)
   */
  source: string;

  /**
   * Result URL
   */
  url: string;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

export function SearchResultCard({
  title,
  snippet,
  source,
  url,
  metadata,
}: SearchResultCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          {title}
        </a>
      </h3>
      <p className="text-gray-600 mb-3 overflow-hidden text-ellipsis" style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>{snippet}</p>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="px-2 py-1 bg-gray-100 rounded capitalize">
          {source}
        </span>
        {metadata && Object.keys(metadata).length > 0 && (
          <span className="text-xs">Metadata available</span>
        )}
      </div>
    </div>
  );
}

