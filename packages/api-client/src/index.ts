// Main entry point for @vnlaw/api-client
// Re-export public API

export * from './types';
export {
  isValidationError,
  isAuthError,
  isRateLimited,
} from './errors';
export type {
  APIError,
  ErrorResponse,
  AuthGoogleDisconnectedError,
  ValidationError,
  GenericError,
} from './errors';

// Session and request ID utilities
export { getSessionId, generateRequestId } from './session';

// Rate limit utilities
export { parseRateLimitHeaders } from './rate-limit';
export type { RateLimitInfo } from './rate-limit';

// API Client
export { ApiClient, createApiClient, ApiClientError } from './client';
export type { ApiResponse, RequestOptions } from './client';

// Retry utilities
export {
  shouldRetry,
  exponentialBackoff,
  calculateRetryDelay,
  sleep,
} from './retry';
export type { RetryConfig } from './retry';

// Circuit breaker utilities
export { CircuitBreaker, getEndpointKey, createCircuitBreakerError } from './circuit-breaker';
export type { CircuitBreakerConfig, CircuitState } from './circuit-breaker';

// React Provider and Hooks
export { ApiClientProvider, useApiClient } from './provider';
export type { ApiClientProviderProps } from './provider';

export * from './hooks';

