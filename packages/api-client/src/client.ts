/**
 * Base Fetch Client with Authentication and Error Handling
 * 
 * Provides typed API client with automatic header injection, error parsing,
 * and rate limit extraction.
 * 
 * Reference: SRS §6.2 (headers), §6.4 (error response format), §7.3 (security)
 */

import { getSessionId, generateRequestId } from './session';
import { parseRateLimitHeaders, type RateLimitInfo } from './rate-limit';
import type { APIError, ErrorResponse } from './errors';
import type { ApiClientConfig } from './types';
import {
  shouldRetry,
  calculateRetryDelay,
  sleep,
  type RetryConfig,
  getDefaultBaseDelay,
  getDefaultMaxRetries,
} from './retry';
import {
  CircuitBreaker,
  getEndpointKey,
  createCircuitBreakerError,
  type CircuitBreakerConfig,
} from './circuit-breaker';

/**
 * API response wrapper with metadata
 */
export interface ApiResponse<T> {
  /**
   * Response data (typed)
   */
  data: T;

  /**
   * Backend-generated request ID (UUID v4)
   * Present in all responses (success and error)
   */
  requestId: string;

  /**
   * Rate limit information parsed from response headers
   */
  rateLimit: RateLimitInfo | null;

  /**
   * Optional metadata field from response
   * May contain debugging/diagnostic information
   */
  _meta?: Record<string, unknown>;

  /**
   * Number of retry attempts made (0 = first attempt succeeded)
   */
  retryCount: number;
}

/**
 * API error with full context
 */
export class ApiClientError extends Error {
  /**
   * Typed error from API response
   */
  readonly error: APIError;

  /**
   * Request ID for support reference
   */
  readonly requestId: string;

  /**
   * HTTP status code
   */
  readonly status: number;

  /**
   * Rate limit information (if available)
   */
  readonly rateLimit: RateLimitInfo | null;

  constructor(
    error: APIError,
    requestId: string,
    status: number,
    rateLimit: RateLimitInfo | null
  ) {
    super(error.message);
    this.name = 'ApiClientError';
    this.error = error;
    this.requestId = requestId;
    this.status = status;
    this.rateLimit = rateLimit;
  }
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /**
   * Whether to require authentication (default: true)
   * Set to false for public endpoints like /v1/health
   */
  requireAuth?: boolean;

  /**
   * Custom headers to include in request
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;
}

/**
 * API Client class
 * 
 * Provides typed methods for making authenticated API requests with
 * automatic header injection and error handling.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ApiClientConfig & { circuitBreaker?: CircuitBreakerConfig }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getAccessToken = config.getAccessToken;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
  }

  /**
   * Makes an authenticated API request with retry logic and circuit breaker
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      requireAuth = true,
      headers: customHeaders = {},
      timeout = 30000,
      retry: retryConfig = {},
    } = options;

    const endpointKey = getEndpointKey(path);

    // Check circuit breaker before making request
    if (this.circuitBreaker.isOpen(endpointKey)) {
      const timeUntilRetry = this.circuitBreaker.getTimeUntilRetry(endpointKey);
      const circuitError = createCircuitBreakerError(endpointKey, timeUntilRetry);
      const requestId = generateRequestId();
      throw new ApiClientError(
        {
          ...circuitError,
          requestId,
        },
        requestId,
        503,
        null
      );
    }

    let lastError: ApiClientError | null = null;
    let retryCount = 0;
    let retryAttempt = 0;
    const maxRetriesBound = retryConfig.maxRetries ?? 3;

    // Retry loop (attempt 0 = first retry after initial failure)
    while (retryAttempt <= maxRetriesBound) {
      try {
        const response = await this.executeRequest<T>(
          method,
          path,
          body,
          requireAuth,
          customHeaders,
          timeout
        );

        // Success - record success and return response with retry count
        this.circuitBreaker.recordSuccess(endpointKey);
        return {
          ...response,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof ApiClientError ? error : null;
        const isRetryable = lastError
          ? shouldRetry(lastError.error, lastError.status)
          : false;

        // Record failures that indicate service instability (not 4xx/validation/rate limiting).
        if (
          lastError &&
          isRetryable &&
          lastError.status !== 429 &&
          (lastError.status === 0 || lastError.status >= 500)
        ) {
          this.circuitBreaker.recordFailure(endpointKey);
        }

        // If not a retryable error, throw immediately
        if (!lastError || !isRetryable) {
          throw error;
        }

        const maxRetriesForStatus =
          retryConfig.maxRetries ?? getDefaultMaxRetries(lastError.status);

        // If we've exhausted retries for this error/status, throw the last error
        if (retryAttempt >= maxRetriesForStatus) {
          throw error;
        }

        // Calculate delay and wait before retrying
        const delay = calculateRetryDelay(
          lastError.error,
          lastError.rateLimit,
          retryAttempt,
          {
            ...retryConfig,
            baseDelay:
              retryConfig.baseDelay ?? getDefaultBaseDelay(lastError.status),
          }
        );

        retryCount = retryAttempt + 1;
        retryAttempt += 1;
        await sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Request failed');
  }

  /**
   * Executes a single API request (without retry logic)
   */
  private async executeRequest<T>(
    method: string,
    path: string,
    body: unknown | undefined,
    requireAuth: boolean,
    customHeaders: Record<string, string>,
    timeout: number
  ): Promise<Omit<ApiResponse<T>, 'retryCount'>> {
    const clientRequestId = generateRequestId();

    // Build URL
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
      'X-Request-Id': clientRequestId,
      ...customHeaders,
    };

