/**
 * Shared Types and Utilities
 * 
 * This package contains:
 * - Generated OpenAPI types (from openapi-typescript)
 * - Shared utility functions
 * - Common type definitions
 * - Environment variable type definitions (see ./types/env.d.ts)
 */

// Export generated OpenAPI types
export type {
  paths,
  webhooks,
  components,
  operations,
  $defs,
} from './types/generated/api';

// Type helpers for accessing schema types
import type { components } from './types/generated/api';

export type SearchRequest = components['schemas']['SearchRequest'];
export type SearchResponse = components['schemas']['SearchResponse'];
export type ChatRequest = components['schemas']['ChatRequest'];
export type ChatResponse = components['schemas']['ChatResponse'];
export type FeedbackRequest = components['schemas']['FeedbackRequest'];
export type FeedbackResponse = components['schemas']['FeedbackResponse'];
export type UserProfile = components['schemas']['UserProfile'];
export type FeatureFlags = components['schemas']['FeatureFlags'];
export type FlagsResponse = components['schemas']['FlagsResponse'];
export type HealthResponse = components['schemas']['HealthResponse'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type APIError = components['schemas']['APIError'];
export type Scope = components['schemas']['Scope'];
export type Source = components['schemas']['Source'];
export type SearchResult = components['schemas']['SearchResult'];
export type Citation = components['schemas']['Citation'];
export type ChatMessage = components['schemas']['ChatMessage'];

