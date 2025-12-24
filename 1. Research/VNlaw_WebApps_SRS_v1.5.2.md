# VNlaw Web Apps Frontend Platform — Software Requirements Specification (SRS)
**Document ID:** VNLAW-WEBAPPS-SRS
**Version:** 1.5.2 (AI-Agent Ready)
**Status:** Draft (Build-ready baseline)
**Primary application (App #1):** Precedent Search Bot (Web)
**Repository:** Separate frontend repository (monorepo) e.g., `vnlaw-webapps`
**Last updated:** 2025-12-24
**Format:** Optimized for AI-assisted development with phased implementation  

---

## 0. Executive Summary
VNlaw Web Apps is a **multi-application web frontend platform** deployed on **Netlify** and protected by **Cloudflare**, using **Kinde** for user authentication. The platform is **restricted to VNlaw Google Workspace users** (`@vnlaw.com.vn`). Business logic and sensitive credential handling remain in **GCP** using **Cloud Run (Python BFF)** and **Cloud Functions**, with optional persistence in **Firestore** (MVP) and **PostgreSQL** (Supabase or Neon) for longer-term product features.

A critical requirement is **dual-authentication** for Workspace-connected features:
- **Kinde token = identity & app access**
- **Google OAuth token(s) = access to Google Workspace data**  
The backend (Cloud Run BFF) is responsible for **mapping Kinde identity → stored Google tokens** (from Firestore `UserTokens`) and handling the OAuth “connect” flow as needed.

---

## 0.1 AI Build Pack (Quick Reference)

> **For AI coding agents:** This section provides authoritative references and blockers before implementation.

### Authoritative Contracts
| Artifact | Status | Location |
|----------|--------|----------|
| OpenAPI Spec (`openapi.yaml`) | ✅ Ready | `1. Research/openapi.yaml` |
| Wireframes/Mockups | 🟡 Recommended | Figma link TBD |
| This SRS | ✅ Ready | Current document |

**⚠️ OpenAPI Governance Rule:** Agents MUST use `openapi.yaml` as the single source of truth for API contracts. Any discrepancies between this SRS and the OpenAPI spec should be resolved by updating BOTH documents. See Section 6.0 for contract governance rules.

### MVP Scope Matrix
| Feature | MVP | Post-MVP | Feature Flag |
|---------|-----|----------|--------------|
| Search: `precedent` scope | ✅ | - | - |
| Search: `infobank` scope | ❌ | ✅ | `INFOBANK_SEARCH_ENABLED` |
| Search: `both` scope | ❌ | ✅ | Requires infobank |
| Search: `workspace` scope | ❌ | ✅ | `WORKSPACE_SEARCH_ENABLED` |
| Chat (non-streaming) | ✅ | - | - |
| Chat with streaming | ❌ | ✅ | `STREAMING_ENABLED` |
| Chat history persistence | ❌ | ✅ | `CHAT_HISTORY_ENABLED` |
| Feedback | ✅ | - | `FEEDBACK_ENABLED` |
| Export (Markdown) | ✅ | - | `EXPORT_ENABLED` |
| Export (PDF) | ❌ | ✅ | - |
| Demo Mode (MSW mocking) | ✅ | - | `VITE_DEMO_MODE` |

### Open Questions (Resolve Before Phase 2)
1. ~~OpenAPI spec location~~ → Resolved: `1. Research/openapi.yaml` exists and governs Section 6.2
2. ~~Wireframes/mockups~~ → Minimal set required for error states, empty states
3. Backend readiness: Confirm `/v1/search`, `/v1/chat`, `/v1/feedback` endpoints are deployed

### Critical Implementation Notes
- **SSE Streaming (Post-MVP):** Streaming is deferred to post-MVP. When implemented, cannot use `EventSource` (no Authorization header support). Must use `fetch()` + `ReadableStream`. See Section 6.2.4.
- **Demo Mode:** Frontend MUST work fully with MSW mocks before backend exists. Enable via `VITE_DEMO_MODE=true`. See Section 10.2.
- **Kinde Callback:** Provide a `/callback` route that renders a minimal "Signing you in..." page. The Kinde SDK processes the OAuth callback on this route. Do NOT leave `/callback` unhandled or it will render a 404.
- **Token Storage:** Kinde SDK stores tokens in memory; use silent refresh for session persistence across reloads. See Section 8.1.

---

## 1. Introduction

### 1.1 Purpose
This SRS specifies requirements for:
1) A **separate frontend repo** that can host multiple VNlaw web apps.
2) The first web app: **Precedent Search Bot (Web)** (search + chat + citations).
3) Integration patterns with existing and new backend components on GCP.

### 1.2 Scope
**In-scope**
- Multi-app frontend architecture (monorepo) hosted on Netlify.
- Authentication via Kinde with **domain restriction** to `@vnlaw.com.vn`.
- API integration with a GCP **Cloud Run Python BFF** (Pattern A, mandatory).
- Search + chat UX for the Precedent Search Bot (Web).
- Optional Workspace search UX (feature-flagged) including Google OAuth “connect” flow.
- Observability, error handling, testing, performance budgets, and deployment requirements.

**Out-of-scope**
- Rebuilding the underlying search engine, datastores, connectors, or model orchestration already running on GCP.
- Any end-user support processes and content governance policies (can be added later).

### 1.3 Definitions
- **BFF:** Backend-for-Frontend service that provides frontend-specific APIs (Cloud Run).
- **Kinde Token:** OIDC/JWT used to verify identity and authorize app access.
- **Google Token:** Google OAuth access/refresh tokens required for certain Google APIs (e.g., Cloud Search).
- **Workspace Connect:** User action to grant Google OAuth permissions for Workspace search features.
- **Scope:** Search corpus selection (precedent / infobank / both / workspace).
- **SSE:** Server-Sent Events for streaming chat responses.

---

## 2. Frontend Technology Stack (Recommended)

### 2.1 Frontend Framework: TypeScript + React + Vite
**Why selected**
- **Most mature ecosystem** for AI coding agents and development tools
- **Largest talent pool** and library support for enterprise legal applications
- **TypeScript** provides type safety and better API integration
- **Vite** produces highly optimized static builds (HTML, CSS, JS) compatible with all hosting providers
- **Fast iteration** and excellent debugging for search/chat applications with complex state
- Easiest integration with Kinde SDK and modern testing toolchain

**Core libraries recommended:**
- **TanStack Query** for API state management and caching
- **Zod** for runtime schema validation
- **shadcn/ui** for consistent component library
- **React Hook Form** for form management
- **Tailwind CSS** for styling

### 2.2 Alternative Frontend Options (Considered but not recommended)
- **SvelteKit**: Smaller codebase but less enterprise standard, potentially limited Kinde SDK maturity
- **Flutter Web**: Larger bundle sizes, feels "app-like" rather than web-native
- **Blazor WASM**: Heavier payloads, slower first load, fewer web UI libraries
- **Rust + WASM**: Smaller ecosystem, fewer ready-made UI components, steeper learning curve

### 2.3 Architecture Pattern: Single Page Application (SPA)
**Why SPA over SSR**
- All features behind authentication → SEO not a priority
- **Streaming responses** (SSE) and real-time chat easier in SPA context
- **Simpler deployment** as static assets to Netlify
- **Better separation** between frontend (Netlify) and backend (GCP)
- **Reduced complexity** compared to Next.js App Router patterns

### 2.4 Netlify (Frontend hosting + CI/CD)
**Why selected**
- **Zero-configuration deployment** with Vite (auto-detects `dist` output)
- **Git automation**: Connect repo, auto-runs `npm run build`, publishes to `dist`
- **Preview deployments** for PRs facilitate review of search/chat UX changes
- **Manual drag-and-drop** option for quick deployments
- **SPA redirect support** via `_redirects`: `/* /index.html 200` for React Router

**Configuration**
- Build command: `npm run build`
- Publish directory: `apps/precedent-search/dist` (monorepo path)
- Node version: current LTS (20.x)
- Environment variables: Kinde domain, API URLs, feature flags

