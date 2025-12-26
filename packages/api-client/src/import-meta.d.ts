/// <reference types="vite/client" />

/**
 * Vite Environment Variable Type Definitions
 * 
 * Provides type safety for Vite environment variables accessed via
 * import.meta.env in the API client package.
 */

interface ImportMetaEnv {
  /**
   * Base URL for the API (e.g., 'https://api.vnlaw.app')
   * Required environment variable for API client configuration
   */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

