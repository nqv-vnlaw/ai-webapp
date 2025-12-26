/**
 * Rate Limit Header Parsing
 * 
 * Parses rate limit headers from API responses to provide rate limit
 * information for UI display and retry logic.
 * 
 * Reference: SRS §6.5
 */

/**
 * Rate limit information parsed from response headers
 */
export interface RateLimitInfo {
  /**
   * Maximum requests allowed in the current window
   * From: X-RateLimit-Limit
   */
  limit: number;

  /**
   * Remaining requests in the current window
   * From: X-RateLimit-Remaining
   */
  remaining: number;

  /**
   * Unix epoch seconds when the current window resets
   * From: X-RateLimit-Reset
   */
  reset: number;

  /**
   * Seconds to wait before retrying (only present on 429 responses)
   * From: Retry-After header
   */
  retryAfter?: number;
}

/**
 * Parses rate limit headers from a Response Headers object.
 * 
 * All rate limit headers are present in all responses (success and error).
 * Retry-After is only present on 429 (Too Many Requests) responses.
 * 
 * @param headers - Headers object from fetch Response
 * @returns RateLimitInfo if all required headers are present, null otherwise
 * 
 * @example
 * ```typescript
 * const response = await fetch(url);
 * const rateLimit = parseRateLimitHeaders(response.headers);
 * if (rateLimit) {
 *   console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
 * }
 * ```
 */
export function parseRateLimitHeaders(
  headers: Headers
): RateLimitInfo | null {
  // Required headers
  const limitHeader = headers.get('X-RateLimit-Limit');
  const remainingHeader = headers.get('X-RateLimit-Remaining');
  const resetHeader = headers.get('X-RateLimit-Reset');

  // If any required header is missing, return null
  if (!limitHeader || !remainingHeader || !resetHeader) {
    return null;
  }

  // Parse integer values
  const limit = parseInt(limitHeader, 10);
  const remaining = parseInt(remainingHeader, 10);
  const reset = parseInt(resetHeader, 10);

  // Validate parsed values are valid integers
  if (
    Number.isNaN(limit) ||
    Number.isNaN(remaining) ||
    Number.isNaN(reset) ||
    limit < 0 ||
    remaining < 0 ||
    reset < 0
  ) {
    return null;
  }

  // Optional Retry-After header (only on 429 responses)
  const retryAfterHeader = headers.get('Retry-After');
  let retryAfter: number | undefined;

  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      retryAfter = parsed;
    }
  }

  return {
    limit,
    remaining,
    reset,
    ...(retryAfter !== undefined && { retryAfter }),
  };
}