**Alternative deployment platforms**
- **Vercel**: Zero-config Vite detection, similar workflow to Netlify
- **GCP Cloud Storage**: Manual upload of `dist` folder with website configuration
- **GCP Cloud Run**: Docker-based deployment with Nginx serving static files

---

## 3. Backend Technology Stack

### 3.1 Cloudflare (DNS + security perimeter)
**Why selected**
- Centralized DNS and domain management for `vnlaw.app`.
- WAF, DDoS mitigation, bot protection, rate-limiting at the edge.
- Simplifies multi-app routing and security policy enforcement across subdomains.

**Role**
- Authoritative DNS for `vnlaw.app`.
- Security gateway in front of Netlify and public APIs (if exposed).

### 3.2 Kinde (User management + authentication)
**Why selected**
- Managed OIDC authentication with Google login support.
- Enables **domain restriction** and scalable user/session management.
- Supports future roles/permissions (RBAC) for multiple apps.

**Role**
- Primary identity provider for VNlaw web apps.
- Issues access tokens consumed by backend services for authorization.

### 3.3 GCP Cloud Run + Cloud Functions (Backend)
**Why selected**
- Aligns with existing backend investment and production system.
- **Cloud Run** is ideal for the **Python BFF** (stable endpoints, scalable, containerized).
- **Cloud Functions** fit smaller services (OAuth callbacks, webhook-like endpoints, existing functions).

**Role**
- Cloud Run: the authoritative API surface for web apps; validates Kinde JWT; orchestrates search/chat; performs token lookups/exchange.
- Cloud Functions: existing services (e.g., OAuth token broker, proxies) and supporting endpoints.

**CORS Requirements (Backend):**

The BFF MUST implement dynamic CORS to allow requests from Netlify-hosted frontend:

**Allowed Origins (explicit allowlist):**
- `https://vnlaw.app` (production)
- `https://staging.vnlaw.app` (staging)
- `http://localhost:5173` (local development)
- `http://localhost:3000` (alternative local)

**Netlify Preview Handling (dynamic):**
```python
# Backend validates Origin header dynamically
ALLOWED_ORIGINS = [
    "https://vnlaw.app",
    "https://staging.vnlaw.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

def get_cors_origin(request):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        return origin
    # Allow Netlify preview deployments
    if origin and origin.endswith(".netlify.app"):
        return origin
    return None  # Reject unknown origins
```

**Required Headers:**
- `Access-Control-Allow-Origin`: Echo validated origin (NOT wildcard)
- `Access-Control-Allow-Headers`: `Authorization`, `X-Session-Id`, `X-Request-Id`, `Content-Type`
- `Access-Control-Allow-Methods`: `GET`, `POST`, `OPTIONS`
- `Access-Control-Max-Age`: `86400` (preflight cache)
- `Vary`: `Origin` (required when origin is dynamic)

Custom headers (`X-Session-Id`, `X-Request-Id`) trigger CORS preflight; backend MUST handle `OPTIONS` requests.

### 3.4 Firestore (MVP persistence)
**Why selected**
- Already in use for token storage and session-like state.
- Low friction for MVP features (chat history, feedback, lightweight metadata).

**Role**
- Stores `UserTokens` (Google OAuth tokens keyed by user email).
- Stores sessions/conversation metadata for MVP (optional but recommended).

### 3.5 PostgreSQL (Supabase or Neon) — Post-MVP or selective MVP
**Why selected**
- Strong relational model for cross-app data: analytics, auditing, conversation history at scale, feedback, permissions.
- Managed Postgres reduces operational load.
- Makes it easier to build reporting and admin tools later.

**Role**
- Optional system of record for durable product data across multiple VNlaw apps.
- **Not required to ship MVP**; can be introduced when persistence/reporting requirements mature.

### 3.6 GitHub (Source control)
**Why selected**
- Standard PR-based collaboration, code review, and CI integration.
- Works cleanly with Netlify deploy hooks and preview builds.

---

## 4. Architecture Overview (Pattern A — Mandatory)

### 4.1 Decision: Cloud Run BFF (Python) is the single frontend API
**Decision:** The platform will use **Pattern A: Cloud Run BFF**.  
Netlify serves UI; **all business logic** and sensitive operations are in GCP (Cloud Run/Functions).

**Rationale**
- Core orchestration is already Python-based; avoiding split-brain logic across Node (Netlify Functions) and Python reduces debugging cost.
- Enables a consistent security model (token validation, domain checks, rate limits, auditing).

### 4.2 High-level request flow
1. User browses `https://vnlaw.app` (Cloudflare → Netlify).
2. User signs in via Kinde (Google SSO).
3. Frontend calls `https://api.vnlaw.app` (Cloudflare → Cloud Run BFF).
4. Cloud Run BFF:
   - validates Kinde token
   - enforces domain restriction (`@vnlaw.com.vn`)
   - looks up any required Google OAuth tokens in Firestore `UserTokens`
   - executes search/chat via internal services
5. Returns JSON responses to frontend (including citations and pagination cursors).

### 4.3 Critical "Kinde ↔ Google token handoff"
**Problem addressed:** Kinde JWT cannot be used to query Google Workspace APIs.
**Requirement:** Cloud Run BFF must map Kinde identity to stored Google tokens.

**Rules**
- Kinde is the source of truth for "who is logged in".
- Google OAuth tokens are required only for Workspace-connected features.
- If tokens are missing/expired/insufficient scope, backend returns `AUTH_GOOGLE_DISCONNECTED` with a `connectUrl`.

### 4.3.1 Auth/Connect Behavior Pattern (Single Source of Truth)

When a request requires Google tokens and the user is disconnected, the backend follows ONE pattern:

**Pattern: Error Response with `AUTH_GOOGLE_DISCONNECTED`**

If Workspace scope is requested and Google tokens are unavailable:
1. Backend returns **HTTP 403** with error code `AUTH_GOOGLE_DISCONNECTED`
2. Error `details` includes `connectUrl` for OAuth flow
3. Frontend shows "Connect Google Workspace" prompt with the `connectUrl`

**The `auth` object in success responses** (`auth.needsGoogleConnect`, `auth.connectUrl`) is for **informational/proactive UI hints only** — not for blocking access. It allows the frontend to show a "Connect Workspace" option even when the current request succeeded (e.g., searching `precedent` scope while Workspace is disconnected).

**Rule:** Frontend MUST NOT use `auth.needsGoogleConnect` to block functionality. Only the `AUTH_GOOGLE_DISCONNECTED` error response triggers the connect flow.

### 4.4 Greenfield BFF Development (Parallel Development Safety)

**Requirement:** The Cloud Run BFF for web apps is a **new, separate service**.

**Rules**
- **DO NOT** modify the existing Chat Bot codebase (`main.py` or related files).
- The BFF is a **greenfield service** deployed independently.
- **Initial development:** May vendor/copy relevant logic (e.g., Discovery Engine client setup, search parsing) from existing codebase as starting point.
- **Future consolidation:** Plan to extract shared code into a common package after BFF is stable, to prevent drift between services.
- Both services (existing bot + new BFF) operate in parallel with no shared runtime state.

**Rationale:** This ensures the existing production Chat Bot remains stable and unaffected during web app development.

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization
**FR-AUTH-01 Login:** The app shall require users to authenticate via Kinde (Google login).
**FR-AUTH-02 Domain restriction:** The app shall only allow users with email domain `vnlaw.com.vn`.
**FR-AUTH-03 Session persistence:** The app shall maintain a session across page reloads using Kinde SDK's silent refresh mechanism. Access tokens remain in memory (not localStorage); session persistence is achieved via secure session cookie managed by Kinde SDK.
**FR-AUTH-04 API auth:** The app shall send Kinde access tokens to the backend in `Authorization: Bearer <token>`.
**FR-AUTH-05 Google token linking (Workspace):** For Workspace features, the app shall detect if the backend indicates missing Google OAuth credentials and shall redirect the user to the backend-provided `connectUrl` to complete Google OAuth and link the credential to the current Kinde session.
**FR-AUTH-06 Session timeout:** The app shall attempt silent token refresh before expiry; on failure, prompt re-login and return to the previous route after successful re-authentication.

