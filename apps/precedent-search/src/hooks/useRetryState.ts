/**
 * useRetryState Hook
 *
 * Tracks retry attempts per request key and integrates with circuit breaker state.
 * Provides retry count, retry status, and circuit breaker information.
 *
 * Reference: FR-ERR-02, FR-ERR-03
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  /**
   * Whether the circuit breaker is currently open
   */
  isOpen: boolean;

  /**
   * Time until recovery attempt in milliseconds
   */
  recoveryTimeMs: number;
}

/**
 * Retry state for a specific request
 */
export interface RetryState {
  /**
   * Current retry attempt count (0 = initial request, 1+ = retry attempts)
   */
  retryCount: number;

  /**
   * Whether a retry is currently in progress
   */
  isRetrying: boolean;

  /**
   * Whether maximum retries have been exceeded
   */
  maxRetriesExceeded: boolean;

  /**
   * Reset retry state to initial values
   */
  reset: () => void;

  /**
   * Increment retry count
   */
  incrementRetry: () => void;

  /**
   * Mark retry as started
   */
  startRetry: () => void;

  /**
   * Mark retry as completed
   */
  endRetry: () => void;

  /**
   * Mark max retries as exceeded
   */
  setMaxExceeded: () => void;
}

/**
 * useRetryState options
 */
export interface UseRetryStateOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Optional circuit breaker state to integrate with
   */
  circuitBreaker?: CircuitBreakerStatus;
}

/**
 * Return type for useRetryState hook
 */
export interface UseRetryStateReturn extends RetryState {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Circuit breaker status
   */
  circuitBreaker: CircuitBreakerStatus;
}

/**
 * Default circuit breaker status (closed)
 */
const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerStatus = {
  isOpen: false,
  recoveryTimeMs: 0,
};

/**
 * useRetryState hook
 *
 * Tracks retry attempts for a request and provides circuit breaker integration.
 *
 * @param options - Retry state options
 * @returns Retry state and helpers
 *
 * @example
 * ```tsx
 * const {
 *   retryCount,
 *   isRetrying,
 *   maxRetriesExceeded,
 *   maxRetries,
 *   circuitBreaker,
 *   incrementRetry,
 *   startRetry,
 *   endRetry,
 *   reset,
 * } = useRetryState({ maxRetries: 3 });
 *
 * // Show retry indicator
 * {isRetrying && (
 *   <RetryIndicator retryCount={retryCount} maxRetries={maxRetries} isRetrying />
 * )}
 *
 * // Show manual retry after max retries
 * {maxRetriesExceeded && (
 *   <ManualRetryButton onRetry={handleManualRetry} error={errorMessage} />
 * )}
 *
 * // Show circuit breaker UI
 * {circuitBreaker.isOpen && (
 *   <CircuitBreakerUI
 *     isOpen
 *     recoveryTimeMs={circuitBreaker.recoveryTimeMs}
 *     onTryNow={handleHalfOpenTest}
 *   />
 * )}
 * ```
 */
export function useRetryState(
  options: UseRetryStateOptions = {}
): UseRetryStateReturn {
  const { maxRetries = 3, circuitBreaker = DEFAULT_CIRCUIT_BREAKER } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [maxRetriesExceeded, setMaxRetriesExceededState] = useState(false);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setMaxRetriesExceededState(false);
  }, []);

  const incrementRetry = useCallback(() => {
    setRetryCount((prev) => {
      const next = prev + 1;
      if (next > maxRetries) {
        setMaxRetriesExceededState(true);
      }
      return next;
    });
  }, [maxRetries]);

  const startRetry = useCallback(() => {
    setIsRetrying(true);
  }, []);

  const endRetry = useCallback(() => {
    setIsRetrying(false);
  }, []);

  const setMaxExceeded = useCallback(() => {
    setMaxRetriesExceededState(true);
  }, []);

  const state = useMemo<UseRetryStateReturn>(
    () => ({
      retryCount,
      isRetrying,
      maxRetriesExceeded,
      maxRetries,
      circuitBreaker,
      reset,
      incrementRetry,
      startRetry,
      endRetry,
      setMaxExceeded,
    }),
    [
      retryCount,
      isRetrying,
      maxRetriesExceeded,
      maxRetries,
      circuitBreaker,
      reset,
      incrementRetry,
      startRetry,
      endRetry,
      setMaxExceeded,
    ]
  );

  return state;
}
