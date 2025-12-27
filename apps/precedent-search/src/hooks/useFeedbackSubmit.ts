/**
 * useFeedbackSubmit Hook
 *
 * Wraps the useFeedback mutation from api-client with proper payload building.
 * Ensures no PII is included in feedback submissions (FR-FB-02).
 *
 * Reference: FR-FB-01, FR-FB-02
 */

import { useCallback, useState } from 'react';
import { useFeedback } from '@vnlaw/api-client';
import type { FeedbackRating } from '../components/feedback/FeedbackButtons';

/**
 * useFeedbackSubmit options
 */
export interface UseFeedbackSubmitOptions {
  /**
   * Callback on successful submission
   */
  onSuccess?: () => void;

  /**
   * Callback on submission error
   */
  onError?: (error: Error) => void;
}

/**
 * Return type for useFeedbackSubmit
 */
export interface UseFeedbackSubmitReturn {
  /**
   * Submit feedback function
   */
  submitFeedback: (params: {
    conversationId: string;
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
  }) => Promise<void>;

  /**
   * Whether submission is in progress
   */
  isLoading: boolean;

  /**
   * Error from last submission
   */
  error: Error | null;

  /**
   * Request ID from error (for support reference)
   */
  errorRequestId?: string;

  /**
   * Whether last submission was successful
   */
  isSuccess: boolean;

  /**
   * Reset error state
   */
  resetError: () => void;
}

/**
 * useFeedbackSubmit hook
 *
 * Provides a convenient interface for submitting feedback on chat answers.
 * Automatically builds the correct payload and handles errors.
 *
 * CRITICAL: This hook ensures no PII is included in feedback payloads.
 * Only conversationId, messageId, rating, and comment are sent (FR-FB-02).
 *
 * @param options - Hook options
 * @returns Feedback submission state and functions
 *
 * @example
 * ```tsx
 * const {
 *   submitFeedback,
 *   isLoading,
 *   error,
 *   errorRequestId,
 *   isSuccess,
 * } = useFeedbackSubmit({
 *   onSuccess: () => showToast('Feedback submitted!'),
 * });
 *
 * await submitFeedback({
 *   conversationId: 'conv_123',
 *   messageId: 'msg_456',
 *   rating: 'up',
 *   comment: 'Very helpful!',
 * });
 * ```
 */
export function useFeedbackSubmit(
  options: UseFeedbackSubmitOptions = {}
): UseFeedbackSubmitReturn {
  const { onSuccess, onError } = options;

  const [error, setError] = useState<Error | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);

  const feedbackMutation = useFeedback();

  const submitFeedback = useCallback(
    async (params: {
      conversationId: string;
      messageId: string;
      rating: FeedbackRating;
      comment?: string;
    }) => {
      const { conversationId, messageId, rating, comment } = params;

      // Reset state
      setError(null);
      setErrorRequestId(undefined);
      setIsSuccess(false);

      try {
        // Build payload - CRITICAL: Only include these fields (no PII)
        // This ensures compliance with FR-FB-02
        await feedbackMutation.mutateAsync({
          conversationId,
          messageId,
          type: rating, // 'up' | 'down' maps to API 'type' field
          comment: comment?.trim() || undefined,
        });

        setIsSuccess(true);
        onSuccess?.();
      } catch (err) {
        const error = err as Error & { requestId?: string };
        setError(error);
        setErrorRequestId(error.requestId);
        onError?.(error);
        throw error;
      }
    },
    [feedbackMutation, onSuccess, onError]
  );

  const resetError = useCallback(() => {
    setError(null);
    setErrorRequestId(undefined);
  }, []);

  return {
    submitFeedback,
    isLoading: feedbackMutation.isPending,
    error,
    errorRequestId,
    isSuccess,
    resetError,
  };
}
