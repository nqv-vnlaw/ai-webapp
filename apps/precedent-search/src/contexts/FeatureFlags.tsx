/**
 * FeatureFlagProvider Context
 *
 * Provides feature flags to the entire application via React Context.
 * Wraps the useFeatureFlags hook for convenient consumption.
 *
 * Reference: SRS Feature Flag System
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useFeatureFlags, type UseFeatureFlagsReturn } from '../hooks/useFeatureFlags';
import { DEFAULT_FLAGS } from '@vnlaw/api-client';
import type { FeatureFlags } from '@vnlaw/api-client';

/**
 * Context value type
 */
interface FeatureFlagContextValue extends UseFeatureFlagsReturn {
  /**
   * Get a specific flag value with type safety
   */
  getFlag: <K extends keyof FeatureFlags>(key: K) => FeatureFlags[K];
}

/**
 * Default context value (used when provider is not present)
 */
const defaultContextValue: FeatureFlagContextValue = {
  flags: DEFAULT_FLAGS,
  isLoading: false,
  error: null,
  isStale: true,
  getFlag: (key) => DEFAULT_FLAGS[key],
};

/**
 * Feature flag context
 */
const FeatureFlagContext = createContext<FeatureFlagContextValue>(defaultContextValue);

/**
 * Props for FeatureFlagProvider
 */
export interface FeatureFlagProviderProps {
  children: ReactNode;
}

/**
 * FeatureFlagProvider component
 *
 * Wrap your app with this provider to access feature flags throughout
 * the component tree via the useFlags() hook.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <FeatureFlagProvider>
 *   <App />
 * </FeatureFlagProvider>
 *
 * // In any component
 * const { flags } = useFlags();
 * if (flags.FEEDBACK_ENABLED) { ... }
 * ```
 */
export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const featureFlagsState = useFeatureFlags();

  const getFlag = <K extends keyof FeatureFlags>(key: K): FeatureFlags[K] => {
    return featureFlagsState.flags[key];
  };

  const value: FeatureFlagContextValue = {
    ...featureFlagsState,
    getFlag,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to consume feature flags from context
 *
 * @returns Feature flag context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { flags, getFlag, isLoading } = useFlagsContext();
 *
 *   if (getFlag('FEEDBACK_ENABLED')) {
 *     return <FeedbackButtons />;
 *   }
 *   return null;
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFlagsContext(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  return context;
}
