/**
 * SearchInput Component
 *
 * Provides a query input supporting free-text legal queries.
 * Validates max length (500 chars) and empty queries.
 *
 * Reference: FR-SEARCH-01, FR-SEARCH-07
 */

import { useState, useMemo } from 'react';

export interface SearchInputProps {
  /**
   * Current query value
   */
  value: string;

  /**
   * Callback when query changes
   */
  onChange: (value: string) => void;

  /**
   * Callback when form is submitted
   */
  onSubmit: () => void;

  /**
   * Whether search is in progress
   */
  isLoading?: boolean;

  /**
   * Maximum query length (default: 500)
   */
  maxLength?: number;
}

const MAX_QUERY_LENGTH = 500;

export function SearchInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  maxLength = MAX_QUERY_LENGTH,
}: SearchInputProps) {
  const [error, setError] = useState<string | null>(null);

  // Compute validation state
  const trimmedValue = value.trim();
  const isEmpty = !trimmedValue;
  const isTooLong = trimmedValue.length > maxLength;
  const remainingChars = maxLength - value.length;
  const isValid = !isEmpty && !isTooLong;

  // Character counter color based on remaining chars
  const counterColor = useMemo(() => {
    if (remainingChars < 0) {
      return 'text-red-600';
    }
    if (remainingChars < 10) {
      return 'text-red-500';
    }
    if (remainingChars < 50) {
      return 'text-yellow-600';
    }
    return 'text-gray-500';
  }, [remainingChars]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Clear error on change (user is typing)
    if (error) {
      setError(null);
    }

    // Enforce max length at input level (prevent typing beyond limit) while still
    // allowing users to edit/delete even if the value came from the URL and is
    // already over the limit.
    if (newValue.length <= maxLength) {
      onChange(newValue);
      return;
    }

    // Allow deletions even when still above maxLength (so users can recover)
    if (newValue.length < value.length) {
      onChange(newValue);
      return;
    }

    // For paste/insert beyond maxLength, truncate to the limit
    onChange(newValue.slice(0, maxLength));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate empty query
    if (isEmpty) {
      setError('Please enter a search query');
      return;
    }

    // Validate max length
    if (isTooLong) {
      setError(`Query must be ${maxLength} characters or less`);
      return;
    }

    // Clear any previous errors
    setError(null);

    // Only call onSubmit if validation passes
    // This prevents URL update and API call if invalid
    onSubmit();
  };

  // Determine input border color based on validation state
  const inputBorderColor = error || isTooLong
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search legal documents
        </label>
        <input
          id="search-input"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search legal documents, cases, or precedents..."
          disabled={isLoading}
          maxLength={maxLength}
          className={`w-full px-4 py-3 pr-32 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${inputBorderColor}`}
          aria-invalid={error || isTooLong ? 'true' : 'false'}
          aria-describedby={
            error || isTooLong
              ? 'search-error'
              : isEmpty
                ? 'search-helper-empty'
                : 'search-helper'
          }
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Character counter - always visible */}
          <span
            className={`text-xs font-mono ${counterColor}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {remainingChars < 0 ? `-${Math.abs(remainingChars)}` : remainingChars}
            /{maxLength}
          </span>
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label={isLoading ? 'Searching...' : 'Search'}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p id="search-error" className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Inline validation feedback for max length */}
      {!error && isTooLong && (
        <p id="search-error" className="mt-2 text-sm text-red-600" role="alert">
          Query exceeds {maxLength} characters. Please shorten your query.
        </p>
      )}

      {/* Helper text for empty state */}
      {!error && !isTooLong && isEmpty && (
        <p id="search-helper-empty" className="mt-2 text-sm text-gray-500">
          Enter a search query to begin
        </p>
      )}

      {/* Hidden helper for screen readers */}
      {!error && !isTooLong && !isEmpty && (
        <p id="search-helper" className="sr-only">
          Enter a search query up to {maxLength} characters
        </p>
      )}
    </form>
  );
}
