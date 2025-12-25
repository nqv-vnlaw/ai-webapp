# API Contracts

## 6. External Interface Requirements

### 6.0 Contract Governance (OpenAPI as Source of Truth)

The API contract is the foundation for parallel frontend/backend development. This section establishes governance rules to prevent drift and integration failures.

#### 6.0.1 OpenAPI Specification Rules

| Rule | Description |
|------|-------------|
| **Single Source of Truth** | `openapi.yaml` is the authoritative API contract |
| **Frontend Conformance** | MSW mocks MUST be generated/validated against the OpenAPI schema |
| **Backend Conformance** | Backend implementation MUST pass OpenAPI validation tests |
| **Version Bumping** | Any contract change requires: (1) update `openapi.yaml`, (2) bump spec version, (3) update both frontend mocks and backend |
| **Blocking Status** | Frontend API integration is BLOCKED until `openapi.yaml` exists and matches Section 6.2 |

#### 6.0.1.1 Toolchain Specification

**TypeScript Type Generation:**
- Use `openapi-typescript` to generate TypeScript types from `openapi.yaml`
- Output to `packages/shared/src/types/generated/api.ts`
- Command: `npx openapi-typescript "1. Research/openapi.yaml" -o packages/shared/src/types/generated/api.ts`

**Schema Validation:**
- Use Zod for runtime validation of API responses
- Manually maintain Zod schemas in `packages/shared/src/schemas/` that align with OpenAPI
- Use `.passthrough()` on Zod schemas to allow `_meta` and future fields

**MSW Mock Validation:**
- MSW handlers in `apps/precedent-search/src/mocks/handlers.ts`
- Mock responses MUST match the Zod schemas
- Use shared sample JSON files for consistency

#### 6.0.2 Canonical Error Contract