**Implementation Note:** Do NOT store access tokens in localStorage. Rely on Kinde SDK's built-in session management for security. See Section 8.1 for state storage details.

### 5.2 Precedent Search (App #1 Core)
**FR-SEARCH-01 Query input:** Provide a query input supporting free-text legal queries.  
**FR-SEARCH-02 Scope selection:** Provide a scope selector. **MVP:** Only `precedent` scope enabled. **Post-MVP (feature-flagged):** `infobank`, `both`, `workspace`. Default is `precedent`. UI should hide disabled scopes or show them as "coming soon".  
**FR-SEARCH-03 Search execution:** Submit query + scope to the backend and display results.  
**FR-SEARCH-04 Results display:** Each result displays title, snippet, source indicator, and link.  
**FR-SEARCH-05 Pagination:** Support “Load more” using opaque cursors/tokens returned by backend.  
**FR-SEARCH-06 Empty state:** If no results, show guidance and alternative suggestions.  
**FR-SEARCH-07 Query validation:** Reject empty queries; enforce max query length (500 chars).

### 5.3 Chat (Answer + Citations)
**FR-CHAT-01 Ask question:** Provide a chat UI for question-answering and follow-ups.
**FR-CHAT-02 Answer display:** Render answers with loading state. MVP uses non-streaming `/v1/chat` endpoint.
**FR-CHAT-03 Citations:** Display citations/sources returned by backend (title + URL + optional snippet).
**FR-CHAT-04 Conversation state:** Maintain conversation history in-session; optionally persist via backend.
**FR-CHAT-05 Regenerate answer:** Allow "Regenerate" for the latest assistant message (backend flag `regenerate: true`).
**FR-CHAT-06 Copy/export:** Allow copying answer text and exporting conversation (Markdown for MVP; PDF optional later).

#### 5.3.1 Citation Rendering Rules (FR-CHAT-03 Details)

**Deduplication:** Citations with identical URLs SHALL be deduplicated; display only the first occurrence.

**Ordering:** Citations appear in order of first mention/return from the API (preserve API order).

**Accumulation:** Citations are displayed in a sidebar/panel. On mobile, citations panel becomes a collapsible bottom sheet.

**Display per citation:**
- Title (required)
- Source badge (precedent/infobank/workspace)
- Snippet preview if available (truncated to ~100 chars)
- Clickable URL (opens in new tab)

**Empty state:** If no citations returned, hide citations panel or show "No sources cited" message.

### 5.4 Workspace Search (Feature-flagged)
**FR-WS-01 Connect flow:** If Workspace scope is selected and backend returns `AUTH_GOOGLE_DISCONNECTED`, the app shall present a "Connect Google Workspace" prompt and redirect to `connectUrl`.
**FR-WS-02 Status display:** Show Workspace connection status (connected/disconnected) and connected Google account email if provided.
**FR-WS-03 OAuth error handling:** Gracefully handle cancel/denial and return user to the app with a message.
**FR-WS-04 Disconnect (optional):** Provide a disconnect action if backend supports revoking tokens.
**FR-WS-05 Post-connect verification:** After Google OAuth callback returns to the app, the frontend SHALL call `/v1/me` to verify `workspace.connected === true` before updating the UI to show "Connected" status. If verification fails, show error message with retry option.

**OAuth Return Handling:**
- Backend redirects to `/settings?workspace_connected=1` (or configured return URL) after successful OAuth.
- Frontend detects query parameter and calls `/v1/me` to confirm connection status.
- On confirmation failure, show "Connection verification failed. Please try again." with retry button.

### 5.5 Feedback
**FR-FB-01 Feedback:** Provide thumbs up/down on answers with optional comment and send to backend.  
**FR-FB-02 No PII leakage:** Feedback payload must not include full tokens or sensitive headers.

---

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
| 504 | `SEARCH_TIMEOUT` | Request timeout |
| 200/207 | (success with `status: "partial"`) | Partial success, check `datastoreStatus` |

**Partial Success Clarification:** HTTP 200 or 207 with `SearchResponse.status = "partial"` is a **success response**, not an error response. The response body follows `SearchResponse` schema, not `APIErrorResponse`. Frontend should display available results with a warning banner. There is no `SEARCH_PARTIAL_FAILURE` error code.

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

#### 6.2.1 Headers

**Required Headers (all endpoints except `/v1/health`):**
- `Authorization: Bearer <kinde_access_token>` — Required for all authenticated endpoints
- `X-Session-Id: <client-generated>` — Required; persisted in sessionStorage per tab
- `X-Request-Id: <uuid>` — Optional; if omitted, backend generates one

**Exception:** `/v1/health` is a public endpoint and does NOT require `Authorization` or `X-Session-Id`.

#### 6.2.1.1 Common Response Fields

**Request Identifiers:**
| Field | Format | Description |
|-------|--------|-------------|
| `requestId` | UUID v4 | Unique identifier generated by backend for each API call. Used for tracing and support. |
| `conversationId` | `conv_<random>` | Identifier for a chat conversation. Persists across messages in a conversation. |
| `messageId` | `msg_<random>` | Unique identifier for an assistant message. Use for feedback submission. |

**Important:** `requestId` MUST be a valid UUID v4 string and MUST be unique per API request. Frontend should display `requestId` for all errors to enable support investigations.

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

**Note:** MVP defaults shown above. See Section 12 for full flag documentation.

#### 6.2.8 GET `/v1/health`
Returns backend health and dependency status (no sensitive details).

**Auth requirement:** No authentication required (public endpoint for monitoring).

Response:
```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "timestamp": "2025-12-23T10:00:00Z",
  "dependencies": {
    "discovery_engine": {"status": "up", "latencyMs": 50},
    "firestore": {"status": "up", "latencyMs": 10}
  }
}
```

#### 6.2.9 Canonical Result Model

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

### 6.4 Error Code → UX Mapping

| Error Code | User Message | Recommended Action | Auto-Retry |
|------------|--------------|-------------------|------------|
| `AUTH_INVALID_TOKEN` | "Your session has expired. Please sign in again." | Redirect to login | No |
| `AUTH_DOMAIN_REJECTED` | "Access is restricted to VNlaw employees." | Redirect to `/access-denied` | No |
| `AUTH_GOOGLE_DISCONNECTED` | "Connect your Google Workspace to search internal documents." | Show "Connect" button with `connectUrl` | No |
| `RATE_LIMITED` | "Too many requests. Please wait a moment." | Show countdown timer using `Retry-After` | Yes (1x) |
| `SEARCH_TIMEOUT` | "Search is taking longer than expected. Please try again." | Show "Retry" button | Yes (2x) |
| `UPSTREAM_ERROR` | "A required service is temporarily unavailable." | Show "Retry" button | Yes (2x) |
| `SERVICE_UNAVAILABLE` | "Service temporarily unavailable. Retrying..." | Auto-retry with indicator | Yes (3x) |

| `DATASTORE_UNAVAILABLE` | "Some data sources are temporarily unavailable." | Show partial results if available | Yes (3x) |
| `INVALID_REQUEST` | "Invalid request. Please check your input." | Highlight invalid field | No |
| `VALIDATION_ERROR` | "Invalid request. Please check your input." | Highlight invalid fields from `details.fields` | No |
| `QUERY_TOO_LONG` | "Query is too long. Maximum 500 characters." | Show character count, truncate | No |
| `INTERNAL_ERROR` | "Something went wrong. Please try again later." | Show "Retry" button, log `requestId` | Yes (1x) |

**Partial Success UX (not an error):** When `SearchResponse.status === "partial"`, display: "Some results may be missing. Showing available results." Show results with warning banner. Check `datastoreStatus` for details on which datastores failed.

### 6.5 Rate limiting headers
All API responses include:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (Unix epoch seconds)
- `Retry-After` (on 429, in seconds)

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

---

## 7. Non-Functional Requirements

### 7.1 Performance targets
- TTI < 3.5s (4G throttling test)
- LCP < 2.5s
- CLS < 0.1
- Search results render < 500ms after API response received
- Streaming token display < 50ms per event

**Bundle budgets**
- Initial JS bundle < 200KB gzipped (target)
- Lazy chunks < 50KB gzipped (target)

