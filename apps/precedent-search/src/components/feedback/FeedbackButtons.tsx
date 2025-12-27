/**
 * FeedbackButtons Component
 *
 * Thumbs up/down buttons for rating chat answers.
 * Clicking thumbs up submits immediately; thumbs down opens comment modal.
 *
 * Reference: FR-FB-01
 */

import { useState, useCallback } from 'react';

/**
 * Feedback rating type
 */
export type FeedbackRating = 'up' | 'down';

/**
 * Feedback button state
 */
type FeedbackState = 'idle' | 'selected_up' | 'selected_down' | 'submitting' | 'submitted';

/**
 * FeedbackButtons props
 */
export interface FeedbackButtonsProps {
  /**
   * Message ID for feedback submission
   */
  messageId: string;

  /**
   * Conversation ID for feedback submission
   */
  conversationId: string;

  /**
   * Callback when feedback is submitted
   */
  onSubmit: (rating: FeedbackRating, comment?: string) => Promise<void>;

  /**
   * Callback when thumbs down is clicked (opens modal)
   * If not provided, thumbs down will submit directly without modal
   */
  onThumbsDown?: () => void;

  /**
   * Whether buttons are disabled
   */
  disabled?: boolean;

  /**
   * Whether feedback submission is in progress (from parent)
   */
  isSubmitting?: boolean;

  /**
   * Whether feedback was successfully submitted (from parent)
   */
  isSubmitted?: boolean;
}

/**
 * Thumbs Up Icon (inline SVG)
 */
function ThumbsUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
      />
    </svg>
  );
}

/**
 * Thumbs Down Icon (inline SVG)
 */
function ThumbsDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"
      />
    </svg>
  );
}

/**
 * Checkmark Icon (for success state)
 */
function CheckIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * FeedbackButtons component
 *
 * Displays thumbs up/down buttons for rating chat responses.
 * Thumbs up submits immediately; thumbs down triggers onThumbsDown callback.
 *
 * @example
 * ```tsx
 * <FeedbackButtons
 *   messageId="msg-123"
 *   conversationId="conv-456"
 *   onSubmit={async (rating, comment) => {
 *     await submitFeedback({ messageId, conversationId, rating, comment });
 *   }}
 *   onThumbsDown={() => setModalOpen(true)}
 * />
 * ```
 */
export function FeedbackButtons({
  messageId: _messageId,
  conversationId: _conversationId,
  onSubmit,
  onThumbsDown,
  disabled = false,
  isSubmitting: externalIsSubmitting = false,
  isSubmitted: externalIsSubmitted = false,
}: FeedbackButtonsProps) {
  // Note: messageId and conversationId are passed for prop consistency
  // but the actual IDs are handled by the parent's onSubmit callback
  void _messageId;
  void _conversationId;
  const [state, setState] = useState<FeedbackState>('idle');
  const [selectedRating, setSelectedRating] = useState<'up' | 'down' | null>(null);

  // Use external state if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting || state === 'submitting';
  const isSubmitted = externalIsSubmitted || state === 'submitted';

  // Handle thumbs up click (submit immediately)
  const handleThumbsUp = useCallback(async () => {
    if (disabled || isSubmitting || isSubmitted) {
      return;
    }

    setSelectedRating('up');
    setState('selected_up');
    setState('submitting');
    try {
      await onSubmit('up');
      setState('submitted');
    } catch {
      // Reset to idle on error
      setState('idle');
      setSelectedRating(null);
    }
  }, [disabled, isSubmitting, isSubmitted, onSubmit]);

  // Handle thumbs down click (open modal or submit directly)
  const handleThumbsDown = useCallback(async () => {
    if (disabled || isSubmitting || isSubmitted) {
      return;
    }

    setSelectedRating('down');
    setState('selected_down');

    if (onThumbsDown) {
      // Open modal (parent handles submission)
      onThumbsDown();
    } else {
      // Submit directly without modal
      setState('submitting');
      try {
        await onSubmit('down');
        setState('submitted');
      } catch {
        // Reset to idle on error
        setState('idle');
        setSelectedRating(null);
      }
    }
  }, [disabled, isSubmitting, isSubmitted, onThumbsDown, onSubmit]);

  // Determine selected states based on current state and selected rating
  const isSelectedUp = state === 'selected_up' || (isSubmitted && selectedRating === 'up');
  const isSelectedDown = state === 'selected_down' || (isSubmitted && selectedRating === 'down');

  // Show success indicator after submission
  if (isSubmitted) {
    return (
      <div className="flex items-center gap-1 text-green-600" aria-live="polite">
        <CheckIcon />
        <span className="text-xs">Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rate this answer">
      {/* Thumbs Up */}
      <button
        onClick={handleThumbsUp}
        disabled={disabled || isSubmitting}
        className={`
          p-1.5 rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isSelectedUp
            ? 'text-green-600 bg-green-50'
            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}
        `}
        aria-label="Thumbs up - helpful answer"
        aria-pressed={isSelectedUp}
      >
        {isSubmitting ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <ThumbsUpIcon filled={isSelectedUp} />
        )}
      </button>

      {/* Thumbs Down */}
      <button
        onClick={handleThumbsDown}
        disabled={disabled || isSubmitting}
        className={`
          p-1.5 rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isSelectedDown
            ? 'text-red-600 bg-red-50'
            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}
        `}
        aria-label="Thumbs down - needs improvement"
        aria-pressed={isSelectedDown}
      >
        <ThumbsDownIcon filled={isSelectedDown} />
      </button>
    </div>
  );
}
