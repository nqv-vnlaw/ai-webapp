/**
 * useChat Hook
 *
 * App-level orchestrator hook for chat functionality.
 * Manages in-memory conversation state and integrates with API client.
 *
 * Reference: FR-CHAT-01 through FR-CHAT-06, SRS §4.2.3
 */

import { useState, useCallback, useRef } from 'react';
import { useChat as useChatMutation } from '@vnlaw/api-client';
import type {
  ChatRequest,
  ChatResponse,
  ChatMessage as ApiChatMessage,
  Citation,
  Scope,
} from '@vnlaw/api-client';
import { ApiClientError } from '@vnlaw/api-client';

/**
 * Internal message representation (matches API ChatMessage structure)
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Conversation state
 */
export interface ConversationState {
  /**
   * Array of messages in conversation order
   */
  messages: ChatMessage[];

  /**
   * Current conversation ID (null for new conversation)
   */
  conversationId: string | null;

  /**
   * Last assistant message ID (for feedback/regenerate)
   */
  lastAssistantMessageId: string | null;

  /**
   * Citations from last assistant response
   */
  lastCitations: Citation[];

  /**
   * Context limit warning flag from last response
   */
  contextLimitWarning: boolean;
}

/**
 * Error state
 */
export interface ChatError {
  /**
   * User-friendly error message
   */
  message: string;

  /**
   * Request ID for support reference (if available)
   */
  requestId?: string;

  /**
   * Original API error (for debugging)
   */
  originalError?: ApiClientError;
}

/**
 * Hook options
 */
export interface UseChatOptions {
  /**
   * Default scope for chat requests
   */
  defaultScope?: Scope;
}

/**
 * Return type for useChat hook
 */
export interface UseChatReturn {
  /**
   * Current conversation state
   */
  state: ConversationState;

  /**
   * Whether a request is in progress
   */
  isLoading: boolean;

  /**
   * Current error (if any)
   */
  error: ChatError | null;

  /**
   * Retry count from last successful API response
   * Reflects automatic retries performed by API client
   */
  retryCount: number;

  /**
   * Send a new message
   */
  sendMessage: (message: string, scope?: Scope) => Promise<void>;

  /**
   * Regenerate the last assistant response
   */
  regenerateLast: () => Promise<void>;

  /**
   * Retry the last failed request
   */
  retryLast: () => Promise<void>;

  /**
   * Reset conversation (clear all state)
   */
  resetConversation: () => void;

  /**
   * Export conversation as Markdown
   */
  exportMarkdown: () => string;

  /**
   * Copy last assistant answer to clipboard
   */
  copyLastAnswer: () => Promise<boolean>;
}

