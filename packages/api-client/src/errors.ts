/**
 * API Error Types
 * 
 * Re-exports generated error types from @vnlaw/shared and provides type guards.
 * All error types are generated from OpenAPI spec to avoid drift.
 */

import type { components } from '@vnlaw/shared';

/**
 * Re-export generated error types from OpenAPI spec
 */
export type APIError = components['schemas']['APIError'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type AuthGoogleDisconnectedError =
  components['schemas']['AuthGoogleDisconnectedError'];
export type ValidationError = components['schemas']['ValidationError'];
export type GenericError = components['schemas']['GenericError'];

/**
 * Type guard: Check if error is a validation error
 */
export function isValidationError(
  error: APIError
): error is ValidationError {
  return (
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'INVALID_REQUEST' ||
    error.code === 'QUERY_TOO_LONG'
  );
}

/**
 * Type guard: Check if error is an authentication error
 */
export function isAuthError(
  error: APIError
): error is AuthGoogleDisconnectedError | GenericError {
  return (
    error.code === 'AUTH_INVALID_TOKEN' ||
    error.code === 'AUTH_DOMAIN_REJECTED' ||
    error.code === 'AUTH_GOOGLE_DISCONNECTED'
  );
}

/**
 * Type guard: Check if error is rate limited
 */
export function isRateLimited(error: APIError): error is GenericError {
  return error.code === 'RATE_LIMITED';
}

