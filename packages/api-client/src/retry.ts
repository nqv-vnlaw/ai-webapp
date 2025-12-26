/**
 * Retry Logic with Exponential Backoff
 * 
 * Implements retry decision logic and exponential backoff calculation
 * for handling transient failures.
 * 
 * Reference: SRS §7.2 (retry rules), §6.6 (retry matrix)
 */

import type { APIError } from './errors';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds (default: 1000)
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds (default: 30000)
   */
  maxDelay?: number;

  /**
   * Enable random jitter (default: true)
   */
  jitter?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true,
};

/**
 * Determines if an error should be retried based on error.retryable field
 * and HTTP status code.
 * 
 * Decision priority:
 * 1. If error.retryable is present, use it as authoritative
 * 2. Otherwise, apply retry matrix based on status code
 * 
 * @param error - API error from response
 * @param status - HTTP status code
 * @returns true if error should be retried
 */
export function shouldRetry(error: APIError, status: number): boolean {
  // If error.retryable is explicitly set, use it as authoritative
  if (typeof error.retryable === 'boolean') {
    return error.retryable;
  }

  // Apply retry matrix based on status code
  // 429: Retry with Retry-After header (not exponential)
  if (status === 429) {
    return true;
  }

  // 502/503/504: Retry with exponential backoff
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  // 4xx (except 429): Do NOT retry
  if (status >= 400 && status < 500) {
    return false;
  }

  // 5xx: Retry (server errors)
  if (status >= 500) {
    return true;
  }

  // Network errors (status 0): Retry
  if (status === 0) {
    return true;
  }

  // Default: do not retry
  return false;
}

/**
 * Calculates exponential backoff delay with optional jitter.
 * 
 * Formula:
 * - delay = min(baseDelay * 2^attempt, maxDelay)
 * - If jitter enabled: add random 0-25% of delay
 * 
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @param jitter - Whether to add random jitter
 * @returns Delay in milliseconds
 */
export function exponentialBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: boolean
): number {
  // Calculate exponential delay: baseDelay * 2^attempt
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt),
    maxDelay
  );

  if (!jitter) {
    return exponentialDelay;
  }

  // Add random jitter: 0-25% of delay
  const jitterAmount = exponentialDelay * 0.25 * Math.random();
  return Math.floor(exponentialDelay + jitterAmount);
}

/**
 * Calculates retry delay based on error type and attempt number.
 * 
 * Priority:
 * 1. Retry-After header (for 429 errors) - use header value directly
 * 2. retryAfterSeconds from error JSON - use JSON value
 * 3. Exponential backoff - use calculated delay
 * 
 * @param error - API error from response
 * @param rateLimit - Rate limit info (may contain retryAfter)
 * @param attempt - Current retry attempt (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  error: APIError,
  rateLimit: { retryAfter?: number } | null,
  attempt: number,
  config: RetryConfig
): number {
  const {
    baseDelay = DEFAULT_RETRY_CONFIG.baseDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    jitter = DEFAULT_RETRY_CONFIG.jitter,
  } = config;

  // Priority 1: Retry-After header (for 429 errors)
  if (rateLimit?.retryAfter !== undefined) {
    // Retry-After is in seconds, convert to milliseconds
    return rateLimit.retryAfter * 1000;
  }

  // Priority 2: retryAfterSeconds from error JSON
  if (error.retryAfterSeconds !== undefined && error.retryAfterSeconds !== null) {
    // retryAfterSeconds is in seconds, convert to milliseconds
    return error.retryAfterSeconds * 1000;
  }

  // Priority 3: Exponential backoff
  return exponentialBackoff(attempt, baseDelay, maxDelay, jitter);
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

