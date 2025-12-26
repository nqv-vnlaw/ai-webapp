/**
 * useChat Hook
 * 
 * TanStack Query hook for chat API calls.
 * Provides typed chat functionality with error handling and rate limit info.
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { ChatRequest, ChatResponse } from '../types';
import type { ApiClientError } from '../client';
import { useApiClient } from '../provider';

/**
 * Chat mutation key factory
 */
export const chatKeys = {
  all: ['chat'] as const,
};

/**
 * Hook options for useChat
 */
export interface UseChatOptions {
  /**
   * Additional TanStack Query mutation options
   */
  mutationOptions?: Omit<
    UseMutationOptions<
      ChatResponse,
      ApiClientError,
      ChatRequest,
      unknown
    >,
    'mutationFn'
  >;
}

/**
 * useChat hook for performing chat queries
 * 
 * @param options - Chat options
 * @returns TanStack Query mutation result with typed chat response
 * 
 * @example
 * ```typescript
 * const { mutate, data, error, isPending } = useChat();
 * 
 * mutate({
 *   message: 'What is contract law?',
 *   scope: 'precedent',
 * });
 * ```
 */
export function useChat(options: UseChatOptions = {}) {
  const client = useApiClient();
  const { mutationOptions } = options;

  return useMutation({
    mutationFn: async (request: ChatRequest) => {
      const response = await client.post<ChatResponse>('/v1/chat', request);
      return response.data;
    },
    ...mutationOptions,
  });
}

