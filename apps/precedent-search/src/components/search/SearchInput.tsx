/**
 * SearchInput Component
 *
 * Provides a query input supporting free-text legal queries.
 * Validates max length (500 chars) and empty queries.
 *
 * Reference: FR-SEARCH-01, FR-SEARCH-07
 */

import { useState } from 'react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Clear error on change
    if (error) {
      setError(null);
    }

    // Enforce max length
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedValue = value.trim();

    // Validate empty query
    if (!trimmedValue) {
      setError('Please enter a search query');
      return;
    }

    // Validate max length
    if (trimmedValue.length > maxLength) {
      setError(`Query must be ${maxLength} characters or less`);
      return;
    }

    onSubmit();
  };

  const remainingChars = maxLength - value.length;
  const isNearLimit = remainingChars < 50;

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
          className="w-full px-4 py-3 pr-24 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'search-error' : 'search-helper'}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isNearLimit && (
            <span
              className={`text-xs ${
                remainingChars < 10 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {remainingChars}
            </span>
          )}
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label={isLoading ? 'Searching...' : 'Search'}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      {error && (
        <p id="search-error" className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!error && (
        <p id="search-helper" className="sr-only">
          Enter a search query up to {maxLength} characters
        </p>
      )}
    </form>
  );
}

