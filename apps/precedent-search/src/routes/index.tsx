import { useState, useEffect } from 'react';
import {
  SearchInput,
  ScopeSelector,
  SearchResults,
} from '../components/search';
import { useSearchParams } from '../hooks';

export function IndexPage() {
  const { query, scope, setScope, setSearchParams } = useSearchParams();
  // Local draft state for input (prevents URL updates on every keystroke)
  const [draftQuery, setDraftQuery] = useState(query);

  // Sync draftQuery when URL query changes (e.g., back/forward navigation)
  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

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
        </div>
      </div>

      {/* Results Area */}
      <SearchResults query={query} scope={scope} />

      {/* Chat Placeholder Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chat Feature
          </h2>
          <p className="text-gray-600">
            Chat functionality will be available in Phase 4
          </p>
        </div>
      </div>
    </div>
  );
}

