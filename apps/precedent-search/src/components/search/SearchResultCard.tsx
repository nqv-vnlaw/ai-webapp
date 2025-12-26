/**
 * SearchResultCard Component
 *
 * Displays a single search result with title, snippet, source badge, and link.
 *
 * Reference: FR-SEARCH-04
 */

import type { SearchResult } from '@vnlaw/api-client';

export interface SearchResultCardProps {
  /**
   * Search result data
   */
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const { title, snippet, url, source, metadata } = result;

  // Extract minimal metadata for display (keep UI clean)
  const hasMetadata = metadata && (
    metadata.date ||
    metadata.court ||
    metadata.caseNumber ||
    metadata.documentType
  );

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
      <p
        className="text-gray-600 mb-3 overflow-hidden text-ellipsis"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {snippet}
      </p>
      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
        <span className="px-2 py-1 bg-gray-100 rounded capitalize">
          {source}
        </span>
        {hasMetadata && (
          <div className="flex items-center gap-2 flex-wrap">
            {metadata.date && (
              <span className="text-xs">{metadata.date}</span>
            )}
            {metadata.court && (
              <span className="text-xs">• {metadata.court}</span>
            )}
            {metadata.caseNumber && (
              <span className="text-xs">• Case: {metadata.caseNumber}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

