/**
 * ChatInput Component
 *
 * Textarea input for chat messages with keyboard handling:
 * - Enter: Submit message
 * - Shift+Enter: New line
 * - Validation: 1-4000 characters
 *
 * Reference: FR-CHAT-01
 */

import { useState, useCallback, KeyboardEvent, ChangeEvent } from 'react';

export interface ChatInputProps {
  /**
   * Current input value
   */
  value: string;

  /**
   * Callback when input changes
   */
  onChange: (value: string) => void;

  /**
   * Callback when message is submitted
   */
  onSubmit: (message: string) => void;

  /**
   * Whether input is disabled (e.g., during API call)
   */
  disabled?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Minimum message length (default: 1)
   */
  minLength?: number;

  /**
   * Maximum message length (default: 4000)
   */
  maxLength?: number;
}

const DEFAULT_MIN_LENGTH = 1;
const DEFAULT_MAX_LENGTH = 4000;

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask a question about legal documents...',
  minLength = DEFAULT_MIN_LENGTH,
  maxLength = DEFAULT_MAX_LENGTH,
}: ChatInputProps) {
  const [error, setError] = useState<string | null>(null);

  const trimmedValue = value.trim();
  const isValid =
    trimmedValue.length >= minLength && trimmedValue.length <= maxLength;
  const isTooLong = value.length > maxLength;
  const remainingChars = maxLength - value.length;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Clear error on change
      if (error) {
        setError(null);
      }

      // Enforce max length
      if (newValue.length <= maxLength) {
        onChange(newValue);
      } else {
        // Allow deletion even when over limit
        if (newValue.length < value.length) {
          onChange(newValue);
        }
      }
    },
    [value, maxLength, error, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift: Submit
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        if (disabled || !isValid) {
          return;
        }

        // Validate before submit
        if (trimmedValue.length < minLength) {
          setError(`Message must be at least ${minLength} character${minLength > 1 ? 's' : ''}`);
          return;
        }

        if (trimmedValue.length > maxLength) {
          setError(`Message must be ${maxLength} characters or less`);
          return;
        }

        onSubmit(trimmedValue);
        // Note: Input clearing is handled by parent component (ChatContainer)
        // Parent clears only on success, not on error, for better retry UX
      }
      // Shift+Enter: Allow new line (default behavior)
    },
    [disabled, isValid, trimmedValue, minLength, maxLength, onSubmit]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (disabled || !isValid) {
        return;
      }

      if (trimmedValue.length < minLength) {
        setError(`Message must be at least ${minLength} character${minLength > 1 ? 's' : ''}`);
        return;
      }

      if (trimmedValue.length > maxLength) {
        setError(`Message must be ${maxLength} characters or less`);
        return;
      }

      onSubmit(trimmedValue);
      // Note: Input clearing is handled by parent component (ChatContainer)
      // Parent clears only on success, not on error, for better retry UX
    },
    [disabled, isValid, trimmedValue, minLength, maxLength, onSubmit]
  );

  // Determine input border color based on validation
  const inputBorderColor =
    error || isTooLong
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <label htmlFor="chat-input" className="sr-only">
          Chat message input
        </label>
        <textarea
          id="chat-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          className={`w-full px-4 py-3 pr-20 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${inputBorderColor}`}
          aria-invalid={error || isTooLong ? 'true' : 'false'}
          aria-describedby={
            error || isTooLong
              ? 'chat-error'
              : 'chat-helper'
          }
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          {/* Character counter */}
          <span
            className={`text-xs font-mono ${
              remainingChars < 0
                ? 'text-red-600'
                : remainingChars < 50
                  ? 'text-yellow-600'
                  : 'text-gray-500'
            }`}
            aria-live="polite"
            aria-atomic="true"
          >
            {remainingChars < 0 ? `-${Math.abs(remainingChars)}` : remainingChars}
            /{maxLength}
          </span>
          <button
            type="submit"
            disabled={disabled || !isValid}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p
          id="chat-error"
          className="mt-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && !isTooLong && (
        <p id="chat-helper" className="sr-only">
          Enter a message between {minLength} and {maxLength} characters. Press
          Enter to send, Shift+Enter for a new line.
        </p>
      )}

      {/* Max length warning */}
      {!error && isTooLong && (
        <p id="chat-error" className="mt-2 text-sm text-red-600" role="alert">
          Message exceeds {maxLength} characters. Please shorten your message.
        </p>
      )}
    </form>
  );
}

