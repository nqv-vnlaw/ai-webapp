/**
 * useSearchParams Hook
 *
 * Manages URL state sync for search query and scope.
 * Implements MVP URL pattern: /?q=<query>&scope=precedent
 *
 * Reference: SRS/06-state-caching.md §8.2
 */

import { useSearchParams as useRouterSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import type { Scope } from '@vnlaw/api-client';

const DEFAULT_SCOPE: Scope = 'precedent';

/**
 * Hook return type
 */
export interface UseSearchParamsReturn {
  /**
   * Current search query (trimmed, empty string if not in URL)
   */
  query: string;

  /**
   * Current scope (always 'precedent' for MVP)
   */
  scope: Scope;

  /**
   * Update query in URL
   * @param newQuery - Query string (will be trimmed)
   */
  setQuery: (newQuery: string) => void;

  /**
   * Update scope in URL (coerced to 'precedent' for MVP)
   * @param newScope - Scope value (will be coerced to 'precedent')
   */
  setScope: (newScope: Scope) => void;

  /**
   * Update both query and scope at once
   */
  setSearchParams: (query: string, scope?: Scope) => void;
}

/**
 * useSearchParams hook for managing search state in URL
 *
 * Rules:
 * - Query param: `q` (trimmed, removed if empty)
 * - Scope param: `scope` (always 'precedent' for MVP, invalid values coerced)
 * - Back/forward navigation works via URL state
 *
 * @returns Search params state and setters
 */
export function useSearchParams(): UseSearchParamsReturn {
  const [searchParams, setSearchParams] = useRouterSearchParams();

  // Read query from URL (trimmed)
  const query = useMemo(() => {
    const q = searchParams.get('q');
    return q ? q.trim() : '';
  }, [searchParams]);

  // Read scope from URL (coerced to 'precedent' for MVP)
  const scope = useMemo(() => {
    const s = searchParams.get('scope');
    // MVP: Only 'precedent' is valid, coerce everything else
    if (s === 'precedent') {
      return 'precedent' as Scope;
    }
    // Invalid or missing scope -> default to 'precedent'
    return DEFAULT_SCOPE;
  }, [searchParams]);

  // Update query in URL
  const setQuery = useCallback(
    (newQuery: string) => {
      const trimmed = newQuery.trim();
      const newParams = new URLSearchParams(searchParams);

      if (trimmed) {
        newParams.set('q', trimmed);
      } else {
        // Remove q param if empty
        newParams.delete('q');
      }

      // Ensure scope is always set (coerced to 'precedent' for MVP)
      newParams.set('scope', DEFAULT_SCOPE);

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Update scope in URL (coerced to 'precedent' for MVP)
  const setScope = useCallback(
    (_newScope: Scope) => {
      const newParams = new URLSearchParams(searchParams);

      // MVP: Always coerce to 'precedent'
      newParams.set('scope', DEFAULT_SCOPE);

      // Preserve query if present
      const q = searchParams.get('q');
      if (q) {
        newParams.set('q', q.trim());
      }

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Update both query and scope at once
  const setSearchParamsBoth = useCallback(
    (newQuery: string, _newScope?: Scope) => {
      const trimmed = newQuery.trim();
      const newParams = new URLSearchParams();

      if (trimmed) {
        newParams.set('q', trimmed);
      }

      // MVP: Always use 'precedent' scope
      newParams.set('scope', DEFAULT_SCOPE);

      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams]
  );

  return {
    query,
    scope,
    setQuery,
    setScope,
    setSearchParams: setSearchParamsBoth,
  };
}

