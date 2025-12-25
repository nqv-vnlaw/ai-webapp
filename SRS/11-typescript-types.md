# TypeScript Types

## 19. TypeScript Interface Definitions

**Note:** These types are an **initial stub** for development bootstrapping. Now that `openapi.yaml` exists (see `1. Research/openapi.yaml`), types MUST be generated from OpenAPI using `openapi-typescript`. The generated types in `packages/shared/src/types/generated/api.ts` become authoritative; these manual types should be removed or relegated to a reference file.

### 19.1 API Types

```typescript
// packages/shared/src/types/api.ts

// ============ Common Types ============

export type Scope = 'precedent' | 'infobank' | 'both' | 'workspace';
export type Source = 'precedent' | 'infobank' | 'workspace';
export type DocumentType = 'judgment' | 'decree' | 'circular' | 'internal' | 'email' | 'doc';
export type Jurisdiction = 'civil' | 'criminal' | 'administrative' | 'labor';
export type Language = 'vi' | 'en';
export type Confidentiality = 'internal' | 'public';

// ============ Search Types ============

export interface SearchRequest {
  query: string;
  scope: Scope;
  pageSize?: number;
  cursor?: string | null;
}

export interface ResultMetadata {
  documentType?: DocumentType;
  date?: string; // YYYY-MM-DD
  court?: string;
  caseNumber?: string;
  jurisdiction?: Jurisdiction;
  parties?: string[];
  judge?: string;
  lastModified?: string; // ISO-8601
  confidentiality?: Confidentiality;
  language?: Language;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: Source;
  metadata: ResultMetadata;
}

export interface DatastoreStatus {
  status: 'success' | 'error';
  resultCount: number;
  error?: string | null;
}

export interface AuthStatus {
  needsGoogleConnect: boolean;
  connectUrl?: string | null;
}

export interface SearchResponse {
  requestId: string;
  query: string;
  scope: Scope;
  status: 'success' | 'partial';
  answer?: string | null;
  results: SearchResult[];
  nextCursor?: string | null;
  datastoreStatus: {
    precedent: DatastoreStatus;
    infobank: DatastoreStatus;
    workspace: DatastoreStatus;
  };
  warnings?: string[];
  auth: AuthStatus;
  _meta?: Record<string, unknown>;
}

// ============ Chat Types ============

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  conversationId?: string | null;
  message: string;
  messages?: ChatMessage[];  // Full conversation history for multi-turn context
  scope: Scope;
  regenerate?: boolean;
}

export interface Citation {
  title: string;
  url: string;
  snippet?: string | null;
  source: Source;
}

export interface ChatResponse {
  requestId: string;
  conversationId: string;
  messageId: string;  // Use this ID for feedback submission
  answer: string;
  citations: Citation[];
  auth: AuthStatus;
  contextLimitWarning?: boolean;  // True if conversation was truncated
  _meta?: Record<string, unknown>;
}

// ============ SSE Event Types (POST-MVP) ============
// These types are placeholders for future streaming implementation.
// Do not implement until STREAMING_ENABLED feature is activated.

export interface SSEStartEvent {
  type: 'start';
  conversationId: string;
  messageId: string;
}

export interface SSETokenEvent {
  type: 'token';
  content: string;
}

export interface SSECitationEvent {
  type: 'citation';
  citation: Citation;
}

export interface SSEDoneEvent {
  type: 'done';
  requestId: string;
  conversationId: string;
}

export interface SSEErrorEvent {
  type: 'error';
  error: APIError;
}

export type SSEEvent =
  | SSEStartEvent
  | SSETokenEvent
  | SSECitationEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// ============ Error Types ============

export type ErrorCode =
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_DOMAIN_REJECTED'
  | 'AUTH_GOOGLE_DISCONNECTED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_REQUEST'
  | 'QUERY_TOO_LONG'
  | 'RATE_LIMITED'
  | 'SEARCH_TIMEOUT'
  | 'REQUEST_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATASTORE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

// Note: SEARCH_PARTIAL_FAILURE is NOT an error code. Partial success is returned
// as HTTP 200/207 with SearchResponse.status = "partial". See SRS/04-api-contracts.md Section 6.2.2.

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  retryable: boolean;
  retryAfterSeconds?: number | null;  // In seconds (not milliseconds)
}

export interface AuthGoogleDisconnectedDetails {
  connectUrl: string;
  requiredScopes?: string[];
}

export interface AuthGoogleDisconnectedError extends APIError {
  code: 'AUTH_GOOGLE_DISCONNECTED';
  details: AuthGoogleDisconnectedDetails;
}

export interface APIErrorResponse {
  error: APIError;
}

// ============ Health Types ============

export interface HealthResponse {
  requestId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  dependencies: {
    [key: string]: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
  };
}
```

### 19.2 Application State Types

```typescript
// packages/shared/src/types/state.ts

import type { SearchResult, Citation, Scope } from './api';

// ============ Auth State ============

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
}

// ============ Search State ============

export interface SearchState {
  query: string;
  scope: Scope;
  results: SearchResult[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============ Chat State ============

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isStreaming?: boolean;
  error?: string | null;
}

export interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

// ============ UI State ============

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  resultsPerPage: number;
  showCitationsPanel: boolean;
}

// ============ Feature Flags ============

export interface FeatureFlags {
  WORKSPACE_SEARCH_ENABLED: boolean;
  CHAT_HISTORY_ENABLED: boolean;
  STREAMING_ENABLED: boolean;
  FEEDBACK_ENABLED: boolean;
  EXPORT_ENABLED: boolean;
  INFOBANK_SEARCH_ENABLED: boolean;
}
```

### 19.3 Component Props Types

```typescript
// packages/shared/src/types/components.ts

import type { SearchResult, Citation, Scope } from './api';
import type { ChatMessage } from './state'; // ChatMessage is defined in state.ts, not api.ts

// ============ Search Components ============

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export interface ScopeSelectorProps {
  value: Scope;
  onChange: (scope: Scope) => void;
  disabled?: boolean;
  showWorkspace?: boolean;
}

export interface SearchResultCardProps {
  result: SearchResult;
  onClick?: () => void;
  isHighlighted?: boolean;
}

export interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
}

// ============ Chat Components ============

export interface ChatMessageProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onCopy?: () => void;
  showActions?: boolean;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export interface CitationsPanelProps {
  citations: Citation[];
  isLoading?: boolean;
  onCitationClick?: (citation: Citation) => void;
}

// ============ Feedback Components ============

export interface FeedbackButtonsProps {
  messageId: string;
  onFeedback: (type: 'up' | 'down', comment?: string) => void;
  isSubmitting?: boolean;
}
```
