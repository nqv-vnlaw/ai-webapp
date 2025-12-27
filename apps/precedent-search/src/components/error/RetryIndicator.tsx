/**
 * RetryIndicator Component
 *
 * Shows "Retrying..." text during automatic retries with retry count.
 * Displays animated spinner and subtle background.
 *
 * Reference: FR-ERR-02
 */

/**
 * RetryIndicator props
 */
export interface RetryIndicatorProps {
  /**
   * Whether a retry is currently in progress
   */
  isRetrying: boolean;

  /**
   * Current retry attempt number (1-indexed)
   */
  retryCount: number;

  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Optional custom message prefix (default: "Retrying")
   */
  message?: string;
}

/**
 * RetryIndicator component
 *
 * Displays a visual indicator during automatic retry attempts.
 *
 * @example
 * ```tsx
 * <RetryIndicator
 *   isRetrying={true}
 *   retryCount={2}
 *   maxRetries={3}
 * />
 * // Displays: "Retrying 2 of 3..."
 * ```
 */
export function RetryIndicator({
  isRetrying,
  retryCount,
  maxRetries,
  message = 'Retrying',
}: RetryIndicatorProps) {
  if (!isRetrying || retryCount <= 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200"
      role="status"
      aria-live="polite"
    >
      {/* Animated spinner */}
      <div
        className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />

      {/* Retry message */}
      <span className="text-sm text-gray-700">
        {message} {retryCount} of {maxRetries}...
      </span>
    </div>
  );
}
