import { useState, useEffect } from 'react';
import {
  SearchInput,
  ScopeSelector,
  SearchResults,
  SearchEmpty,
  RecentSearches,
} from '../components/search';
import { ChatContainer } from '../components/chat';
import { useSearchParams, useRecentSearches } from '../hooks';

export function IndexPage() {
  const { query, scope, setScope, setSearchParams } = useSearchParams();
  const { searches, enabled, addSearch, clearSearches, setEnabled } =
    useRecentSearches();
  // Local draft state for input (prevents URL updates on every keystroke)
  const [draftQuery, setDraftQuery] = useState(query);

  // Sync draftQuery when URL query changes (e.g., back/forward navigation)
  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  // Add to recent searches when query is submitted
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed && trimmed.length <= 500) {
      addSearch(trimmed);
    }
  }, [query, addSearch]);

  const handleQueryChange = (newQuery: string) => {
    // Update local draft only (doesn't trigger URL update)
    setDraftQuery(newQuery);
  };

  const handleQuerySubmit = () => {
    // Update URL on submit (push to history for back/forward navigation)
    // Search will execute automatically via SearchResults component
    setSearchParams(draftQuery, scope, true);
  };

  const handleScopeChange = (newScope: typeof scope) => {
    // Update URL when scope changes
    setScope(newScope);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Update URL with suggestion (push to history to trigger search)
    setSearchParams(suggestion, scope, true);
  };

  const handleRecentSearchClick = (preview: string) => {
    // Use preview as the search query (it's already trimmed and max 50 chars)
    setSearchParams(preview, scope, true);
  };

  const isQueryEmpty = !query.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Legal Research Platform
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Search legal documents, cases, and precedents
        </p>

        {/* Scope Selector */}
        <div className="mb-4">
          <ScopeSelector value={scope} onChange={handleScopeChange} />
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <SearchInput
            value={draftQuery}
            onChange={handleQueryChange}
            onSubmit={handleQuerySubmit}
            isLoading={false}
          />
          {/* Recent Searches */}
          <RecentSearches
            searches={searches}
            enabled={enabled}
            onEnabledChange={setEnabled}
            onClear={clearSearches}
            onSearchClick={handleRecentSearchClick}
          />
        </div>
      </div>

      {/* Results Area */}
      {isQueryEmpty ? (
        <SearchEmpty onSuggestionClick={handleSuggestionClick} />
      ) : (
        <SearchResults query={query} scope={scope} />
      )}

      {/* Chat Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ask a Question
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[600px]">
          <ChatContainer scope={scope} />
        </div>
      </div>
    </div>
  );
}
