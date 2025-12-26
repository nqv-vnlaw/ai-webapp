/**
 * useRecentSearches Hook
 *
 * Manages recent searches storage with privacy-safe approach.
 * Stores only preview (first 50 chars) of queries, not full queries.
 *
 * Reference: SRS/06-state-caching.md §8.1, SRS/05-nfr-security.md §7.3.10
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Recent search entry structure
 */
export interface RecentSearch {
  /**
   * Preview of the query (first 50 characters)
   */
  preview: string;

  /**
   * Whether the preview was truncated from a longer query
   */
  truncated?: boolean;

  /**
   * Timestamp when the search was performed (Unix timestamp in ms)
   */
  ts: number;
}

const STORAGE_KEY = 'vnlaw_recent_searches';
const STORAGE_ENABLED_KEY = 'vnlaw_recent_searches_enabled';
const MAX_ENTRIES = 10;
const PREVIEW_LENGTH = 50;

/**
 * Get preview of query (first 50 chars) and whether it was truncated
 */
function getPreviewData(query: string): { preview: string; truncated: boolean } {
  const trimmed = query.trim();
  return {
    preview: trimmed.slice(0, PREVIEW_LENGTH),
    truncated: trimmed.length > PREVIEW_LENGTH,
  };
}

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored) as RecentSearch[];
    // Validate structure and limit to max entries
    return parsed
      .filter(
        (entry) =>
          typeof entry.preview === 'string' &&
          entry.preview.length > 0 &&
          typeof entry.ts === 'number'
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Save recent searches to localStorage
 */
function saveRecentSearches(searches: RecentSearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Ignore storage errors (e.g., quota exceeded, private browsing)
  }
}

/**
 * Check if recent searches feature is enabled
 */
function isEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_ENABLED_KEY);
    if (stored === null) {
      // Default to enabled if not set
      return true;
    }
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Set enabled state in localStorage
 */
function setEnabledInStorage(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * useRecentSearches hook
 *
 * @returns Recent searches state and management functions
 */
export function useRecentSearches() {
  const [enabled, setEnabledState] = useState<boolean>(() => isEnabled());
  const [searches, setSearches] = useState<RecentSearch[]>(() => {
    if (!isEnabled()) {
      return [];
    }
    return loadRecentSearches();
  });

  // If disabled (or storage not available), ensure no searches are persisted.
  useEffect(() => {
    if (!enabled) {
      saveRecentSearches([]);
    }
  }, [enabled]);

  /**
   * Add a new search to recent searches
   * Only stores preview (first 50 chars) for privacy
   */
  const addSearch = useCallback(
    (query: string) => {
      if (!enabled || !query.trim()) {
        return;
      }

      const { preview, truncated } = getPreviewData(query);
      if (!preview) {
        return;
      }

      setSearches((prev) => {
        // Remove duplicates by preview (case-insensitive)
        const deduped = prev.filter(
          (entry) => entry.preview.toLowerCase() !== preview.toLowerCase()
        );

        // Add new entry at the beginning (newest first)
        const updated: RecentSearch[] = [
          { preview, truncated, ts: Date.now() },
          ...deduped,
        ].slice(0, MAX_ENTRIES);

        saveRecentSearches(updated);
        return updated;
      });
    },
    [enabled]
  );

  /**
   * Clear all recent searches
   */
  const clearSearches = useCallback(() => {
    setSearches([]);
    saveRecentSearches([]);
  }, []);

  /**
   * Toggle enabled state
   */
  const setEnabled = useCallback((newEnabled: boolean) => {
    setEnabledState(newEnabled);
    setEnabledInStorage(newEnabled);
    if (!newEnabled) {
      // Clear searches when disabled
      setSearches([]);
      saveRecentSearches([]);
    }
  }, []);

  return {
    searches,
    enabled,
    addSearch,
    clearSearches,
    setEnabled,
  };
}
