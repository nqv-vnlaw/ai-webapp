/**
 * useFeatureFlags Hook
 *
 * Consumes feature flags from the API client and provides
 * convenient access throughout the app.
 *
 * Reference: SRS Feature Flag System
 */

import { useFlags, DEFAULT_FLAGS } from '@vnlaw/api-client';
import type { FeatureFlags } from '@vnlaw/api-client';

/**
 * Return type for useFeatureFlags hook
 */
export interface UseFeatureFlagsReturn {
  /**
   * Feature flags object
   */
  flags: FeatureFlags;

  /**
   * Whether flags are currently loading
   */
  isLoading: boolean;

  /**
   * Error if flags failed to load
   */
  error: Error | null;

  /**
   * Whether flags are from cache/defaults (not fresh from API)
   */
  isStale: boolean;
}

/**
 * useFeatureFlags hook for accessing feature flags
 *
 * Wraps the api-client useFlags hook with:
 * - Default flags while loading
 * - Error handling
 * - Session-duration caching (staleTime: Infinity)
 *
 * @returns Feature flags state
 *
 * @example
 * ```typescript
 * const { flags, isLoading } = useFeatureFlags();
 *
 * if (flags.FEEDBACK_ENABLED) {
 *   // Render feedback buttons
 * }
 * ```
 */
export function useFeatureFlags(): UseFeatureFlagsReturn {
  const { data, isLoading, error, isStale } = useFlags();

  return {
    // Use fetched flags or fallback to defaults
    flags: data ?? DEFAULT_FLAGS,
    isLoading,
    error: error as Error | null,
    isStale,
  };
}