All non-2xx responses MUST use this schema (see Section 6.3 for full error codes):

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable summary",
    "requestId": "uuid-string",
    "details": {},
    "retryable": true,
    "retryAfterSeconds": 30
  }
}
```

**Frontend behavior MUST be driven by `error.code`**, not message string matching. This ensures consistent error handling regardless of message text changes.

#### 6.0.3 HTTP Status Code Mapping

| HTTP Status | Error Codes | Notes |
|-------------|-------------|-------|
| 400 | `INVALID_REQUEST`, `QUERY_TOO_LONG`, `VALIDATION_ERROR` | Client error, fix request |
| 401 | `AUTH_INVALID_TOKEN` | Re-authenticate required |
| 403 | `AUTH_DOMAIN_REJECTED`, `AUTH_GOOGLE_DISCONNECTED`, `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Check `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Backend error |
| 502 | `UPSTREAM_ERROR` | Dependency failure |
| 503 | `SERVICE_UNAVAILABLE`, `DATASTORE_UNAVAILABLE` | Temporary unavailable |
| 504 | `SEARCH_TIMEOUT`, `REQUEST_TIMEOUT` | Request timeout |
| 200 | (success) | All requested operations succeeded |
| 207 | (partial success) | Mixed success/failure across datastores |

**Partial Success (200 vs 207) - Deterministic Rule (Issue #13):**

Use HTTP **207 Multi-Status** when:
- Some datastores succeeded AND some failed
- `datastoreStatus` contains mixed success/error states

Use HTTP **200 OK** when:
- All requested datastores succeeded (even if warnings present)
- Single-datastore queries that succeed

**Examples:**
- Query `precedent` + `workspace`: precedent succeeds, workspace fails → **207**
- Query `precedent` only: succeeds → **200**
- Query `precedent` + `workspace`: both succeed → **200**

**Frontend behavior on 207:**
- Display available results with warning banner
- List failed datastores using `response.datastoreStatus[scope].error`
- Example: "⚠️ Workspace search unavailable. Google Workspace not connected."

**Schema Note:** Both 200 and 207 return `SearchResponse` or `ChatResponse` schema, NOT `APIErrorResponse`. There is no `SEARCH_PARTIAL_FAILURE` error code.

#### 6.0.4 Sample JSON Files (Recommended)

Developers MUST use the authoritative sample files located in `1. Research/samples/` for integration and mocking:

1. **Upstream Source (minimal):** `1. Research/samples/upstream_discovery_engine_answer_minimal.json` (raw Discovery Engine answer/reference shape)
2. **Downstream Target (minimal):** `1. Research/samples/search_response_success_minimal.json` (canonical `SearchResponse` output)
3. **Empty State:** `1. Research/samples/search_response_empty.json` (canonical `SearchResponse` empty results)

These samples reduce ambiguity and prevent field name mismatches.

### 6.1 Frontend routes (initial)

**MVP Routing Decision:** The combined search + chat page (`/`) is the canonical MVP implementation. Separate `/search` and `/chat` routes are post-MVP optional enhancements.

| Route | MVP | Description |
|-------|-----|-------------|
| `/` | ✅ Required | Combined search + chat (canonical) |
| `/callback` | ✅ Required | Kinde OAuth callback (handled by SDK) |
| `/access-denied` | ✅ Required | Domain rejection page |
| `/settings` | ✅ Required | Workspace connection status, user preferences |
| `/search` | ❌ Post-MVP | Dedicated search page (optional) |
| `/chat` | ❌ Post-MVP | Dedicated chat page (optional) |
| `/status` | ❌ Optional | Minimal diagnostics for debugging |

### 6.2 API Interface (Cloud Run BFF) — v1
**Versioning:** All endpoints are under `/v1`.

#### 6.2.0 CORS Preflight Handling

All endpoints MUST support `OPTIONS` method for CORS preflight requests.

**OPTIONS Response Headers:**
```http
Access-Control-Allow-Origin: {validated-origin}
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Session-Id, X-Request-Id
Access-Control-Max-Age: 86400
```

**Security:**
- Origin validation per Section 3.3.1 (production vs preview rules)
- Reject unrecognized origins with 403 Forbidden
- Log rejected origins as security events (see Section 7.5.3)

**Implementation Note:**
- Preflight handling typically implemented at gateway/middleware level, not per-route
- CORS validation MUST happen before authentication (OPTIONS requests don't include auth headers)
- Preflight responses don't require `Authorization` header

**Acceptance:**
- SPA can call all endpoints from allowed origins without CORS errors
- Rejected origins return 403 and are logged

**Reference:** Consolidated Review Issue #6

#### 6.2.1 Headers

**Required Headers (all endpoints except `/v1/health`):**
- `Authorization: Bearer <kinde_access_token>` — Required for all authenticated endpoints
- `X-Session-Id: <client-generated>` — Required; persisted in sessionStorage per tab
- `X-Request-Id: <uuid>` — Optional; if omitted, backend generates one

**Exception:** `/v1/health` is a public endpoint and does NOT require `Authorization` or `X-Session-Id`.

#### 6.2.1.1 Common Response Fields

**Request Identifiers:**
| Field | Format | Description | Required |
|-------|--------|-------------|----------|
| `requestId` | UUID v4 | Backend-generated unique identifier for this request | **MANDATORY** |
| `conversationId` | UUID v4 | Identifier for a chat conversation (persists across messages) | Conditional |
| `messageId` | UUID v4 | Unique identifier for an assistant message (for feedback) | Conditional |

**requestId (MANDATORY - Issue #10):**
- **Type:** `string` (UUID v4)
- **Source:** Backend-generated unique identifier for this request
- **Required:** EVERY response (success and error) MUST include `requestId`
- **Purpose:** Support, tracing, debugging
- **Display:** Frontend MUST show `requestId` to user in error states
- **Correlation:** If client sends `X-Request-Id` header, backend SHOULD log both for correlation (but always returns backend-generated `requestId` in response body)

**Example Response:**
```json
{
  "requestId": "7f3e4d2c-1a9b-4c5e-8f6d-2b3c4d5e6f7a",
  "data": { ... }
}
```

**Acceptance:** Every API call (including errors) returns `requestId` in JSON body.

**ID Clarification:**
- `X-Request-Id` (header): Client-generated UUID, sent with request for client-side correlation
- `requestId` (response): Backend-generated UUID, returned in all responses for server-side tracing
- **Display to users:** Always show the backend `requestId` from response (not the client header)
- **Logging:** Log both for full request tracing

**Optional `_meta` Field:**

API responses MAY include an optional `_meta` object with debugging/diagnostic information:
```json
{
  "_meta": {
    "durationMs": 1500,
    "totalResults": 69,
    "displayedResults": 5,
    "source": "Discovery Engine",
    "isDemoMode": false
  }
}
```

**Client Parsing Rules:**
- Clients SHOULD use non-strict/passthrough parsing (e.g., Zod `.passthrough()`) to allow unknown fields
- The `_meta` field is NOT part of the core contract and MAY be omitted
- Contents of `_meta` MAY change without version bump

#### 6.2.2 POST `/v1/search`
Request:
```json
{
  "query": "string",
  "scope": "precedent|infobank|both|workspace",
  "pageSize": 10,
  "cursor": "opaque|null"
}
```
Response (success):
```json
{
  "requestId": "string",
  "query": "string",
  "scope": "string",
  "status": "success|partial",
  "answer": "string|null",
  "results": [
    {
      "title": "string",
      "snippet": "string",
      "url": "string",
      "source": "precedent|infobank|workspace",
      "metadata": {
        "documentType": "judgment|decree|circular|internal|email|doc",
        "date": "YYYY-MM-DD",
        "court": "string",
        "caseNumber": "string",
        "jurisdiction": "civil|criminal|administrative|labor",
        "parties": ["string"],
        "judge": "string",
        "lastModified": "ISO-8601",
        "confidentiality": "internal|public",
        "language": "vi|en"
      }
    }
  ],
  "nextCursor": "opaque|null",
  "datastoreStatus": {
    "precedent": {"status": "success|error", "resultCount": 0, "error": "string|null"},
    "infobank": {"status": "success|error", "resultCount": 0, "error": "string|null"},
    "workspace": {"status": "success|error", "resultCount": 0, "error": "string|null"}
  },
  "warnings": ["string"],
  "auth": {
    "needsGoogleConnect": false,
    "connectUrl": null
  }
}
```

**Field Notes:**
- `datastoreStatus.resultCount`: Total matches in that datastore (may be approximate), not results returned in this page. Use for "X results found" display.

**Input Validation (Issue #19):**

Request body constraints:
- `query`: REQUIRED, string, `1 <= length <= 500`
- `scope`: REQUIRED, string, one of: `precedent`, `infobank`, `both`, `workspace`
- `pageSize`: OPTIONAL, integer, `1 <= value <= 50` (default: 10)
- `cursor`: OPTIONAL, string, `maxLength: 2048`

Validation errors:
- Query too long: `QUERY_TOO_LONG` (HTTP 400) - "Query exceeds 500 characters"
- Query empty: `VALIDATION_ERROR` (HTTP 400) - "Query is required"
- Invalid scope: `VALIDATION_ERROR` (HTTP 400) - "Invalid scope value"
- Invalid cursor: `VALIDATION_ERROR` (HTTP 400) - "Invalid or expired cursor"

**Security:**
Server-side validation is authoritative; client-side validation is UX only. Oversized inputs MUST be rejected to prevent DoS.

#### 6.2.3 POST `/v1/chat`
Request:
```json
{
  "conversationId": "string|null",
  "message": "string",
  "messages": [
    {"role": "user", "content": "Previous question"},
    {"role": "assistant", "content": "Previous answer"},
    {"role": "user", "content": "Current question"}
  ],
  "scope": "precedent|infobank|both|workspace",
  "regenerate": false
}
```

**Multi-turn Conversation Context:**
- Frontend sends the **full conversation history** in `messages[]` on every request
- Backend is stateless — it uses `messages[]` to understand context for follow-up questions
- `conversationId` is for client-side grouping and feedback correlation, NOT backend state lookup
- If `messages[]` is omitted, treated as a new single-turn conversation
- The `message` field contains the current user message (also included as last item in `messages[]`)

Response:
```json
{
  "requestId": "string",
  "conversationId": "string",
  "messageId": "string",
  "answer": "string",
  "citations": [
    {
      "title": "string",
      "url": "string",
      "snippet": "string|null",
      "source": "precedent|infobank|workspace"
    }
  ],
  "auth": {
    "needsGoogleConnect": false,
    "connectUrl": null
  },
  "contextLimitWarning": false
}
```

**Response Notes:**
- `messageId`: Unique identifier for this assistant response. Use this ID when submitting feedback via `/v1/feedback`.
- `contextLimitWarning`: If `true`, the conversation history was **truncated** due to LLM context window limits. Frontend SHOULD display a warning: "Long conversation — some earlier context may have been trimmed."

**Input Validation (Issue #19):**

Request body constraints:
- `message`: REQUIRED, string, `1 <= length <= 4000`
- `conversationId`: OPTIONAL, string (UUID v4 format)
- `scope`: REQUIRED, string, one of: `precedent`, `infobank`, `both`, `workspace`
- `messages`: OPTIONAL, array, `maxLength: 50` (conversation history)

Validation errors:
- Message too long: `VALIDATION_ERROR` (HTTP 400) with `details.field = "message"` - "Message exceeds 4000 characters"
- Message empty: `VALIDATION_ERROR` (HTTP 400) - "Message is required"
- Invalid scope: `VALIDATION_ERROR` (HTTP 400) - "Invalid scope value"
- Invalid conversationId format: `VALIDATION_ERROR` (HTTP 400) - "Invalid conversation ID format"

**Security:**
Server-side validation is authoritative; prevents DoS via oversized payloads. Client-side validation for UX only.

#### 6.2.4 POST `/v1/chat/stream` — POST-MVP (Deferred)

**Status:** ❌ Not implemented for MVP. Streaming will be added post-MVP when frontend is stable.

**Hook for Future:**
- Feature flag `STREAMING_ENABLED` controls availability
- When implemented, will use SSE with `fetch()` + `ReadableStream` (not `EventSource`)
- Detailed specification will be added to this section when work begins

**MVP Approach:** Use synchronous `/v1/chat` endpoint with loading indicator.

#### 6.2.5 POST `/v1/feedback`
Request:
```json
{
  "messageId": "string",
  "conversationId": "string",
  "type": "up|down",
  "comment": "string|null"
}
```
Response:
```json
{
  "requestId": "string",
  "status": "received"
}
```

#### 6.2.6 GET `/v1/me`
Returns current user status including Workspace connection state.
Response:
```json
{
  "requestId": "7f3e4d2c-1a9b-4c5e-8f6d-2b3c4d5e6f7a",
  "email": "user@vnlaw.com.vn",
  "name": "string|null",
  "picture": "string|null",
  "workspace": {
    "connected": true,
    "connectedEmail": "user@vnlaw.com.vn|null",
    "scopes": ["cloud_search"],
    "connectUrl": "string|null"
  }
}
```

**Scope Format Convention:**
- The `scopes` array uses **internal scope keys** (e.g., `"cloud_search"`) rather than full OAuth URIs
- Error responses (e.g., `AUTH_GOOGLE_DISCONNECTED`) also use internal scope keys in `details.requiredScopes`
- Mapping: `"cloud_search"` → `https://www.googleapis.com/auth/cloud_search.query`

