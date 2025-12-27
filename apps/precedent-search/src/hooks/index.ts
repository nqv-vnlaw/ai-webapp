/**
 * Hooks Barrel File
 *
 * Exports all app-specific hooks.
 */

export { useSearchParams } from './useSearchParams';
export type { UseSearchParamsReturn } from './useSearchParams';

export { useInfiniteSearch } from './useInfiniteSearch';
export type { UseInfiniteSearchOptions } from './useInfiniteSearch';

export { useRecentSearches } from './useRecentSearches';
export type { RecentSearch } from './useRecentSearches';

export { useChat } from './useChat';
export type {
  UseChatReturn,
  UseChatOptions,
  ChatMessage,
  ConversationState,
  ChatError,
} from './useChat';

export { useFeatureFlags } from './useFeatureFlags';
export type { UseFeatureFlagsReturn } from './useFeatureFlags';

export { useRetryState } from './useRetryState';
export type {
  UseRetryStateOptions,
  UseRetryStateReturn,
  RetryState,
  CircuitBreakerStatus,
} from './useRetryState';

export { useFeedbackSubmit } from './useFeedbackSubmit';
export type {
  UseFeedbackSubmitOptions,
  UseFeedbackSubmitReturn,
} from './useFeedbackSubmit';