### 7.2 Reliability & resiliency
**FR-ERR-01 Automatic retry:** Retry retryable errors with exponential backoff.  
**FR-ERR-02 Retry UI:** Display “Retrying…” indicator during automatic retries.  
**FR-ERR-03 Manual retry:** Provide manual retry after max retries exceeded.  

Retry matrix (by HTTP status or error code):
| Status/Code | Max Retries | Backoff Schedule |
|-------------|-------------|------------------|
| 429 `RATE_LIMITED` | 1 | Wait `Retry-After` header |
| 500 `INTERNAL_ERROR` | 1 | 2s |
| 502 `UPSTREAM_ERROR` | 2 | 2s, 4s |
| 503 `SERVICE_UNAVAILABLE` | 3 | 1s, 2s, 4s |
| 504 `SEARCH_TIMEOUT` | 2 | 2s, 4s |

**Retry Decision:** Use `error.retryable` field as authoritative; the table above provides default backoff when `retryAfterSeconds` is not provided.

**Circuit breaker**
- After 5 consecutive failures within 60s, open circuit for 30s.
- During open state, show countdown + “Try now” option.

### 7.3 Security

#### 7.3.1 Enforcement Boundaries

**Critical Rule:** Frontend checks are **UX only**, not security boundaries.

| Check | Frontend (UX) | Backend (Security) |
|-------|---------------|-------------------|
| Domain restriction | Shows friendly error | **MUST reject** non-domain users |
| Token validation | Redirects to login | **MUST validate** JWT signature |
| Rate limiting | Shows countdown | **MUST enforce** limits |
| Workspace permissions | Shows "Connect" button | **MUST verify** Google tokens |

The BFF **MUST reject** unauthorized requests regardless of frontend behavior. Frontend validation is for user experience only.

#### 7.3.2 Token Security

- Enforce HTTPS everywhere
- Frontend must never store or log full JWTs (log only last 8 characters if needed)
- Access tokens remain **in memory only**; do NOT use localStorage for tokens
- Rely on Kinde SDK's silent refresh for session persistence

#### 7.3.3 Content Security Policy

Apply CSP baseline (adjust for staging/preview domains as needed):

```
default-src 'self';
script-src 'self' https://cdn.kinde.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.vnlaw.app https://*.kinde.com https://*.netlify.app;
frame-ancestors 'none';
form-action 'self';
```

**Notes:**
- `connect-src` includes `*.netlify.app` for preview deployments
- Kinde may use regional domains; validate in staging and update as needed
- **No wildcards** except for verified Kinde/Netlify domains

#### 7.3.4 PII Protection

- Do not log PII in client logs
- Redact emails in logs (show only domain, e.g., `***@vnlaw.com.vn`)
- Never log request/response bodies in production (see Section 7.5)

#### 7.3.5 Markdown/HTML Rendering (XSS Prevention)

Chat answers and search snippets may contain Markdown. To prevent XSS:
- **MUST** sanitize all Markdown output before rendering (use DOMPurify or equivalent)
- **MUST NOT** allow raw HTML in Markdown (disable `allowDangerousHtml`)
- **MUST** escape any user-generated content before display

#### 7.3.6 External Link Security

Citations and document links open external URLs (Google Drive, etc.):
- **MUST** use `target="_blank"` with `rel="noopener noreferrer"` for all external links
- **SHOULD** validate URL host against expected domains (e.g., `drive.google.com`, `docs.google.com`)
- **SHOULD** warn user if URL host is unexpected before navigation

#### 7.3.7 Demo Mode Production Guard

Demo Mode (`VITE_DEMO_MODE=true`) uses MSW to intercept all API calls. This is dangerous in production:
- **MUST** fail build if `VITE_ENV=production` AND `VITE_DEMO_MODE=true`
- Add CI check: `if [[ "$VITE_ENV" == "production" && "$VITE_DEMO_MODE" == "true" ]]; then exit 1; fi`
- Demo Mode banner MUST be visible when active

#### 7.3.8 Recent Searches Privacy

Storing recent searches in localStorage can expose sensitive legal queries:
- Store only **query preview** (first 50 chars) or **hash** of full query
- Consider using **sessionStorage** instead of localStorage for higher privacy
- Provide user option to disable search history

### 7.4 Accessibility
- WCAG 2.1 AA target for core flows.
- Full keyboard navigation for search, chat, citations, modals.

### 7.5 Observability

#### 7.5.1 Client-Side Identifiers

- **Session ID:** Generate `X-Session-Id` on app load; persist in sessionStorage; send on every API request
- **Request ID:** Generate `X-Request-Id` (UUID) for each API call; include in logs and display for errors
- Both IDs must be generated even in **Demo Mode** to ensure correlation plumbing is tested

#### 7.5.2 Structured Event Logging

Log structured events (PII-safe) for:
- Navigation events (route changes)
- Search submit/complete (query length, scope, result count, duration)
- Chat send/complete (scope, citation count, duration)
- Auth events (login, logout, token refresh)
- Errors (code, requestId, retryable)

#### 7.5.3 Production Logging Restrictions

**CRITICAL:** In production builds:
- **NEVER** log request/response bodies for `/v1/chat` (may contain sensitive legal content)
- **NEVER** log full JWTs or authorization headers
- Log only: method, path, status code, duration, requestId, error code (if error)
- Structured metadata only; no raw payloads

#### 7.5.4 Support Reference

- Surface backend `requestId` in UI for all errors
- Format: "Error ID: {requestId}" with copy button
- Users can provide this ID to support for investigation

---

## 8. State Management & Caching

### 8.1 State categories

| State | Storage | Persistence | Notes |
|---|---|---|---|
| Auth tokens | **Memory only** | Session (via silent refresh) | Kinde SDK manages; never use localStorage |
| Session ID | sessionStorage | Tab session | Generated on app load |
| UI prefs | localStorage | Long-lived | Theme, results per page, etc. |
| Search state | URL params + memory | Navigation | Enables shareable URLs |
| Chat thread | Memory | Session | Optionally persist via backend |
| Response cache | TanStack Query | Session | Stale-while-revalidate |
| Recent searches | localStorage | Per user | Max 10 entries; store preview only (first 50 chars) |

**Auth Clarification:** Access tokens are stored in memory by Kinde SDK. Session persistence across page reloads is achieved via Kinde's silent refresh mechanism (uses secure cookies internally). Do NOT store tokens in localStorage.

### 8.2 URL state (required)

**MVP URL Pattern:** Since `/` is the canonical MVP page (combined search + chat), query parameters are on the root URL:
- `/?q=<query>&scope=precedent` — search with query
- `/?q=<query>&scope=precedent&cid=<conversationId>` — chat in context

**Rules:**
- Search query reflected in URL parameters
- Back/forward navigation must work correctly
- URLs are shareable internally (subject to auth)
- Do NOT use `/search?q=...` for MVP — that route is post-MVP

### 8.3 Caching rules
- Search responses: TTL 5 minutes; stale-while-revalidate 5 minutes.
- Never cache error responses.
- Show “cached results from …” warning when serving stale cache due to backend failure.

---

## 9. Chat Persistence (MVP vs Post-MVP)

### 9.1 MVP recommendation
- Persist conversation summaries or full messages in **Firestore** (optional toggle).
- Benefits: lowest operational overhead and matches existing GCP setup.

### 9.2 Post-MVP
- Introduce PostgreSQL (Supabase/Neon) when:
  - cross-app reporting is needed
  - complex queries/auditing required
  - long-term retention policies mature

---

## 10. Testing Requirements

### 10.1 Unit testing
- Tooling: **Vitest** + Testing Library (Vitest integrates natively with Vite)
- Coverage targets:
  - shared packages: 80%
  - app logic: 70%
  - UI components: 60%

### 10.2 Integration Testing & Demo Mode

#### 10.2.1 Demo Mode (Mandatory for Standalone Development)

The frontend MUST work fully with MSW mocks before any backend is available. This enables parallel development and comprehensive UI testing.

**Configuration:**
- Enable via `VITE_DEMO_MODE=true` environment variable
- **Visual indicator:** Display "Demo Mode" banner in header when active
- In Demo Mode, all API calls are intercepted by MSW; no real backend required

