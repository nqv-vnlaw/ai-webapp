/**
 * Circuit Breaker Pattern
 * 
 * Implements per-endpoint circuit breaker to prevent cascading failures.
 * Opens circuit after 5 consecutive failures within 60s window.
 * Keeps circuit open for 30s before allowing retry attempts.
 * 
 * Reference: SRS §6.6.3, §7.2
 */

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures before opening circuit (default: 5)
   */
  failureThreshold?: number;

  /**
   * Time window in milliseconds for tracking failures (default: 60000 = 60s)
   */
  failureWindow?: number;

  /**
   * Duration in milliseconds to keep circuit open (default: 30000 = 30s)
   */
  openDuration?: number;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  failureWindow: 60000, // 60 seconds
  openDuration: 30000, // 30 seconds
};

/**
 * Per-endpoint circuit breaker state
 */
interface CircuitStateData {
  /**
   * Current circuit state
   */
  state: CircuitState;

  /**
   * Timestamps of recent failures (within failure window)
   */
  failures: number[];

  /**
   * Timestamp when circuit was opened
   */
  openedAt: number | null;

  /**
   * Number of consecutive failures
   */
  consecutiveFailures: number;
}

/**
 * Circuit breaker manager
 * 
 * Tracks circuit state per endpoint and manages failure tracking.
 */
export class CircuitBreaker {
  private readonly config: Required<CircuitBreakerConfig>;
  private readonly circuits: Map<string, CircuitStateData> = new Map();

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? DEFAULT_CONFIG.failureThreshold,
      failureWindow: config.failureWindow ?? DEFAULT_CONFIG.failureWindow,
      openDuration: config.openDuration ?? DEFAULT_CONFIG.openDuration,
    };
  }

  /**
   * Gets or creates circuit state for an endpoint
   */
  private getCircuit(endpoint: string): CircuitStateData {
    if (!this.circuits.has(endpoint)) {
      this.circuits.set(endpoint, {
        state: 'closed',
        failures: [],
        openedAt: null,
        consecutiveFailures: 0,
      });
    }
    return this.circuits.get(endpoint)!;
  }

  /**
   * Cleans up old failures outside the failure window
   */
  private cleanupFailures(circuit: CircuitStateData, now: number): void {
    const cutoff = now - this.config.failureWindow;
    circuit.failures = circuit.failures.filter((timestamp) => timestamp > cutoff);

    // If no failures in window, reset consecutive failures
    if (circuit.failures.length === 0) {
      circuit.consecutiveFailures = 0;
    }
  }

  /**
   * Checks if circuit is open and should block requests
   * 
   * @param endpoint - Endpoint identifier (e.g., '/v1/search')
   * @returns true if circuit is open and requests should be blocked
   */
  isOpen(endpoint: string): boolean {
    const circuit = this.getCircuit(endpoint);
    const now = Date.now();

    // Clean up old failures
    this.cleanupFailures(circuit, now);

    // If circuit is closed, allow requests
    if (circuit.state === 'closed') {
      return false;
    }

    // If circuit is open, check if open duration has elapsed
    if (circuit.state === 'open') {
      if (circuit.openedAt && now - circuit.openedAt >= this.config.openDuration) {
        // Transition to half-open (allow one test request)
        circuit.state = 'half-open';
        circuit.openedAt = null;
        return false;
      }
      // Still in open duration, block requests
      return true;
    }

    // Half-open state: allow one request to test if service recovered
    return false;
  }

  /**
   * Records a successful request
   * 
   * Resets circuit to closed state on success.
   * 
   * @param endpoint - Endpoint identifier
   */
  recordSuccess(endpoint: string): void {
    const circuit = this.getCircuit(endpoint);
    const now = Date.now();

    // Clean up old failures
    this.cleanupFailures(circuit, now);

    // Reset circuit state on success
    circuit.state = 'closed';
    circuit.consecutiveFailures = 0;
    circuit.openedAt = null;
  }

  /**
   * Records a failed request
   * 
   * Updates failure tracking and opens circuit if threshold is reached.
   * 
   * @param endpoint - Endpoint identifier
   */
  recordFailure(endpoint: string): void {
    const circuit = this.getCircuit(endpoint);
    const now = Date.now();

    // Clean up old failures
    this.cleanupFailures(circuit, now);

    // Record new failure
    circuit.failures.push(now);
    circuit.consecutiveFailures = circuit.failures.length;

    // Check if we should open the circuit
    if (circuit.consecutiveFailures >= this.config.failureThreshold) {
      circuit.state = 'open';
      circuit.openedAt = now;
    } else if (circuit.state === 'half-open') {
      // If half-open request failed, immediately open circuit
      circuit.state = 'open';
      circuit.openedAt = now;
    }
  }

  /**
   * Gets the time remaining until circuit can be retried (in milliseconds)
   * 
   * @param endpoint - Endpoint identifier
   * @returns Milliseconds until circuit can be retried, or 0 if circuit is not open
   */
  getTimeUntilRetry(endpoint: string): number {
    const circuit = this.getCircuit(endpoint);

    if (circuit.state !== 'open' || !circuit.openedAt) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - circuit.openedAt;
    const remaining = this.config.openDuration - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Gets current circuit state for an endpoint
   * 
   * @param endpoint - Endpoint identifier
   * @returns Current circuit state
   */
  getState(endpoint: string): CircuitState {
    const circuit = this.getCircuit(endpoint);
    const now = Date.now();

    // Clean up old failures and check if circuit should transition
    this.cleanupFailures(circuit, now);

    // Check if open circuit should transition to half-open
    if (circuit.state === 'open' && circuit.openedAt) {
      if (now - circuit.openedAt >= this.config.openDuration) {
        circuit.state = 'half-open';
        circuit.openedAt = null;
      }
    }

    return circuit.state;
  }

  /**
   * Resets circuit breaker for an endpoint (for testing/manual reset)
   * 
   * @param endpoint - Endpoint identifier
   */
  reset(endpoint: string): void {
    const circuit = this.getCircuit(endpoint);
    circuit.state = 'closed';
    circuit.failures = [];
    circuit.openedAt = null;
    circuit.consecutiveFailures = 0;
  }
}

/**
 * Extracts endpoint identifier from path
 * 
 * Maps API paths to circuit breaker keys:
 * - /v1/search -> 'search'
 * - /v1/chat -> 'chat'
 * - /v1/feedback -> 'feedback'
 * - /v1/me -> 'me'
 * - etc.
 * 
 * @param path - API path
 * @returns Endpoint identifier for circuit breaker
 */
export function getEndpointKey(path: string): string {
  // Extract endpoint from path (e.g., '/v1/search' -> 'search')
  const match = path.match(/\/v1\/([^/?]+)/);
  return match ? match[1] : 'default';
}

/**
 * Creates a circuit breaker error
 */
export function createCircuitBreakerError(
  _endpoint: string,
  timeUntilRetry: number
): {
  code: 'SERVICE_UNAVAILABLE';
  message: string;
  requestId: string;
  retryable: boolean;
  retryAfterSeconds: number;
} {
  const secondsUntilRetry = Math.ceil(timeUntilRetry / 1000);

  return {
    code: 'SERVICE_UNAVAILABLE',
    message: `Service temporarily unavailable. Circuit breaker is open. Retry in ${secondsUntilRetry}s.`,
    requestId: '', // Will be set by client
    retryable: true,
    retryAfterSeconds: secondsUntilRetry,
  };
}

