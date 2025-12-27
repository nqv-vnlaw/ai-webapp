/**
 * ChatMessage Component
 *
 * Displays a single chat message (user or assistant variant).
 * Assistant messages show action buttons (regenerate, copy, export).
 * All handlers are passed as props for presentational component pattern.
 *
 * Reference: FR-CHAT-02, FR-CHAT-05, FR-CHAT-06
 */

import type { ReactNode } from 'react';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessageProps {
  /**
   * Message role (user or assistant)
   */
  role: MessageRole;

  /**
   * Message content (text or markdown)
   */
  content: string;

  /**
   * Whether this message is loading (for assistant messages)
   */
  isLoading?: boolean;

  /**
   * Action buttons for assistant messages (regenerate, copy, export)
   * Only shown for assistant role
   */
  actions?: ReactNode;

  /**
   * Feedback buttons for assistant messages (thumbs up/down)
   * Only shown for assistant role
   */
  feedbackButtons?: ReactNode;

  /**
   * Optional timestamp
   */
  timestamp?: Date | string;
}

export function ChatMessage({
  role,
  content,
  isLoading = false,
  actions,
  feedbackButtons,
  timestamp,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div
      className={`flex gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Avatar/Icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700'
        }`}
        aria-label={isUser ? 'User' : 'Assistant'}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col gap-2 max-w-[80%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 min-h-[2.5rem] ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          } ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Generating answer...</span>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {/* Simple text rendering - markdown support can be added later */}
              {content ? (
                <p className="whitespace-pre-wrap break-words">{content}</p>
              ) : (
                <p className="text-gray-400 italic">Empty message</p>
              )}
            </div>
          )}
        </div>

        {/* Feedback buttons (only for assistant messages) */}
        {isAssistant && !isLoading && feedbackButtons && (
          <div className="flex items-center gap-2 text-sm mb-2">
            {feedbackButtons}
          </div>
        )}

        {/* Actions (only for assistant messages) */}
        {isAssistant && !isLoading && actions && (
          <div className="flex items-center gap-2 text-sm">
            {actions}
          </div>
        )}

        {/* Timestamp (optional) */}
        {timestamp && (
          <span className="text-xs text-gray-500">
            {typeof timestamp === 'string'
              ? timestamp
              : timestamp.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