#### 6.2.7 GET `/v1/flags`
Returns feature flags for the current user/environment.
Response:
```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "flags": {
    "WORKSPACE_SEARCH_ENABLED": false,
    "CHAT_HISTORY_ENABLED": false,
    "STREAMING_ENABLED": false,
    "FEEDBACK_ENABLED": true,
    "EXPORT_ENABLED": true,
    "INFOBANK_SEARCH_ENABLED": false
  }
}
```

**Note:** MVP defaults shown above. See `SRS/08-deployment.md` Section 12 for full flag documentation.

#### 6.2.8 GET `/v1/health`
Returns backend health and dependency status (no sensitive details).

**Auth requirement:** No authentication required (public endpoint for monitoring).

Response:
```json
{
  "requestId": "health-check-uuid-v4",
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "timestamp": "2025-12-23T10:00:00Z",
  "dependencies": {
    "discovery_engine": {"status": "up", "latencyMs": 50},
    "firestore": {"status": "up", "latencyMs": 10}
  }
}
```

#### 6.2.9 Citation Handling (Issue #9)

**Critical Rule:** Backend MUST deduplicate citations BEFORE returning response.

**Rationale:** LLM may reference citations by positional index (e.g., "[1]", "[2]") in the answer text. If frontend deduplicates citations, indices will shift and break the references.