/**
 * useChat hook for managing chat conversations
 *
 * @param options - Hook options
 * @returns Chat state and control functions
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { defaultScope = 'precedent' } = options;

  // In-memory conversation state
  const [state, setState] = useState<ConversationState>({
    messages: [],
    conversationId: null,
    lastAssistantMessageId: null,
    lastCitations: [],
    contextLimitWarning: false,
  });

  // Store last request payload for retry
  const lastRequestRef = useRef<ChatRequest | null>(null);
  const lastScopeRef = useRef<Scope>(defaultScope);
  // Store retry count from last successful response
  const lastRetryCountRef = useRef<number>(0);

  // Use API client mutation (rename to avoid naming collision)
  const chatMutation = useChatMutation();

  /**
   * Build ChatRequest from current state
   */
  const buildChatRequest = useCallback(
    (
      userMessage: string,
      scope: Scope,
      regenerate: boolean = false,
      excludeLastAssistant: boolean = false
    ): ChatRequest => {
      // Build messages array from state
      let messagesToSend: ApiChatMessage[] = [...state.messages];

      // If regenerating, exclude last assistant message
      if (excludeLastAssistant) {
        // Find last assistant message and remove it
        const lastAssistantIndex = messagesToSend
          .map((m, i) => ({ role: m.role, index: i }))
          .reverse()
          .find((m) => m.role === 'assistant')?.index;

        if (lastAssistantIndex !== undefined) {
          messagesToSend = messagesToSend.slice(0, lastAssistantIndex);
        }
      }

      // Add current user message if not regenerating
      if (!regenerate) {
        messagesToSend.push({
          role: 'user',
          content: userMessage,
        });
      }

      // Trim to maxItems: 50 per OpenAPI spec (keep most recent messages)
      // Reference: OpenAPI spec ChatRequest.messages maxItems: 50
      const MAX_MESSAGES = 50;
      if (messagesToSend.length > MAX_MESSAGES) {
        messagesToSend = messagesToSend.slice(-MAX_MESSAGES);
      }

      return {
        conversationId: state.conversationId || null,
        message: userMessage,
        messages: messagesToSend,
        scope,
        regenerate,
      };
    },
    [state]
  );

  /**
   * Handle successful response
   */
  const handleSuccess = useCallback(
    (response: ChatResponse & { _retryCount?: number }) => {
    // Store retry count from response for retry state tracking
    if (response._retryCount !== undefined) {
      lastRetryCountRef.current = response._retryCount;
    }

    setState((prev) => {
      const newMessages: ChatMessage[] = [...prev.messages];

      // If regenerating, replace last assistant message
      if (lastRequestRef.current?.regenerate && prev.lastAssistantMessageId) {
        // Find and replace last assistant message
        const lastAssistantIndex = newMessages
          .map((m, i) => ({ role: m.role, index: i }))
          .reverse()
          .find((m) => m.role === 'assistant')?.index;

        if (lastAssistantIndex !== undefined) {
          newMessages[lastAssistantIndex] = {
            role: 'assistant',
            content: response.answer,
          };
        }
      } else {
        // For new messages (not regenerating):
        // - If this is a retry after error, the user message should already be in state
        //   (it was added optimistically and kept on error)
        // - If this is a fresh send, the user message was added optimistically before API call
        // - In both cases, we just need to add the assistant response
        
        // Verify user message exists (should be last message if not regenerating)
        // If somehow missing (edge case), add it from the request
        const lastMessage = newMessages[newMessages.length - 1];
        const isRetryAfterError = lastRequestRef.current && 
          lastMessage?.role !== 'user' &&
          !lastRequestRef.current.regenerate;
        
        if (isRetryAfterError && lastRequestRef.current?.message) {
          // Edge case: user message missing on retry, add it before assistant response
          newMessages.push({
            role: 'user',
            content: lastRequestRef.current.message,
          });
        }

        // Add assistant response
        newMessages.push({
          role: 'assistant',
          content: response.answer,
        });
      }

      return {
        messages: newMessages,
        conversationId: response.conversationId,
        lastAssistantMessageId: response.messageId,
        lastCitations: response.citations,
        contextLimitWarning: response.contextLimitWarning ?? false,
      };
    });
  }, []);

  /**
   * Handle error response
   */
  const handleError = useCallback((error: ApiClientError): ChatError => {
    const userMessage =
      error.error.message ||
      'An error occurred while processing your request. Please try again.';

    return {
      message: userMessage,
      requestId: error.requestId,
      originalError: error,
    };
  }, []);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (message: string, scope: Scope = lastScopeRef.current) => {
      lastScopeRef.current = scope;

      // Reset retry count at request start to avoid inheriting previous request's retryCount
      lastRetryCountRef.current = 0;

      // Add user message to state immediately (optimistic update)
      // This improves UX: user sees their message right away, even if API fails
      // Reference: SRS §4.2.3 - better retry/recovery UX
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: 'user',
            content: message,
          },
        ],
      }));

      const request = buildChatRequest(message, scope, false, false);
      lastRequestRef.current = request;

      // On error, keep the optimistic user message in state
      // This allows retry to work correctly: user message stays, and on success
      // handleSuccess will just add the assistant response
      // Reference: Better UX - user can see what they tried to send, and retry works seamlessly
      const response = await chatMutation.mutateAsync(request);
      handleSuccess(response);
    },
    [buildChatRequest, chatMutation, handleSuccess]
  );

  /**
   * Regenerate last assistant response
   */
  const regenerateLast = useCallback(async () => {
    if (!state.lastAssistantMessageId || state.messages.length === 0) {
      throw new Error('No assistant message to regenerate');
    }

    // Reset retry count at request start to avoid inheriting previous request's retryCount
    lastRetryCountRef.current = 0;

    // Find last user message before last assistant
    const lastUserMessage = state.messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message found for regeneration');
    }

    const request = buildChatRequest(
      lastUserMessage.content,
      lastScopeRef.current,
      true,
      true
    );
    lastRequestRef.current = request;

    const response = await chatMutation.mutateAsync(request);
    handleSuccess(response);
  }, [state, buildChatRequest, chatMutation, handleSuccess]);

  /**
   * Retry last failed request
   */
  const retryLast = useCallback(async () => {
    if (!lastRequestRef.current) {
      throw new Error('No previous request to retry');
    }

    // Reset retry count at request start to avoid inheriting previous request's retryCount
    lastRetryCountRef.current = 0;

    const response = await chatMutation.mutateAsync(lastRequestRef.current);
    handleSuccess(response);
  }, [chatMutation, handleSuccess]);

  /**
   * Reset conversation
   */
  const resetConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      lastAssistantMessageId: null,
      lastCitations: [],
      contextLimitWarning: false,
    });
    lastRequestRef.current = null;
  }, []);

  /**
   * Export conversation as Markdown
   */
  const exportMarkdown = useCallback((): string => {
    const lines: string[] = ['# Chat Conversation\n'];

    state.messages.forEach((message) => {
      const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
      lines.push(`## ${roleLabel}\n`);
      lines.push(`${message.content}\n`);
    });

    // Add citations if available
    if (state.lastCitations.length > 0) {
      lines.push('\n## Sources\n');
      state.lastCitations.forEach((citation, index) => {
        lines.push(
          `${index + 1}. [${citation.title}](${citation.url})${citation.snippet ? ` - ${citation.snippet}` : ''}\n`
        );
      });
    }

    return lines.join('');
  }, [state]);

  /**
   * Copy last assistant answer to clipboard
   */
  const copyLastAnswer = useCallback(async (): Promise<boolean> => {
    const lastAssistantMessage = state.messages
      .slice()
      .reverse()
      .find((m) => m.role === 'assistant');

    if (!lastAssistantMessage) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [state]);

  // Extract error from mutation
  const error: ChatError | null =
    chatMutation.error && chatMutation.error instanceof ApiClientError
      ? handleError(chatMutation.error)
      : null;

  return {
    state,
    isLoading: chatMutation.isPending,
    error,
    retryCount: lastRetryCountRef.current,
    sendMessage,
    regenerateLast,
    retryLast,
    resetConversation,
    exportMarkdown,
    copyLastAnswer,
  };
}

