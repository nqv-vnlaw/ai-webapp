/**
 * ScopeSelector Component
 *
 * Provides scope selection for search.
 * MVP: Only "precedent" scope enabled.
 * Post-MVP scopes shown as disabled/coming soon.
 *
 * Reference: FR-SEARCH-02
 */

import type { Scope } from '@vnlaw/api-client';

export interface ScopeSelectorProps {
  /**
   * Currently selected scope
   */
  value: Scope;

  /**
   * Callback when scope changes
   */
  onChange: (scope: Scope) => void;

  /**
   * Whether selector is disabled
   */
  disabled?: boolean;
}

const SCOPES: Array<{
  value: Scope;
  label: string;
  enabled: boolean;
  description: string;
}> = [
  {
    value: 'precedent',
    label: 'Precedent',
    enabled: true,
    description: 'Search legal precedents and case law',
  },
  {
    value: 'infobank',
    label: 'Infobank',
    enabled: false,
    description: 'Coming soon',
  },
  {
    value: 'both',
    label: 'Both',
    enabled: false,
    description: 'Coming soon',
  },
  {
    value: 'workspace',
    label: 'Workspace',
    enabled: false,
    description: 'Coming soon',
  },
];

export function ScopeSelector({
  value,
  onChange,
  disabled = false,
}: ScopeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="sr-only">Search scope</span>
      {SCOPES.map((scope) => {
        const isSelected = value === scope.value;
        const isDisabled = disabled || !scope.enabled;

        return (
          <button
            key={scope.value}
            type="button"
            onClick={() => !isDisabled && onChange(scope.value)}
            disabled={isDisabled}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSelected
                ? 'bg-blue-600 text-white'
                : isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            aria-pressed={isSelected}
            aria-disabled={isDisabled}
            title={scope.description}
          >
            {scope.label}
            {!scope.enabled && (
              <span className="ml-1 text-xs opacity-75">(soon)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

