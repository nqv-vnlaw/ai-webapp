import { useState } from 'react';
import {
  SearchInput,
  ScopeSelector,
  SearchResults,
  SearchSkeleton,
} from '../components/search';
import { useSearchParams } from '../hooks/useSearchParams';

export function IndexPage() {
  const { query, scope, setQuery, setScope } = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    // Placeholder: Search functionality will be implemented in next phase
    // Query and scope are already in URL via useSearchParams
    console.log('Search:', { query, scope });
    setIsSearching(true);
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  const handleQueryChange = (newQuery: string) => {
    // Update URL immediately as user types (for shareable URLs)
    setQuery(newQuery);
  };

  const handleQuerySubmit = () => {
    // Trigger search (will be wired to API in next phase)
    handleSearch();
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
            value={query}
            onChange={handleQueryChange}
            onSubmit={handleQuerySubmit}
            isLoading={isSearching}
          />
        </div>
      </div>

      {/* Results Area */}
      {isSearching ? (
        <SearchSkeleton count={3} />
      ) : (
        <SearchResults
          isLoading={false}
          hasResults={false}
          hasMore={false}
        />
      )}

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

