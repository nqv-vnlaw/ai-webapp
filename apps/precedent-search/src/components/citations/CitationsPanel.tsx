/**
 * CitationsPanel Component
 *
 * Displays a list of citations in a sidebar/panel.
 * Preserves API order and does not deduplicate (backend handles deduplication).
 * Shows empty state if no citations provided.
 *
 * Reference: FR-CHAT-03, SRS §5.3.1
 */

import type { Citation } from '@vnlaw/api-client';
import { CitationCard } from './CitationCard';

export interface CitationsPanelProps {
  /**
   * Array of citations from API (preserve order)
   */
  citations: Citation[];

  /**
   * Panel title (default: "Sources")
   */
  title?: string;

  /**
   * Empty state message (default: "No sources cited")
   */
  emptyMessage?: string;
}

export function CitationsPanel({
  citations,
  title = 'Sources',
  emptyMessage: _emptyMessage = 'No sources cited',
}: CitationsPanelProps) {
  // Hide panel if no citations (per SRS §5.3.1)
  if (citations.length === 0) {
    // Note: emptyMessage is available but panel is hidden per SRS requirement
    // If UI requirements change to show empty state, use _emptyMessage here
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-3">
        {citations.map((citation, index) => (
          <CitationCard key={index} citation={citation} index={index} />
        ))}
      </div>
    </div>
  );
}