**Mock Coverage Required:**

| Scenario | Endpoint | Mock Response |
|----------|----------|---------------|
| Search success | `POST /v1/search` | 2-5 results with metadata |
| Search empty | `POST /v1/search` | Empty results array |
| Search partial failure | `POST /v1/search` | `status: "partial"` with warnings |
| Chat response | `POST /v1/chat` | Full answer with 2-3 citations |
| User profile | `GET /v1/me` | Mock user with workspace status |
| Feature flags | `GET /v1/flags` | MVP-appropriate flags |
| Error: 401 | Any | `AUTH_INVALID_TOKEN` |
| Error: 403 domain | Any | `AUTH_DOMAIN_REJECTED` |
| Error: 403 workspace | `/v1/search` (workspace) | `AUTH_GOOGLE_DISCONNECTED` with `connectUrl` |
| Error: 429 | Any | `RATE_LIMITED` with `retryAfterSeconds: 30` |
| Error: 500 | Any | `INTERNAL_ERROR` |
| Error: 503 | Any | `SERVICE_UNAVAILABLE` |

**Latency Simulation:**
- Add random delay (200-800ms) to all mock responses
- Simulates real network conditions for UX testing

**Mock Identity:**
- In Demo Mode, use a mock authenticated user (do not skip auth plumbing)
- Mock user: `demo@vnlaw.com.vn`, name: "Demo User"
- This ensures auth UI components are tested even without real Kinde

#### 10.2.2 Integration Testing (with MSW)

- Use MSW for API mocking in all integration tests
- Validate: auth flows, all scopes, chat multi-turn, error scenarios
- Test all error codes from Section 6.3 with appropriate UI responses

### 10.3 E2E testing
- Tool: Playwright (recommended)
- P0 scenarios: login, domain rejection, basic search, chat with citations, logout
- Run smoke tests on every PR; nightly full suite

### 10.4 Performance & accessibility testing
- Lighthouse CI on PRs (target score ≥ 80 perf, ≥ 90 accessibility)
- axe-core checks for key pages/components

---

## 11. Mobile & Responsive Requirements
Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px.  
- Touch targets ≥ 44×44px
- Citations panel becomes bottom sheet on mobile
- Reduce results per page on mobile (e.g., 5) if needed

---

## 12. Feature Flags
Feature flags evaluated at app init (from `/v1/flags` endpoint or build-time env).

**MVP Defaults:**
| Flag | MVP Default | Post-MVP | Description |
|------|-------------|----------|-------------|
| `WORKSPACE_SEARCH_ENABLED` | `false` | `true` | Workspace scope in search |
| `CHAT_HISTORY_ENABLED` | `false` | `true` | Persist conversations |
| `STREAMING_ENABLED` | `false` | `true` | SSE streaming for chat |
| `FEEDBACK_ENABLED` | `true` | `true` | Thumbs up/down on answers |
| `EXPORT_ENABLED` | `true` | `true` | Markdown export |
| `INFOBANK_SEARCH_ENABLED` | `false` | `true` | Infobank scope in search |

**Important:** `STREAMING_ENABLED` is `false` for MVP because streaming is deferred to post-MVP. MVP uses the synchronous `/v1/chat` endpoint.

**Disabled feature behavior:**
- Hide UI controls entirely
- If invoked programmatically, show friendly message (no broken state)

---

## 13. Deployment & Environments

### 13.1 Environments

| Environment | URL | Auth | Backend |
|-------------|-----|------|---------|
| Dev (local) | `http://localhost:5173` | Kinde (dev tenant) | Local or Demo Mode |
| Preview (PR) | `*.netlify.app` | **Demo Mode only** | MSW mocks |
| Staging | `staging.vnlaw.app` | Kinde (staging tenant) | `api-staging.vnlaw.app` |
| Production | `vnlaw.app` | Kinde (prod tenant) | `api.vnlaw.app` |

### 13.2 Preview Auth Strategy (Option B — Staging URL)

**Problem:** Kinde OAuth cannot authenticate arbitrary `*.netlify.app` URLs because callback URLs must be pre-registered. Adding dynamic preview URLs is impractical.

**Solution:** Use Demo Mode for all Netlify deploy previews. Real authentication testing occurs only on the staging branch deploy (`staging.vnlaw.app`).

| Deploy Type | URL Pattern | Auth Method | Notes |
|-------------|-------------|-------------|-------|
| PR preview | `deploy-preview-123--vnlaw-app.netlify.app` | Demo Mode | No Kinde; MSW mocks all API responses |
| Staging branch | `staging.vnlaw.app` | Real Kinde | Pre-registered in Kinde staging tenant |
| Production | `vnlaw.app` | Real Kinde | Pre-registered in Kinde prod tenant |

**Kinde Callback URL Configuration:**
- Staging tenant: `https://staging.vnlaw.app/callback`
- Production tenant: `https://vnlaw.app/callback`
- Dev tenant: `http://localhost:5173/callback`

**Workflow:**
1. **PR previews** — Developers/reviewers use Demo Mode; focus on UI/UX, not auth flows
2. **Staging** — QA tests real auth and API integration on `staging.vnlaw.app`
3. **Production** — Release after staging verification

### 13.3 Netlify Config Expectations
- **PR previews:** Auto-deploy with `VITE_DEMO_MODE=true` (no real auth)
- **Branch deploy for staging:** `develop` branch → `staging.vnlaw.app` with real Kinde
- **Production deploy:** `main` branch → `vnlaw.app` with real Kinde
- Environment variables per deploy context (see Section 20.3)

### 13.4 Cloudflare Expectations
- DNS + SSL/TLS for `vnlaw.app` and `api.vnlaw.app`
- WAF + rate limiting policies
- Optional: Access policies for internal-only routes

---

## 14. Migration & Compatibility (V1 Chat Bot → Web App)
- Web app is a separate UI; backend should remain shared or parallelized safely.
- Bot can include a link to the web app for discoverability (post-launch).
- Future: conversation portability (optional) if IDs are unified.

---

## 15. MVP Acceptance Criteria (App #1: Precedent Search Bot Web)
MVP is accepted when:
1) Only `@vnlaw.com.vn` users can access after login.
2) Search works for Precedent scope: results show title/snippet/link.
3) Chat answers display with citations (when available).
4) Errors show user-friendly messages; retry works for transient failures.
5) `vnlaw.app` is served via Cloudflare → Netlify, and API calls go to Cloud Run BFF.

---

## 16. Required Next Artifacts

### 16.1 Blocking Artifacts (Required Before Phase 2)

| Artifact | Status | Owner | Notes |
|----------|--------|-------|-------|
| `openapi.yaml` | ✅ Complete | IT | Located at `1. Research/openapi.yaml`; governs Section 6.2 |
| Sample JSON files | ✅ Complete | IT | Located at `1. Research/samples/` |

### 16.2 Recommended Artifacts

1. **Frontend monorepo scaffolding** with:
   - `apps/precedent-search/` — main application
   - `packages/ui/` — shared UI components
   - `packages/api-client/` — typed API client
   - `packages/auth/` — Kinde integration
   - `packages/shared/` — shared types and utilities

3. **MSW mock handlers** implementing all scenarios from Section 10.2.1

4. **Minimal wireframes** for:
   - Combined search + chat layout
   - Empty state (no results, no conversations)
   - Error states (auth, network, rate limit)
   - Workspace connect flow
   - Mobile responsive views

5. **Sample JSON files** (sanitized):
   - Discovery Engine search response (1-2 results)
   - Empty results response
   - Error response examples (AUTH_*, RATE_LIMITED, INTERNAL_ERROR)

---

## 17. Implementation Phases (AI-Agent Ready)

This section breaks down the MVP into sequential, atomic phases suitable for AI-assisted development. Each phase has clear entry/exit criteria and testable deliverables.

### 17.1 Phase 1: Project Scaffolding (Foundation)

**Goal:** Deployable skeleton with authentication working

**Prerequisites:** None

