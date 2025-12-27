/**
 * FeedbackModal Component
 *
 * Modal dialog for adding optional comment when giving negative feedback.
 * Includes character limit validation and error handling.
 *
 * Reference: FR-FB-01, FR-FB-02
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Maximum comment length
 */
const MAX_COMMENT_LENGTH = 500;

/**
 * FeedbackModal props
 */
export interface FeedbackModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Callback when feedback is submitted
   */
  onSubmit: (comment?: string) => Promise<void>;

  /**
   * Whether submission is in progress
   */
  isLoading?: boolean;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Request ID for error reference
   */
  requestId?: string;
}

/**
 * FeedbackModal component
 *
 * Modal for adding optional comment when giving thumbs down feedback.
 *
 * @example
 * ```tsx
 * <FeedbackModal
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   onSubmit={async (comment) => {
 *     await submitFeedback({ rating: 'down', comment });
 *     setModalOpen(false);
 *   }}
 *   isLoading={isSubmitting}
 *   error={submitError}
 * />
 * ```
 */
export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
  requestId,
}: FeedbackModalProps) {
  const [comment, setComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterCount = comment.length;
  const isOverLimit = characterCount > MAX_COMMENT_LENGTH;
  const remainingChars = MAX_COMMENT_LENGTH - characterCount;

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setComment('');
    }
  }, [isOpen]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (isLoading || isOverLimit) {
      return;
    }

    await onSubmit(comment.trim() || undefined);
  }, [isLoading, isOverLimit, comment, onSubmit]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose();
      }
    },
    [isLoading, handleClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2
            id="feedback-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            What could be improved?
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">
            Your feedback helps us improve. Adding a comment is optional.
          </p>

          {/* Comment textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was wrong with this answer? (optional)"
              rows={4}
              disabled={isLoading}
              maxLength={MAX_COMMENT_LENGTH + 50} // Allow slight overflow for UX
              className={`
                w-full px-3 py-2 text-sm border rounded-md resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${isOverLimit
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'}
              `}
              aria-describedby="comment-counter"
              aria-invalid={isOverLimit}
            />
            <div
              id="comment-counter"
              className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit
                  ? 'text-red-600'
                  : remainingChars < 50
                    ? 'text-yellow-600'
                    : 'text-gray-400'
              }`}
            >
              {characterCount}/{MAX_COMMENT_LENGTH}
            </div>
          </div>

          {/* Character limit error */}
          {isOverLimit && (
            <p className="mt-1 text-xs text-red-600">
              Comment exceeds {MAX_COMMENT_LENGTH} character limit
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
              {requestId && (
                <p className="mt-1 text-xs text-red-600">
                  Request ID:{' '}
                  <code className="font-mono bg-red-100 px-1 rounded">
                    {requestId}
                  </code>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || isOverLimit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
