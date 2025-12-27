/**
 * ChatContainer Component
 *
 * Full chat interface wired to useChat hook.
 * Renders messages, handles loading/error states, and provides action buttons.
 *
 * Reference: FR-CHAT-01 through FR-CHAT-06, FR-FB-01, FR-FB-02
 */

import { useState, useCallback } from 'react';
import { useChat, useFeedbackSubmit } from '../../hooks';
import { useFlagsContext } from '../../contexts';
import type { Scope } from '@vnlaw/api-client';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { CitationsPanel } from '../citations';
import { FeedbackButtons, FeedbackModal } from '../feedback';
import type { FeedbackRating } from '../feedback';

export interface ChatContainerProps {
  /**
   * Scope for chat requests (default: 'precedent')
   */
  scope?: Scope;
}

/**
 * Helper to download text as file
 */
function downloadTextAsFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ChatContainer({ scope = 'precedent' }: ChatContainerProps) {
  const {
    state,
    isLoading,
    error,
    sendMessage,
    regenerateLast,
    retryLast,
    exportMarkdown,
    copyLastAnswer,
  } = useChat({ defaultScope: scope });

  const { flags } = useFlagsContext();
  const feedbackEnabled = flags.FEEDBACK_ENABLED;

  const {
    submitFeedback,
    isLoading: isFeedbackLoading,
    error: feedbackError,
    errorRequestId: feedbackErrorRequestId,
    resetError: resetFeedbackError,
  } = useFeedbackSubmit();

  const [inputValue, setInputValue] = useState('');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const handleSubmit = useCallback(
    async (message: string) => {
      try {
        await sendMessage(message, scope);
        // Clear input only on success (not on error)
        // This improves UX: user can retry without retyping
        // Reference: SRS §4.2.3 - better retry/recovery UX
        setInputValue('');
      } catch {
        // Error is handled by hook state
        // Input is NOT cleared on error, allowing user to retry easily
      }
    },
    [sendMessage, scope]
  );

  const handleRegenerate = useCallback(async () => {
    try {
      await regenerateLast();
    } catch {
      // Error is handled by hook state
    }
  }, [regenerateLast]);

  const handleCopy = useCallback(async () => {
    await copyLastAnswer();
    // Could show a toast notification here in the future
  }, [copyLastAnswer]);

  const handleExport = useCallback(() => {
    const markdown = exportMarkdown();
    const filename = `chat-conversation-${new Date().toISOString().split('T')[0]}.md`;
    downloadTextAsFile(markdown, filename);
  }, [exportMarkdown]);

  const handleRetry = useCallback(async () => {
    try {
      await retryLast();
    } catch {
      // Error is handled by hook state
    }
  }, [retryLast]);

  // Feedback handlers
  const handleFeedbackSubmit = useCallback(
    async (rating: FeedbackRating, comment?: string) => {
      if (!state.conversationId || !state.lastAssistantMessageId) {
        return;
      }

      await submitFeedback({
        conversationId: state.conversationId,
        messageId: state.lastAssistantMessageId,
        rating,
        comment,
      });
    },
    [state.conversationId, state.lastAssistantMessageId, submitFeedback]
  );

  const handleThumbsDown = useCallback(() => {
    setFeedbackModalOpen(true);
  }, []);

  const handleFeedbackModalClose = useCallback(() => {
    setFeedbackModalOpen(false);
    resetFeedbackError();
  }, [resetFeedbackError]);

  const handleFeedbackModalSubmit = useCallback(
    async (comment?: string) => {
      await handleFeedbackSubmit('down', comment);
      handleFeedbackModalClose();
    },
    [handleFeedbackSubmit, handleFeedbackModalClose]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Context Limit Warning Banner */}
      {state.contextLimitWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <p className="text-sm text-yellow-800">
            ⚠️ Conversation history was truncated due to length limits. Some
            context may be missing.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {error.message}
              </p>
              {error.requestId && (
                <p className="text-xs text-red-600 mt-1">
                  Request ID: {error.requestId}
                </p>
              )}
            </div>
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {state.messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">
              Ask questions about legal documents, cases, or precedents.
            </p>
          </div>
        )}

        {state.messages.length > 0 && (
          <div className="space-y-4">
            {state.messages.map((message, index) => {
              const isLast = index === state.messages.length - 1;
              const isLastAssistant = isLast && message.role === 'assistant';

              // Show actions only for the last assistant message
              const actions = isLastAssistant ? (
                <div className="flex items-center gap-2">
                  {/* Feedback buttons (only when enabled and have IDs) */}
                  {feedbackEnabled &&
                    state.conversationId &&
                    state.lastAssistantMessageId && (
                      <>
                        <FeedbackButtons
                          messageId={state.lastAssistantMessageId}
                          conversationId={state.conversationId}
                          onSubmit={handleFeedbackSubmit}
                          onThumbsDown={handleThumbsDown}
                          disabled={isLoading || isFeedbackLoading}
                        />
                        <span className="text-gray-300">|</span>
                      </>
                    )}
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="text-xs text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Regenerate answer"
                  >
                    Regenerate
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleCopy}
                    disabled={isLoading}
                    className="text-xs text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Copy answer"
                  >
                    Copy
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="text-xs text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Export conversation"
                  >
                    Export
                  </button>
                </div>
              ) : null;

              return (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  isLoading={false}
                  actions={actions}
                />
              );
            })}
          </div>
        )}

        {/* Loading skeleton for new assistant response */}
        {isLoading && (
          <ChatMessage
            role="assistant"
            content=""
            isLoading={true}
          />
        )}
      </div>

      {/* Citations Panel - constrained height with scroll */}
      {state.lastCitations.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 max-h-[250px] overflow-y-auto flex-shrink-0">
          <CitationsPanel citations={state.lastCitations} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </div>

      {/* Feedback Modal (for thumbs down comments) */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={handleFeedbackModalClose}
        onSubmit={handleFeedbackModalSubmit}
        isLoading={isFeedbackLoading}
        error={feedbackError?.message}
        requestId={feedbackErrorRequestId}
      />
    </div>
  );
}