**Tasks (in order):**
- [ ] Initialize Vite + React + TypeScript project with monorepo structure
- [ ] Configure Tailwind CSS and install shadcn/ui
- [ ] Set up ESLint, Prettier, and TypeScript strict mode
- [ ] Install and configure Kinde React SDK
- [ ] Implement login/logout flow with Google SSO
- [ ] Add domain restriction check (`@vnlaw.com.vn`)
- [ ] Create protected route wrapper component
- [ ] Implement `/access-denied` page
- [ ] Create basic layout shell (header, main, footer)
- [ ] Configure Netlify deployment with `_redirects` for SPA
- [ ] Set up environment variables for Kinde

**Key Files to Create:**
```
apps/precedent-search/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── index.tsx
│   │   └── access-denied.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── common/
│   │       └── Button.tsx
│   ├── lib/
│   │   └── kinde.ts
│   └── hooks/
│       └── useAuth.ts
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

**Exit Criteria:**
- [ ] User can visit `vnlaw.app` and see login button
- [ ] User can authenticate via Google (Kinde)
- [ ] Non-`@vnlaw.com.vn` users are redirected to `/access-denied`
- [ ] Authenticated users see empty dashboard
- [ ] Logout works and clears session
- [ ] Site deploys successfully to Netlify

**Requirement Coverage:** FR-AUTH-01, FR-AUTH-02, FR-AUTH-03

**PR Boundary:** Single PR titled `feat: project scaffolding with Kinde auth`

**Verification Commands:**
```bash
# Build passes
npm run build

# Lint passes
npm run lint

# Type check passes
npm run typecheck

# Dev server starts
npm run dev

# Manual verification: Login flow works in browser
```

**Ticket Template:**
```
## Goal
Set up project foundation with authentication