**Backend Deduplication Logic:**
- Deduplicate by `(title, url)` tuple
- Preserve first occurrence
- If answer text contains index-based references, update indices after deduplication

**Recommended: Stable Citation IDs**

Instead of positional indices `[1]`, use stable citation IDs:

```json
{
  "answer": "See citation [cite_123] for details.",
  "citations": [
    {"id": "cite_123", "title": "Document Title", "url": "https://..."}
  ]
}
```

**Acceptance:**
- No index mismatches between answer text and citation panel
- Frontend does not perform deduplication logic

**Reference:** Consolidated Review Issue #9

#### 6.2.10 Canonical Result Model

**Purpose:** Ensure consistent field mapping between Discovery Engine responses and frontend expectations.

**Authoritative Fields (Frontend expects these):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Document title |
| `snippet` | string | Yes | Relevant excerpt (max 500 chars) |
| `url` | string | Yes | Document URL |
| `source` | enum | Yes | `precedent`\|`infobank`\|`workspace` |
| `metadata.documentType` | enum | No | `judgment`\|`decree`\|`circular`\|`internal`\|`email`\|`doc` |
| `metadata.date` | string | No | `YYYY-MM-DD` format |
| `metadata.court` | string | No | Court name (for precedent) |
| `metadata.caseNumber` | string | No | Case identifier |
| `metadata.jurisdiction` | enum | No | `civil`\|`criminal`\|`administrative`\|`labor` |
| `metadata.parties` | string[] | No | Party names |
| `metadata.judge` | string | No | Judge name |
| `metadata.lastModified` | string | No | ISO-8601 timestamp |
| `metadata.confidentiality` | enum | No | `internal`\|`public` |
| `metadata.language` | enum | No | `vi`\|`en` |

