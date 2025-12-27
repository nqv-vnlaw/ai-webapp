/**
 * useRetryState Hook
 *
 * Tracks retry attempts per request key and integrates with circuit breaker state.
 * Provides retry count, retry status, and circuit breaker information.
 *
 * Reference: FR-ERR-02, FR-ERR-03
 */

import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Global retry state storage per request key
 * This allows multiple components to track retry state for the same request
 */
const retryStateStore = new Map<
  string,
  {
    retryCount: number;
    isRetrying: boolean;
    maxRetriesExceeded: boolean;
  }
>();

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
   * Request key to track retry state per request (e.g., 'search:query123' or 'chat:conv456')
   * If not provided, uses a default key (single instance per component)
   */
  requestKey?: string;

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

  /**
   * Update retry count from API response
   * Use this to sync with retryCount from API client responses
   */
  updateRetryCount: (count: number) => void;
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
 * Tracks retry attempts per request key and provides circuit breaker integration.
 * Uses a global store to track retry state per request key, allowing multiple
 * components to share retry state for the same request.
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
 * } = useRetryState({ 
 *   requestKey: 'search:contract-law',
 *   maxRetries: 3 
 * });
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
  const {
    requestKey = 'default',
    maxRetries = 3,
    circuitBreaker = DEFAULT_CIRCUIT_BREAKER,
  } = options;

  // Get or create state for this request key
  const getState = useCallback(() => {
    if (!retryStateStore.has(requestKey)) {
      retryStateStore.set(requestKey, {
        retryCount: 0,
        isRetrying: false,
        maxRetriesExceeded: false,
      });
    }
    return retryStateStore.get(requestKey)!;
  }, [requestKey]);

  // Use ref to track if we've initialized state for this key
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    getState();
    initializedRef.current = true;
  }

  const [stateVersion, setStateVersion] = useState(0);

  // Force re-render when state changes
  const updateState = useCallback(() => {
    setStateVersion((prev) => prev + 1);
  }, []);

  const retryStateData = getState();
  const retryCount = retryStateData.retryCount;
  const isRetrying = retryStateData.isRetrying;
  const maxRetriesExceeded = retryStateData.maxRetriesExceeded;

  const reset = useCallback(() => {
    const currentState = getState();
    currentState.retryCount = 0;
    currentState.isRetrying = false;
    currentState.maxRetriesExceeded = false;
    updateState();
  }, [getState, updateState]);

  const incrementRetry = useCallback(() => {
    const currentState = getState();
    currentState.retryCount += 1;
    if (currentState.retryCount >= maxRetries) {
      currentState.maxRetriesExceeded = true;
    }
    updateState();
  }, [getState, maxRetries, updateState]);

  const startRetry = useCallback(() => {
    const currentState = getState();
    currentState.isRetrying = true;
    updateState();
  }, [getState, updateState]);

  const endRetry = useCallback(() => {
    const currentState = getState();
    currentState.isRetrying = false;
    updateState();
  }, [getState, updateState]);

  const setMaxExceeded = useCallback(() => {
    const currentState = getState();
    currentState.maxRetriesExceeded = true;
    updateState();
  }, [getState, updateState]);

  /**
   * Update retry count from API response
   * This reflects the actual retry count from the API client's automatic retries
   */
  const updateRetryCount = useCallback(
    (count: number) => {
      const currentState = getState();
      currentState.retryCount = count;
      if (count >= maxRetries) {
        currentState.maxRetriesExceeded = true;
      }
      updateState();
    },
    [getState, maxRetries, updateState]
  );

  // Include stateVersion in dependencies to trigger re-renders when state changes
  const retryState = useMemo<UseRetryStateReturn>(
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
      updateRetryCount,
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
      updateRetryCount,
      stateVersion, // Include to trigger re-renders when state changes
    ]
  );

  return retryState;
}
