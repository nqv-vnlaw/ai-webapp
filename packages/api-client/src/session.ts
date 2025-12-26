/**
 * Session and Request ID Management
 * 
 * Provides utilities for managing X-Session-Id (persisted per tab) and
 * generating X-Request-Id (unique per request).
 * 
 * Reference: SRS §7.5.1
 */

const SESSION_STORAGE_KEY = 'vnlaw_session_id';

/**
 * Gets or creates a session ID for the current browser tab.
 * 
 * The session ID is:
 * - Generated using crypto.randomUUID() (UUID v4)
 * - Stored in sessionStorage (per-tab, cleared on tab close)
 * - Reused across requests within the same tab session
 * 
 * @returns UUID v4 string for X-Session-Id header
 */
export function getSessionId(): string {
  // Check if sessionStorage is available (browser environment)
  if (typeof window === 'undefined' || !window.sessionStorage) {
    // Fallback for non-browser environments (e.g., SSR, tests)
    // Generate a new ID each time
    return crypto.randomUUID();
  }

  // Try to read existing session ID
  const existingId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  
  if (existingId) {
    // Validate it's a valid UUID format (basic check)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingId)) {
      return existingId;
    }
    // If invalid format, remove it and generate new one
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  // Generate new session ID
  const newSessionId = crypto.randomUUID();
  sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  
  return newSessionId;
}

/**
 * Generates a unique request ID for the current request.
 * 
 * Used for the optional X-Request-Id header to enable client-side
 * request correlation. Each call generates a new UUID v4.
 * 
 * @returns UUID v4 string for X-Request-Id header
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

