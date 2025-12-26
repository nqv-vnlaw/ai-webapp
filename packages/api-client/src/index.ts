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

