/**
 * useFeedback Hook
 *
 * TanStack Query mutation hook for submitting feedback on chat answers.
 * Calls POST /v1/feedback endpoint.
 *
 * Reference: FR-FB-01, FR-FB-02
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { FeedbackRequest, FeedbackResponse } from '../types';
import type { ApiClientError } from '../client';
import { useApiClient } from '../provider';

/**
 * Feedback mutation key factory
 */
export const feedbackKeys = {
  all: ['feedback'] as const,
};

/**
 * Hook options for useFeedback
 */
export interface UseFeedbackOptions {
  /**
   * Additional TanStack Query mutation options
   */
  mutationOptions?: Omit<
    UseMutationOptions<
      FeedbackResponse,
      ApiClientError,
      FeedbackRequest,
      unknown
    >,
    'mutationFn'
  >;
}

/**
 * useFeedback hook for submitting feedback on chat answers
 *
 * @param options - Feedback options
 * @returns TanStack Query mutation result with typed feedback response
 *
 * @example
 * ```typescript
 * const { mutate, isPending, isSuccess } = useFeedback();
 *
 * mutate({
 *   conversationId: 'conv_123',
 *   messageId: 'msg_456',
 *   type: 'up', // or 'down'
 *   comment: 'Very helpful answer!', // optional
 * });
 * ```
 */
export function useFeedback(options: UseFeedbackOptions = {}) {
  const client = useApiClient();
  const { mutationOptions } = options;

  return useMutation({
    mutationFn: async (request: FeedbackRequest) => {
      const response = await client.post<FeedbackResponse>(
        '/v1/feedback',
        request
      );
      return response.data;
    },
    ...mutationOptions,
  });
}