## Files Changed
- apps/precedent-search/src/**
- packages/auth/src/**
- netlify.toml, package.json, tsconfig.json

## API Touchpoints
None (auth only)

## Acceptance Checks
- [ ] `@vnlaw.com.vn` user can log in
- [ ] Other domains redirected to /access-denied
- [ ] Logout clears session
- [ ] Deployed to Netlify preview

## Tests Added
- [ ] Auth hook unit tests
- [ ] ProtectedRoute component test
```

---

### 17.2 Phase 2: API Client & Core Infrastructure

**Goal:** Typed API client with authentication headers and error handling

**Prerequisites:** Phase 1 complete

**Tasks (in order):**
- [ ] Create `packages/api-client` package
- [ ] Define TypeScript interfaces for all API requests/responses
- [ ] Implement base fetch wrapper with Kinde token injection
- [ ] Add `X-Session-Id` header generation and persistence
- [ ] Implement standard error response handling
- [ ] Create retry logic with exponential backoff
- [ ] Add circuit breaker pattern
- [ ] Set up TanStack Query provider and configuration
- [ ] Create API hooks: `useSearch`, `useChat` (note: `useChatStream` is post-MVP)
- [ ] Add rate limit header parsing and display

**Key Files to Create:**
```
packages/api-client/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── types.ts
│   ├── errors.ts
│   └── hooks/
│       ├── useSearch.ts
│       ├── useChat.ts
│       └── useChatStream.ts
└── package.json
```

**Exit Criteria:**
- [ ] API client sends Kinde token in `Authorization` header
- [ ] API client sends `X-Session-Id` on every request
- [ ] Error responses are parsed into typed objects
- [ ] Retry logic works for 503/504 errors
- [ ] Circuit breaker opens after 5 consecutive failures

**Requirement Coverage:** FR-AUTH-04, FR-ERR-01, FR-ERR-02, FR-ERR-03

**PR Boundary:** Single PR titled `feat: API client with retry and circuit breaker`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npm run test -- --filter=api-client
```

**Ticket Template:**
```
## Goal
Create typed API client with error handling

## Files Changed
- packages/api-client/src/**

## API Touchpoints
- POST /v1/search (types only)
- POST /v1/chat (types only)
- POST /v1/chat/stream (types only)

## Acceptance Checks
- [ ] API client injects Authorization header
- [ ] X-Session-Id generated and persisted
- [ ] Retry logic for 503/504 errors
- [ ] Circuit breaker opens after 5 failures

## Tests Added
- [ ] API client unit tests (80% coverage)
- [ ] Retry logic tests
- [ ] Circuit breaker tests
```

---

### 17.3 Phase 3: Search Feature

**Goal:** Complete search functionality with results display

**Prerequisites:** Phase 2 complete

**Tasks (in order):**
- [ ] Create `SearchInput` component with validation
- [ ] Create `ScopeSelector` component (precedent only for MVP)
- [ ] Create `SearchResults` container component
- [ ] Create `SearchResultCard` component with metadata display
- [ ] Implement URL state sync (`/?q=...&scope=...`) — see Section 8.2 for MVP URL pattern
- [ ] Add "Load more" pagination with cursor support
- [ ] Create empty state component with suggestions
- [ ] Create loading skeleton components
- [ ] Add search history to localStorage (store preview only per Section 7.3.8)
- [ ] Implement query length validation (max 500 chars)

**Key Files to Create:**
```
apps/precedent-search/src/
├── routes/
│   └── search.tsx (or update index.tsx)
├── components/
│   └── search/
│       ├── SearchInput.tsx
│       ├── ScopeSelector.tsx
│       ├── SearchResults.tsx
│       ├── SearchResultCard.tsx
│       ├── SearchEmpty.tsx
│       ├── SearchSkeleton.tsx
│       └── index.ts
└── hooks/
    └── useSearchParams.ts
```

**Exit Criteria:**
- [ ] User can enter a query and see results
- [ ] Results display title, snippet, source, and link
- [ ] "Load more" loads additional results
- [ ] Empty queries are rejected
- [ ] Queries > 500 chars show error
- [ ] URL reflects current search state
- [ ] Browser back/forward works correctly

**Requirement Coverage:** FR-SEARCH-01 through FR-SEARCH-07

**PR Boundary:** Single PR titled `feat: search UI with results and pagination`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npm run test -- --filter=search
# E2E: npm run e2e -- --grep="search"
```

---

### 17.4 Phase 4: Chat Feature (Non-Streaming MVP)

**Goal:** Question-answering interface with citations using non-streaming `/v1/chat` endpoint

**Prerequisites:** Phase 3 complete

**Note:** SSE streaming (`/v1/chat/stream`) is deferred to post-MVP. MVP uses the synchronous `/v1/chat` endpoint.

**Tasks (in order):**
- [ ] Create `ChatContainer` component
- [ ] Create `ChatMessage` component (user/assistant variants)
- [ ] Create `ChatInput` component with submit handling
- [ ] Implement loading state with "Generating answer..." indicator
- [ ] Create `CitationsPanel` component (see Section 5.3.1 for rendering rules)
- [ ] Create `CitationCard` component
- [ ] Add conversation state management (in-memory)
- [ ] Implement "Regenerate" button functionality
- [ ] Add copy-to-clipboard for answers
- [ ] Create markdown export functionality
- [ ] Handle API errors gracefully (show error with retry option)

**Key Files to Create:**
```
apps/precedent-search/src/
├── components/
│   └── chat/
│       ├── ChatContainer.tsx
│       ├── ChatMessage.tsx
│       ├── ChatInput.tsx
│       ├── ChatSkeleton.tsx
│       └── index.ts
│   └── citations/
│       ├── CitationsPanel.tsx
│       ├── CitationCard.tsx
│       └── index.ts
└── hooks/
    └── useChat.ts
```

**Exit Criteria:**
- [ ] User can ask questions and see answers
- [ ] Loading state shows "Generating answer..." during API call
- [ ] Citations appear in sidebar after response received (deduplicated, ordered per Section 5.3.1)
- [ ] "Regenerate" re-fetches the last answer
- [ ] Copy button works for answer text
- [ ] API errors show user-friendly message with retry option

**Requirement Coverage:** FR-CHAT-01 through FR-CHAT-06

**PR Boundary:** Single PR titled `feat: chat UI with citations (non-streaming)`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npm run test -- --filter=chat
# E2E: npm run e2e -- --grep="chat"
```

**Post-MVP Enhancement:** Add SSE streaming support when `STREAMING_ENABLED` flag is true. See Section 6.2.4 for streaming implementation notes.

---

### 17.5 Phase 5: Error Handling & Feedback

**Goal:** Production-ready error handling and user feedback

**Prerequisites:** Phase 4 complete

**Tasks (in order):**
- [ ] Create global error boundary component
- [ ] Create toast/notification system for errors
- [ ] Implement "Retrying..." indicator during auto-retry
- [ ] Add manual retry buttons after max retries
- [ ] Create circuit breaker UI (countdown + "Try now")
- [ ] Implement feedback component (thumbs up/down)
- [ ] Add optional comment input for feedback
- [ ] Create feedback submission API call
- [ ] Ensure no PII in feedback payload
- [ ] Add `requestId` display for support

**Key Files to Create:**
```
apps/precedent-search/src/
├── components/
│   ├── error/
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorToast.tsx
│   │   ├── RetryIndicator.tsx
│   │   └── CircuitBreakerUI.tsx
│   └── feedback/
│       ├── FeedbackButtons.tsx
│       ├── FeedbackModal.tsx
│       └── index.ts
└── hooks/
    └── useFeedback.ts
```

**Exit Criteria:**
- [ ] Network errors show user-friendly messages
- [ ] "Retrying..." appears during automatic retries
- [ ] Manual retry available after max retries
- [ ] Circuit breaker shows countdown when open
- [ ] Thumbs up/down works on answers
- [ ] Feedback submission succeeds
- [ ] Request ID visible for support

**Requirement Coverage:** FR-ERR-01 through FR-ERR-03, FR-FB-01, FR-FB-02

**PR Boundary:** Single PR titled `feat: error handling, feedback, and resilience`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npm run test -- --filter=error --filter=feedback
```

---

### 17.6 Phase 6: Polish & Responsive Design

**Goal:** Mobile-responsive UI and accessibility compliance

**Prerequisites:** Phase 5 complete

**Tasks (in order):**
- [ ] Add responsive breakpoints to all components
- [ ] Convert citations panel to bottom sheet on mobile
- [ ] Ensure touch targets ≥ 44×44px
- [ ] Add keyboard navigation to all interactive elements
- [ ] Run axe-core and fix accessibility issues
- [ ] Add focus indicators and ARIA labels
- [ ] Optimize bundle size (code splitting)
- [ ] Add loading states for all async operations
- [ ] Implement "cached results" warning display
- [ ] Add session timeout handling

**Exit Criteria:**
- [ ] UI works on mobile, tablet, and desktop
- [ ] All interactive elements are keyboard accessible
- [ ] axe-core reports no critical violations
- [ ] Initial bundle < 200KB gzipped
- [ ] Touch targets meet minimum size
- [ ] Cached results show warning indicator

**Requirement Coverage:** Section 11 (Mobile), Section 7.4 (Accessibility), FR-AUTH-06

**PR Boundary:** Single PR titled `feat: responsive design and accessibility`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npx lighthouse --output=json --chrome-flags="--headless" http://localhost:5173
npm run test:a11y  # axe-core checks
```

---

### 17.7 Phase 7: Testing & Quality Gates

**Goal:** Test coverage and CI/CD pipeline

**Prerequisites:** Phase 6 complete

**Tasks (in order):**
- [ ] Set up Vitest with Testing Library
- [ ] Write unit tests for API client (80% coverage)
- [ ] Write unit tests for hooks (70% coverage)
- [ ] Write component tests (60% coverage)
- [ ] Set up MSW for API mocking in tests
- [ ] Write integration tests for auth flow
- [ ] Write integration tests for search flow
- [ ] Write integration tests for chat flow
- [ ] Set up Playwright for E2E tests
- [ ] Write P0 E2E scenarios (login, search, chat, logout)
- [ ] Configure Lighthouse CI on PRs
- [ ] Set up GitHub Actions for CI

**Key Files to Create:**
```
apps/precedent-search/
├── src/
│   └── __tests__/
│       ├── setup.ts
│       └── mocks/
│           └── handlers.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── search.spec.ts
│   └── chat.spec.ts
├── playwright.config.ts
└── vitest.config.ts
```

**Exit Criteria:**
- [ ] Unit test coverage meets targets
- [ ] All P0 E2E scenarios pass
- [ ] Lighthouse score ≥ 80 performance, ≥ 90 accessibility
- [ ] CI runs tests on every PR
- [ ] No critical security vulnerabilities

**Requirement Coverage:** Section 10 (Testing Requirements)

**PR Boundary:** Single PR titled `feat: complete test suite and CI/CD pipeline`

**Verification Commands:**
```bash
# All tests pass
npm run test
npm run test:coverage

# E2E tests pass
npm run e2e

# Lighthouse CI
npm run lighthouse:ci

# Security audit
npm audit --audit-level=high
```

---

### 17.8 Implementation Dependencies Graph

```
Phase 1 (Scaffolding)
    │
    ▼
Phase 2 (API Client)
    │
    ▼
Phase 3 (Search) ──────────┐
    │                      │
    ▼                      │
Phase 4 (Chat) ◄───────────┘
    │
    ▼
Phase 5 (Error Handling)
    │
    ▼
Phase 6 (Polish)
    │
    ▼
Phase 7 (Testing)
```

---

## 18. Project Structure Specification

### 18.1 Monorepo Structure

```
vnlaw-webapps/
├── apps/
│   └── precedent-search/           # Main application
│       ├── src/
│       │   ├── main.tsx            # Entry point
│       │   ├── App.tsx             # Root component with providers
│       │   ├── routes/             # Page components
│       │   │   ├── index.tsx       # / - Combined search + chat
│       │   │   ├── access-denied.tsx
│       │   │   └── settings.tsx    # Required (Workspace connection, user prefs)
│       │   ├── components/         # Feature components
│       │   │   ├── layout/
│       │   │   ├── search/
│       │   │   ├── chat/
│       │   │   ├── citations/
│       │   │   ├── feedback/
│       │   │   ├── error/
│       │   │   └── common/
│       │   ├── hooks/              # App-specific hooks
│       │   ├── stores/             # State management
│       │   ├── utils/              # App utilities
│       │   └── styles/             # Global styles
│       ├── public/                 # Static assets
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── ui/                         # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── package.json
│   ├── api-client/                 # Typed API client
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── auth/                       # Kinde integration
│   │   ├── src/
│   │   │   ├── provider.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── guards.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/                     # Shared types and utilities
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── index.ts
│       └── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── netlify.toml
├── package.json                    # Root package.json (pnpm workspaces)
├── pnpm-workspace.yaml             # pnpm workspace configuration
├── pnpm-lock.yaml                  # pnpm lockfile
├── tsconfig.base.json              # Shared TypeScript config
└── README.md
```

### 18.2 Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `SearchInput.tsx` |
| Hooks | camelCase with `use` prefix | `useSearch.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `SearchResult` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_QUERY_LENGTH` |
| CSS classes | kebab-case (Tailwind) | `search-input` |
| Test files | `*.test.ts` or `*.spec.ts` | `SearchInput.test.tsx` |

---

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
  | 'UPSTREAM_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATASTORE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

// Note: SEARCH_PARTIAL_FAILURE is NOT an error code. Partial success is returned
// as HTTP 200/207 with SearchResponse.status = "partial". See Section 6.2.2.

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  retryable: boolean;
  retryAfterSeconds?: number | null;  // In seconds (not milliseconds)
}

export interface APIErrorResponse {
  error: APIError;
}

// ============ Health Types ============

export interface HealthResponse {
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

---

## 20. Environment Configuration

### 20.1 Environment Variables

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `VITE_KINDE_DOMAIN` | Kinde tenant domain | Yes | - | `vnlaw.kinde.com` |
| `VITE_KINDE_CLIENT_ID` | Kinde application client ID | Yes | - | `abc123...` |
| `VITE_KINDE_REDIRECT_URI` | OAuth callback URL | Yes | - | `https://vnlaw.app/callback` |
| `VITE_KINDE_LOGOUT_URI` | Post-logout redirect URL | Yes | - | `https://vnlaw.app` |
| `VITE_API_BASE_URL` | Cloud Run BFF base URL | Yes | - | `https://api.vnlaw.app` |
| `VITE_ALLOWED_DOMAIN` | Allowed email domain | Yes | - | `vnlaw.com.vn` |
| `VITE_DEMO_MODE` | Enable Demo Mode with MSW mocks | No | `false` | `true` |
| `VITE_SESSION_STORAGE_KEY` | Key for session ID storage | No | `vnlaw_session_id` | - |
| `VITE_FEATURE_FLAGS_URL` | Remote feature flags endpoint | No | - | `https://api.vnlaw.app/v1/flags` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | No | - | `https://...@sentry.io/...` |
| `VITE_GA_TRACKING_ID` | Google Analytics ID | No | - | `G-XXXXXXXXXX` |
| `VITE_ENABLE_DEV_TOOLS` | Enable React DevTools in prod | No | `false` | `true` |

**Demo Mode Note:** When `VITE_DEMO_MODE=true`, the app uses MSW to intercept all API calls. A "Demo Mode" banner is displayed in the header. See Section 10.2.1 for mock requirements.

### 20.2 Environment Files

```bash
# .env.example (committed to repo)
VITE_KINDE_DOMAIN=
VITE_KINDE_CLIENT_ID=
VITE_KINDE_REDIRECT_URI=
VITE_KINDE_LOGOUT_URI=
VITE_API_BASE_URL=
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=false

# .env.local (local development - not committed)
VITE_KINDE_DOMAIN=vnlaw-dev.kinde.com
VITE_KINDE_CLIENT_ID=dev_client_id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8080
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=true  # Enable Demo Mode for local development without backend

# .env.demo (standalone frontend development - committed)
VITE_KINDE_DOMAIN=vnlaw-dev.kinde.com
VITE_KINDE_CLIENT_ID=dev_client_id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5173  # Not used in demo mode
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=true

# .env.staging (Netlify staging environment)
VITE_KINDE_DOMAIN=vnlaw-staging.kinde.com
VITE_KINDE_CLIENT_ID=staging_client_id
VITE_KINDE_REDIRECT_URI=https://staging.vnlaw.app/callback
VITE_KINDE_LOGOUT_URI=https://staging.vnlaw.app
VITE_API_BASE_URL=https://api-staging.vnlaw.app
VITE_ALLOWED_DOMAIN=vnlaw.com.vn

# .env.production (Netlify production environment)
VITE_KINDE_DOMAIN=vnlaw.kinde.com
VITE_KINDE_CLIENT_ID=prod_client_id
VITE_KINDE_REDIRECT_URI=https://vnlaw.app/callback
VITE_KINDE_LOGOUT_URI=https://vnlaw.app
VITE_API_BASE_URL=https://api.vnlaw.app
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### 20.3 Netlify Configuration

```toml
# netlify.toml

[build]
  command = "npm run build"
  publish = "apps/precedent-search/dist"

[build.environment]
  NODE_VERSION = "20"

# SPA redirect for React Router
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://cdn.kinde.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.vnlaw.app https://*.kinde.com; frame-ancestors 'none'; form-action 'self'"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Deploy contexts
[context.production]
  environment = { VITE_ENV = "production", VITE_DEMO_MODE = "false" }

[context.staging]
  # staging.vnlaw.app branch deploy - uses real Kinde auth
  environment = { VITE_ENV = "staging", VITE_DEMO_MODE = "false" }

[context.deploy-preview]
  # PR previews use Demo Mode (no real auth - see Section 13.2)
  environment = { VITE_ENV = "preview", VITE_DEMO_MODE = "true" }
```

---

## 21. Acceptance Checklists

### 21.1 MVP Feature Checklist

| # | Feature | Requirements | Status |
|---|---------|--------------|--------|
| 1 | Domain-restricted login | FR-AUTH-01, FR-AUTH-02 | ☐ |
| 2 | Session persistence | FR-AUTH-03 | ☐ |
| 3 | Token-based API auth | FR-AUTH-04 | ☐ |
| 4 | Search with precedent scope | FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03 | ☐ |
| 5 | Search results display | FR-SEARCH-04 | ☐ |
| 6 | Search pagination | FR-SEARCH-05 | ☐ |
| 7 | Empty state handling | FR-SEARCH-06 | ☐ |
| 8 | Query validation | FR-SEARCH-07 | ☐ |
| 9 | Chat question input | FR-CHAT-01 | ☐ |
| 10 | Chat answer display | FR-CHAT-02 | ☐ |
| 11 | Citations display | FR-CHAT-03 | ☐ |
| 12 | Conversation state | FR-CHAT-04 | ☐ |
| 13 | Regenerate answer | FR-CHAT-05 | ☐ |
| 14 | Copy/export | FR-CHAT-06 | ☐ |
| 15 | Automatic retry | FR-ERR-01 | ☐ |
| 16 | Retry UI | FR-ERR-02 | ☐ |
| 17 | Manual retry | FR-ERR-03 | ☐ |
| 18 | Feedback buttons | FR-FB-01 | ☐ |
| 19 | PII protection | FR-FB-02 | ☐ |

### 21.2 Non-Functional Checklist

| # | Requirement | Target | Status |
|---|-------------|--------|--------|
| 1 | TTI (4G throttling) | < 3.5s | ☐ |
| 2 | LCP | < 2.5s | ☐ |
| 3 | CLS | < 0.1 | ☐ |
| 4 | Initial JS bundle | < 200KB gzip | ☐ |
| 5 | Lighthouse performance | ≥ 80 | ☐ |
| 6 | Lighthouse accessibility | ≥ 90 | ☐ |
| 7 | Unit test coverage (packages) | 80% | ☐ |
| 8 | Unit test coverage (app) | 70% | ☐ |
| 9 | Unit test coverage (UI) | 60% | ☐ |
| 10 | E2E P0 scenarios passing | 100% | ☐ |
| 11 | WCAG 2.1 AA compliance | Core flows | ☐ |
| 12 | Mobile responsive | All pages | ☐ |

---

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial draft |
| 1.1.0 | 2025-12-21 | Added implementation phases |
| 1.2.0 | 2025-12-22 | Added TypeScript interfaces, environment config |
| 1.3.0 | 2025-12-22 | AI-Agent ready optimizations |
| 1.4.0 | 2025-12-23 | Contract governance, Demo Mode, non-streaming MVP, security clarifications |
| 1.5.0 | 2025-12-24 | Critical contract fixes: added `messageId` to chat response, fixed `retryAfterSeconds` type, completed ErrorCode union, removed SEARCH_PARTIAL_FAILURE from error codes (partial is success), clarified `/v1/health` auth exception, corrected feature flag defaults, unified URL routing to `/`, defined `requestId` as UUID v4, documented `_meta` field policy, standardized scope format, added security requirements (XSS, external links, Demo Mode guard), added toolchain specification, clarified auth/connect pattern, added CORS requirements |
| 1.5.1 | 2025-12-24 | Consistency fixes: fixed section numbering (6.4/6.5), fixed Phase 3 URL pattern, made `/settings` consistently Required, clarified Netlify publish dir for monorepo, removed invalid JSON comments, added `INFOBANK_SEARCH_ENABLED` to FeatureFlags type, completed retry matrix with 502, expanded canonical result model, added CSP/HSTS to netlify.toml, aligned recent searches with privacy guidance, clarified requestId vs X-Request-Id, picked pnpm + Vitest, marked Section 19 types as stub |
| 1.5.2 | 2025-12-24 | Design decisions implemented: (1) Generated `openapi.yaml` from Section 6.2 — now ✅ Ready; (2) Multi-turn chat uses stateless `messages[]` array with `contextLimitWarning` field; (3) SSE streaming marked as POST-MVP deferred with hook for future; (4) Added dynamic CORS origin validation pattern for `*.netlify.app` previews; (5) Preview auth strategy: PR previews use Demo Mode, `staging.vnlaw.app` uses real Kinde auth; (6) Referenced authoritative sample JSON files by path; (7) Corrected OpenAPI/tooling notes for the now-present spec |

*End of SRS v1.5.2*
