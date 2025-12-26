/**
 * CitationCard Component
 *
 * Displays a single citation with title, source badge, snippet preview,
 * and external link. Snippet is truncated to ~100 characters.
 *
 * Reference: FR-CHAT-03, SRS §5.3.1
 */

import type { Citation } from '@vnlaw/api-client';

export interface CitationCardProps {
  /**
   * Citation data from API
   */
  citation: Citation;

  /**
   * Index in the list (for key prop)
   */
  index?: number;
}

/**
 * Truncates text to approximately 100 characters, breaking at word boundary
 */
function truncateSnippet(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Gets source badge color based on source type
 */
function getSourceBadgeColor(source: Citation['source']): string {
  switch (source) {
    case 'precedent':
      return 'bg-blue-100 text-blue-800';
    case 'infobank':
      return 'bg-green-100 text-green-800';
    case 'workspace':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function CitationCard({ citation, index }: CitationCardProps) {
  const { title, url, snippet, source } = citation;
  const displaySnippet = snippet ? truncateSnippet(snippet) : null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      data-testid={`citation-card-${index ?? 0}`}
    >
      {/* Title and Source Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 hover:underline"
          >
            {title}
          </a>
        </h4>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getSourceBadgeColor(source)}`}
        >
          {source}
        </span>
      </div>

      {/* Snippet Preview */}
      {displaySnippet && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {displaySnippet}
        </p>
      )}

      {/* External Link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
      >
        View source
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