**Note:** The `metadata` object is always present (may be empty). All `metadata.*` fields are optional; BFF includes them when available from Discovery Engine.

**Adapter Responsibility:**
- Field mapping from Discovery Engine format to canonical format is the **BFF's responsibility**
- Frontend receives only the canonical format defined above
- If Discovery Engine uses different field names (e.g., `link` instead of `url`), BFF maps them
- Frontend does NOT contain any Discovery Engine-specific logic

**Example transformation (BFF responsibility):**
```python
# BFF maps Discovery Engine response to canonical format
def map_search_result(de_result: dict) -> dict:
    return {
        "title": de_result.get("document", {}).get("title", ""),
        "snippet": de_result.get("snippet", {}).get("text", ""),
        "url": de_result.get("document", {}).get("uri", ""),  # 'uri' → 'url'
        "source": determine_source(de_result),
        "metadata": extract_metadata(de_result)
    }
```

### 6.3 Standard error response schema

All endpoints return errors in the following format (see Section 6.0.2 for governance rules):

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable summary",
    "details": {},
    "requestId": "uuid-string",
    "retryable": true,
    "retryAfterSeconds": 30
  }
}
```

**Note:** `retryAfterSeconds` is in seconds (not milliseconds). See Section 6.6 for retry UX rules.

**Error codes (canonical list)**

| Code | HTTP | Description | Retryable |
|------|------|-------------|-----------|
| `AUTH_INVALID_TOKEN` | 401 | Token expired/invalid, re-authenticate | No |
| `AUTH_DOMAIN_REJECTED` | 403 | Email domain not allowed | No |
| `AUTH_GOOGLE_DISCONNECTED` | 403 | Google OAuth not linked; include `connectUrl` in details | No |
| `FORBIDDEN` | 403 | General access denied | No |
| `NOT_FOUND` | 404 | Resource not found | No |
| `VALIDATION_ERROR` | 400 | Request validation failed; details contains field errors | No |
| `INVALID_REQUEST` | 400 | Malformed request | No |
| `QUERY_TOO_LONG` | 400 | Query exceeds max length | No |
| `RATE_LIMITED` | 429 | Too many requests; check `Retry-After` header | Yes (1x) |
| `SEARCH_TIMEOUT` | 504 | Search operation timed out | Yes (2x) |
| `REQUEST_TIMEOUT` | 504 | Request timed out (search or chat) | Yes (2x) |
| `UPSTREAM_ERROR` | 502 | Dependency (Discovery Engine, etc.) failed | Yes (2x) |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Yes (3x) |
| `DATASTORE_UNAVAILABLE` | 503 | Specific datastore unavailable | Yes (3x) |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Yes (1x) |

**Special error details:**

For `AUTH_GOOGLE_DISCONNECTED`:
```json
{
  "error": {
    "code": "AUTH_GOOGLE_DISCONNECTED",
    "message": "Google Workspace not connected",
    "details": {
      "connectUrl": "https://api.vnlaw.app/v1/oauth/google/connect?redirect=..."
    },
    "requestId": "...",
    "retryable": false
  }
}
```

#### 6.3.1 Error Response Polymorphism (Issue #8)

While the standard error schema uses `details: object`, certain error codes have **typed** `details` structures that MUST be implemented consistently:

##### AUTH_GOOGLE_DISCONNECTED

When `error.code === "AUTH_GOOGLE_DISCONNECTED"`, the `details` field MUST contain:

```typescript
{
  code: "AUTH_GOOGLE_DISCONNECTED",
  message: "Google Workspace not connected",
  details: {
    connectUrl: string;        // REQUIRED: OAuth initiation URL
    requiredScopes?: string[]; // OPTIONAL: If re-consent needed
  },
  requestId: string,
  retryable: false
}
```

**OpenAPI Requirement:**
This MUST be modeled in OpenAPI using `oneOf` or `discriminator` on `error.code` to enable type-safe client generation. The goal is to eliminate runtime "cast to any" in frontend error handling.

**Example OpenAPI Schema:**
```yaml
ErrorResponse:
  oneOf:
    - $ref: '#/components/schemas/GenericError'
    - $ref: '#/components/schemas/AuthGoogleDisconnectedError'
  discriminator:
    propertyName: code
    mapping:
      AUTH_GOOGLE_DISCONNECTED: '#/components/schemas/AuthGoogleDisconnectedError'