    // Add Authorization header if auth is required
    if (requireAuth) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Note: If token is null, we still send the request (backend will return 401)
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(body !== undefined && body !== null
        ? { body: JSON.stringify(body) }
        : {}),
    };

    // Make request with timeout
    let response: Response;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      timeoutId = setTimeout(() => controller.abort(), timeout);

      response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(
          {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out',
            requestId: clientRequestId,
            retryable: true,
          },
          clientRequestId,
          504,
          null
        );
      }

      // Generic network error
      throw new ApiClientError(
        {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Network error. Please check your connection.',
          requestId: clientRequestId,
          retryable: true,
        },
        clientRequestId,
        0,
        null
      );
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    // Parse rate limit headers
    const rateLimit = parseRateLimitHeaders(response.headers);

    // Handle error responses
    if (!response.ok) {
      await this.handleErrorResponse(response, rateLimit, clientRequestId);
    }

    // Parse success response
    const json = await response.json();

    // Extract requestId (mandatory in all responses)
    const requestId = json.requestId;
    if (!requestId || typeof requestId !== 'string') {
      throw new ApiClientError(
        {
          code: 'INTERNAL_ERROR',
          message: 'Invalid response: missing requestId',
          requestId: clientRequestId,
          retryable: false,
        },
        clientRequestId,
        response.status,
        rateLimit
      );
    }

    // Extract _meta if present
    const _meta = json._meta;

    return {
      data: json as T,
      requestId,
      rateLimit,
      ...(_meta && { _meta }),
    };
  }

  /**
   * Handles error responses by parsing error JSON and throwing ApiClientError
   */
  private async handleErrorResponse(
    response: Response,
    rateLimit: RateLimitInfo | null,
    fallbackRequestId: string
  ): Promise<never> {
    let errorData: ErrorResponse;
    let requestId: string;

    try {
      const json = await response.json();
      errorData = json as ErrorResponse;
      requestId = errorData.error?.requestId || fallbackRequestId;
    } catch {
      // If response is not valid JSON, create a generic error
      requestId = fallbackRequestId;
      errorData = {
        error: {
          code: 'INTERNAL_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          requestId,
          retryable: response.status >= 500,
        },
      };
    }

    // Handle specific auth error cases
    if (response.status === 401) {
      errorData.error = {
        ...errorData.error,
        code: 'AUTH_INVALID_TOKEN',
        message: 'Your session has expired. Please sign in again.',
        requestId,
        retryable: false,
      };
    } else if (response.status === 403) {
      // Check if it's AUTH_DOMAIN_REJECTED (backend should set this, but handle fallback)
      if (errorData.error.code === 'AUTH_DOMAIN_REJECTED') {
        // Already set by backend, use as-is
      } else if (!errorData.error.code || errorData.error.code === 'FORBIDDEN') {
        // Backend didn't specify code, use generic FORBIDDEN
        errorData.error = {
          ...errorData.error,
          code: 'FORBIDDEN',
          requestId,
          retryable: false,
        };
      }
    }

    throw new ApiClientError(
      errorData.error,
      requestId,
      response.status,
      rateLimit
    );
  }

  /**
   * GET request
   */
  async get<T>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * Resets the circuit breaker for a specific endpoint
   * 
   * This allows manual recovery attempts (e.g., "Try Now" button)
   * to force the circuit breaker into half-open state.
   * 
   * @param path - API path (e.g., '/v1/search')
   */
  resetCircuitBreaker(path: string): void {
    const endpointKey = getEndpointKey(path);
    this.circuitBreaker.reset(endpointKey);
  }

  /**
   * Gets the circuit breaker state for a specific endpoint
   * 
   * @param path - API path (e.g., '/v1/search')
   * @returns Circuit breaker state and time until retry
   */
  getCircuitBreakerState(path: string): {
    isOpen: boolean;
    recoveryTimeMs: number;
  } {
    const endpointKey = getEndpointKey(path);
    const isOpen = this.circuitBreaker.isOpen(endpointKey);
    const recoveryTimeMs = this.circuitBreaker.getTimeUntilRetry(endpointKey);
    return { isOpen, recoveryTimeMs };
  }
}

/**
 * Creates a new API client instance
 * 
 * @param config - Client configuration (including optional circuit breaker config)
 * @returns ApiClient instance
 * 
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseUrl: import.meta.env.VITE_API_BASE_URL,
 *   getAccessToken: async () => {
 *     const token = await getKindeToken();
 *     return token || null;
 *   },
 *   circuitBreaker: {
 *     failureThreshold: 5,
 *     failureWindow: 60000,
 *     openDuration: 30000,
 *   },
 * });
 * 
 * const response = await client.get<SearchResponse>('/v1/search');
 * ```
 */
export function createApiClient(
  config: ApiClientConfig & { circuitBreaker?: CircuitBreakerConfig }
): ApiClient {
  return new ApiClient(config);
}
