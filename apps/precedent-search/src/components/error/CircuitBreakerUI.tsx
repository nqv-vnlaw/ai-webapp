/**
 * CircuitBreakerUI Component
 *
 * Shows when circuit breaker is open with countdown timer
 * and "Try Now" button for half-open test.
 *
 * Reference: FR-ERR-03
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * CircuitBreakerUI props
 */
export interface CircuitBreakerUIProps {
  /**
   * Whether the circuit breaker is currently open
   */
  isOpen: boolean;

  /**
   * Time until recovery attempt in milliseconds
   */
  recoveryTimeMs: number;

  /**
   * Callback when "Try Now" button is clicked (triggers half-open test)
   */
  onTryNow: () => void;

  /**
   * Whether a retry attempt is in progress
   */
  isLoading?: boolean;
}

/**
 * Format milliseconds to human-readable time
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * CircuitBreakerUI component
 *
 * Displays when the circuit breaker is open, showing a countdown
 * timer and a button to manually attempt recovery.
 *
 * @example
 * ```tsx
 * <CircuitBreakerUI
 *   isOpen={circuitState.isOpen}
 *   recoveryTimeMs={circuitState.recoveryTimeMs}
 *   onTryNow={() => triggerHalfOpenTest()}
 *   isLoading={isTestingCircuit}
 * />
 * ```
 */
export function CircuitBreakerUI({
  isOpen,
  recoveryTimeMs,
  onTryNow,
  isLoading = false,
}: CircuitBreakerUIProps) {
  const [timeRemaining, setTimeRemaining] = useState(recoveryTimeMs);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen || recoveryTimeMs <= 0) {
      setTimeRemaining(0);
      return;
    }

    setTimeRemaining(recoveryTimeMs);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, recoveryTimeMs]);

  // Handle try now click
  const handleTryNow = useCallback(() => {
    if (!isLoading) {
      onTryNow();
    }
  }, [isLoading, onTryNow]);

  if (!isOpen) {
    return null;
  }

  const canAutoRecover = timeRemaining <= 0;

  return (
    <div
      className="flex flex-col items-center gap-4 p-6 bg-yellow-50 rounded-lg border border-yellow-200"
      role="alert"
      aria-live="polite"
    >
      {/* Warning icon */}
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100">
        <svg
          className="w-6 h-6 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-1">
          Service Temporarily Unavailable
        </h3>
        <p className="text-sm text-yellow-700">
          The service is experiencing issues. {canAutoRecover
            ? 'You can try again now.'
            : 'Please wait for automatic recovery.'}
        </p>
      </div>

      {/* Countdown timer */}
      {!canAutoRecover && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-md">
          <svg
            className="w-4 h-4 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-yellow-800">
            Recovery in: {formatTimeRemaining(timeRemaining)}
          </span>
        </div>
      )}

      {/* Try Now button */}
      <button
        onClick={handleTryNow}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Try now"
      >
        {isLoading ? (
          <>
            <div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Testing...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Now
          </>
        )}
      </button>
    </div>
  );
}