```

### 6.4 Error Code → UX Mapping

| Error Code | User Message | Recommended Action | Auto-Retry |
|------------|--------------|-------------------|------------|
| `AUTH_INVALID_TOKEN` | "Your session has expired. Please sign in again." | Redirect to login | No |
| `AUTH_DOMAIN_REJECTED` | "Access is restricted to VNlaw employees." | Redirect to `/access-denied` | No |
| `AUTH_GOOGLE_DISCONNECTED` | "Connect your Google Workspace to search internal documents." | Show "Connect" button with `connectUrl` | No |
| `RATE_LIMITED` | "Too many requests. Please wait a moment." | Show countdown timer using `Retry-After` | Yes (1x) |
| `SEARCH_TIMEOUT` | "Search is taking longer than expected. Please try again." | Show "Retry" button | Yes (2x) |
| `REQUEST_TIMEOUT` | "Request timed out. Please try again." | Show "Retry" button (applies to search & chat) | Yes (2x) |
| `UPSTREAM_ERROR` | "A required service is temporarily unavailable." | Show "Retry" button | Yes (2x) |
| `SERVICE_UNAVAILABLE` | "Service temporarily unavailable. Retrying..." | Auto-retry with indicator | Yes (3x) |

| `DATASTORE_UNAVAILABLE` | "Some data sources are temporarily unavailable." | Show partial results if available | Yes (3x) |
| `INVALID_REQUEST` | "Invalid request. Please check your input." | Highlight invalid field | No |
| `VALIDATION_ERROR` | "Invalid request. Please check your input." | Highlight invalid fields from `details.fields` | No |
| `QUERY_TOO_LONG` | "Query is too long. Maximum 500 characters." | Show character count, truncate | No |
| `INTERNAL_ERROR` | "Something went wrong. Please try again later." | Show "Retry" button, log `requestId` | Yes (1x) |

**Partial Success UX (not an error):** When `SearchResponse.status === "partial"`, display: "Some results may be missing. Showing available results." Show results with warning banner. Check `datastoreStatus` for details on which datastores failed.

### 6.5 Rate Limiting (Issue #14)

##### Scope & Limits

**Authenticated endpoints** (`/v1/search`, `/v1/chat`, `/v1/feedback`, `/v1/me`):
- **Limit:** 60 requests per minute per authenticated user (Kinde user ID)
- **Burst allowance:** 10 requests (allows brief spikes)
- **Scope:** Per-user (not per-IP), keyed by Kinde user ID from token

**Health endpoint** (`/v1/health`):
- **Limit:** 10 requests per minute per IP address
- **Scope:** Per-IP (unauthenticated endpoint)

**OAuth endpoints** (public, see Section 16.1.1):
- **Limit:** 5 requests per minute per IP (prevents abuse)
- **Scope:** Per-IP (during auth flow, before full authentication)

##### Headers (RFC 6585)

All responses include:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1735141920
```

