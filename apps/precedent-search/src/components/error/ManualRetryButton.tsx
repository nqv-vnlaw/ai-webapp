/**
 * ManualRetryButton Component
 *
 * Shows after max retries exceeded with "Try Again" button,
 * error message display, and requestId for support reference.
 *
 * Reference: FR-ERR-02, FR-ERR-03
 */

/**
 * ManualRetryButton props
 */
export interface ManualRetryButtonProps {
  /**
   * Callback when retry button is clicked
   */
  onRetry: () => void;

  /**
   * Whether a retry is currently in progress
   */
  isLoading?: boolean;

  /**
   * Error message to display
   */
  error: string;

  /**
   * Optional request ID for support reference
   */
  requestId?: string;

  /**
   * Optional button text (default: "Try Again")
   */
  buttonText?: string;
}

/**
 * ManualRetryButton component
 *
 * Displays an error message with a manual retry button
 * after automatic retries have been exhausted.
 *
 * @example
 * ```tsx
 * <ManualRetryButton
 *   onRetry={() => refetch()}
 *   isLoading={isRefetching}
 *   error="Failed to load data after multiple attempts"
 *   requestId="req-abc123"
 * />
 * ```
 */
export function ManualRetryButton({
  onRetry,
  isLoading = false,
  error,
  requestId,
  buttonText = 'Try Again',
}: ManualRetryButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
      {/* Error icon */}
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
        <svg
          className="w-5 h-5 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error message */}
      <p className="text-sm text-red-800 text-center font-medium">
        {error}
      </p>

      {/* Request ID */}
      {requestId && (
        <p className="text-xs text-red-600">
          Request ID:{' '}
          <code className="font-mono bg-red-100 px-1 py-0.5 rounded">
            {requestId}
          </code>
        </p>
      )}

      {/* Retry button */}
      <button
        onClick={onRetry}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={buttonText}
      >
        {isLoading ? (
          <>
            <div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Retrying...
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
            {buttonText}
          </>
        )}
      </button>
    </div>
  );
}
