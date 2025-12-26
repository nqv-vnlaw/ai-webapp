/**
 * API Client Types
 * 
 * Re-exports types from @vnlaw/shared and defines client-specific configuration types.
 */

// Re-export API types from @vnlaw/shared
export type {
  SearchRequest,
  SearchResponse,
  ChatRequest,
  ChatResponse,
  FeedbackRequest,
  FeedbackResponse,
  UserProfile,
  FeatureFlags,
  FlagsResponse,
  HealthResponse,
  ErrorResponse,
  APIError,
  Scope,
  Source,
  SearchResult,
  Citation,
  ChatMessage,
  components,
  paths,
  operations,
} from '@vnlaw/shared';

/**
 * Configuration for the API client instance
 */
export interface ApiClientConfig {
  /**
   * Base URL for the API (e.g., 'https://api.vnlaw.app')
   */
  baseUrl: string;

  /**
   * Callback function to retrieve the access token (Kinde JWT)
   * Returns null if no token is available
   */
  getAccessToken: () => Promise<string | null>;
}