On 429 Too Many Requests:
```http
Retry-After: 37
```

**Important:** All values in seconds (NOT milliseconds). `X-RateLimit-Reset` is Unix epoch timestamp.

##### Frontend Behavior

See Section 6.6 (Retry UX Canon) for countdown timer and circuit breaker logic.

##### Implementation

- **Enforcement location:** Cloudflare edge (preferred) or Cloud Run middleware
- **Counter storage:** Cloudflare KV or Redis with sliding window algorithm
- **Granularity:** Per-minute sliding window (not fixed-window to avoid thundering herd)

**Acceptance:**
- Rate limits enforced consistently across all endpoints
- Headers present in all responses (including non-429)
- 429 responses include `Retry-After` header

### 6.6 Retry UX Canon

This section defines the canonical retry behavior for consistent UX across all error scenarios.

#### 6.6.1 Retry-After Header Precedence

When determining wait time for retryable errors:

1. **If `Retry-After` HTTP header is present** → use header value (seconds)
2. **Else if JSON `retryAfterSeconds` is present** → use JSON value
3. **Else** → use default backoff schedule from Section 7.2

**Important:** `Retry-After` header is always in **seconds**. JSON field `retryAfterSeconds` is also in seconds. There is no milliseconds field.

#### 6.6.2 Countdown Display Rules

- Show countdown in seconds: "Retry in 5s", "Retry in 4s", etc.
- Update countdown every second
- Show "Retry now" button alongside countdown (allows immediate retry)
- After countdown reaches 0, auto-retry once (if retryable)

#### 6.6.3 Circuit Breaker Scope

Circuit breaker state is **per-endpoint**, not global:

| Endpoint | Circuit Key | Independent |
|----------|-------------|-------------|
| `/v1/search` | `circuit:search` | ✅ |
| `/v1/chat` | `circuit:chat` | ✅ |
| `/v1/feedback` | `circuit:feedback` | ✅ |

**Rationale:** Opening the circuit for search should NOT block chat operations. Users can still chat even if search is temporarily unavailable.

#### 6.6.4 Retry Indicator UX

During automatic retries:
- Show spinner with "Retrying... (attempt 2 of 3)"
- If all retries exhausted, show "Retry" button + error message
- Always display `requestId` for support reference
