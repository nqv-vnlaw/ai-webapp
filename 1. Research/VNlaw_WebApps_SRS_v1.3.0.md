# VNlaw Web Apps Frontend Platform — Software Requirements Specification (SRS)
**Document ID:** VNLAW-WEBAPPS-SRS
**Version:** 1.3.0 (AI-Agent Ready)
**Status:** Draft (Build-ready baseline)
**Primary application (App #1):** Precedent Search Bot (Web)
**Repository:** Separate frontend repository (monorepo) e.g., `vnlaw-webapps`
**Last updated:** 2025-12-22
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
| OpenAPI Spec (`openapi.yaml`) | 🔴 **BLOCKING** | Must be created before Phase 2 |
| Wireframes/Mockups | 🟡 Recommended | Figma link TBD |
| This SRS | ✅ Ready | Current document |

### MVP Scope Matrix
| Feature | MVP | Post-MVP | Feature Flag |
|---------|-----|----------|--------------|
| Search: `precedent` scope | ✅ | - | - |
| Search: `infobank` scope | ❌ | ✅ | `INFOBANK_SEARCH_ENABLED` |
| Search: `both` scope | ❌ | ✅ | Requires infobank |
| Search: `workspace` scope | ❌ | ✅ | `WORKSPACE_SEARCH_ENABLED` |
| Chat with streaming | ✅ | - | `STREAMING_ENABLED` |
| Chat history persistence | ❌ | ✅ | `CHAT_HISTORY_ENABLED` |
| Feedback | ✅ | - | `FEEDBACK_ENABLED` |
| Export (Markdown) | ✅ | - | `EXPORT_ENABLED` |
| Export (PDF) | ❌ | ✅ | - |

### Open Questions (Resolve Before Phase 2)
1. ~~OpenAPI spec location~~ → Must be created
2. ~~Wireframes/mockups~~ → Minimal set required for error states, empty states
3. Backend readiness: Confirm `/v1/search`, `/v1/chat/stream`, `/v1/feedback` endpoints are deployed

### Critical Implementation Notes
- **SSE Streaming:** Cannot use `EventSource` (no Authorization header support). Must use `fetch()` + `ReadableStream`. See Section 6.2.4.
- **Kinde Callback:** The `/callback` route is handled automatically by Kinde SDK; no explicit route component needed.
- **Token Storage:** Kinde SDK stores tokens in memory by default (recommended for security).

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
- Publish directory: `dist`
- Node version: current LTS
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
- Kinde is the source of truth for “who is logged in”.
- Google OAuth tokens are required only for Workspace-connected features.
- If tokens are missing/expired/insufficient scope, backend returns `AUTH_GOOGLE_DISCONNECTED` with a `connectUrl`.

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization
**FR-AUTH-01 Login:** The app shall require users to authenticate via Kinde (Google login).  
**FR-AUTH-02 Domain restriction:** The app shall only allow users with email domain `vnlaw.com.vn`.  
**FR-AUTH-03 Session:** The app shall maintain a session across page reloads and support logout.  
**FR-AUTH-04 API auth:** The app shall send Kinde access tokens to the backend in `Authorization: Bearer <token>`.  
**FR-AUTH-05 Google token linking (Workspace):** For Workspace features, the app shall detect if the backend indicates missing Google OAuth credentials and shall redirect the user to the backend-provided `connectUrl` to complete Google OAuth and link the credential to the current Kinde session.

**FR-AUTH-06 Session timeout:** The app shall refresh tokens (if supported by Kinde SDK) before expiry; on failure, prompt re-login and return to the previous route.

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
**FR-CHAT-02 Answer display:** Render answers with loading state.  
**FR-CHAT-03 Citations:** Display citations/sources returned by backend (title + URL + optional snippet).  
**FR-CHAT-04 Conversation state:** Maintain conversation history in-session; optionally persist via backend.  
**FR-CHAT-05 Regenerate answer:** Allow “Regenerate” for the latest assistant message (backend flag `regenerate: true`).  
**FR-CHAT-06 Copy/export:** Allow copying answer text and exporting conversation (Markdown for MVP; PDF optional later).

### 5.4 Workspace Search (Feature-flagged)
**FR-WS-01 Connect flow:** If Workspace scope is selected and backend returns `AUTH_GOOGLE_DISCONNECTED`, the app shall present a “Connect Google Workspace” prompt and redirect to `connectUrl`.  
**FR-WS-02 Status display:** Show Workspace connection status (connected/disconnected) and connected Google account email if provided.  
**FR-WS-03 OAuth error handling:** Gracefully handle cancel/denial and return user to the app with a message.  
**FR-WS-04 Disconnect (optional):** Provide a disconnect action if backend supports revoking tokens.

### 5.5 Feedback
**FR-FB-01 Feedback:** Provide thumbs up/down on answers with optional comment and send to backend.  
**FR-FB-02 No PII leakage:** Feedback payload must not include full tokens or sensitive headers.

---

## 6. External Interface Requirements

### 6.1 Frontend routes (initial)
- `/` Combined search + chat (recommended)
- `/search` Dedicated search page (optional)
- `/chat` Dedicated chat page (optional)
- `/callback` Kinde OAuth callback (handled by Kinde SDK, no component needed)
- `/access-denied` Domain rejected
- `/settings` Connection status and toggles (optional)
- `/status` Minimal diagnostics (optional)

### 6.2 API Interface (Cloud Run BFF) — v1
**Versioning:** All endpoints are under `/v1`.

#### 6.2.1 Headers
- `Authorization: Bearer <kinde_access_token>` (required)
- `X-Session-Id: <client-generated>` (required)
- `X-Request-Id: <uuid>` (optional, if client provides; backend also generates)

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

#### 6.2.3 POST `/v1/chat`
Request:
```json
{
  "conversationId": "string|null",
  "message": "string",
  "scope": "precedent|infobank|both|workspace",
  "regenerate": false
}
```
Response:
```json
{
  "requestId": "string",
  "conversationId": "string",
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
  }
}
```

#### 6.2.4 POST `/v1/chat/stream` (SSE, optional but recommended)
- Request body is the same as `/v1/chat`
- Response: `Content-Type: text/event-stream`

**⚠️ Implementation Note:** The browser's native `EventSource` API **cannot send custom headers** (including `Authorization`). The frontend **must use `fetch()` with `ReadableStream`** to consume SSE with auth headers. Recommended libraries:
- `@microsoft/fetch-event-source` (full-featured)
- `fetch-event-stream` (lightweight)

**Event Format (JSON per line):**
Each SSE event follows the format: `event: <type>\ndata: <json>\n\n`

```
event: start
data: {"conversationId": "abc123", "messageId": "msg456"}

event: token
data: {"content": "The court held that"}

event: token
data: {"content": " the plaintiff..."}

event: citation
data: {"title": "Case ABC v XYZ", "url": "...", "snippet": "...", "source": "precedent"}

event: done
data: {"requestId": "req789", "conversationId": "abc123"}

event: error
data: {"code": "SEARCH_TIMEOUT", "message": "...", "retryable": true}
```

**Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `start` | `{conversationId, messageId}` | Stream initialized |
| `token` | `{content: string}` | Incremental text chunk |
| `citation` | `Citation` object | Citation as discovered |
| `done` | `{requestId, conversationId}` | Stream complete |
| `error` | `APIError` object | Error (may be mid-stream) |

Frontend requirements:
- **FR-CHAT-STREAM-01** Display tokens progressively (append to message).
- **FR-CHAT-STREAM-02** Render citations after `citation` events (accumulate in sidebar).
- **FR-CHAT-STREAM-03** Handle mid-stream errors gracefully; show partial answer with warning.
- **FR-CHAT-STREAM-04** Implement connection timeout (30s recommended) with retry.

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

#### 6.2.7 GET `/v1/flags`
Returns feature flags for the current user/environment.
Response:
```json
{
  "flags": {
    "WORKSPACE_SEARCH_ENABLED": false,
    "CHAT_HISTORY_ENABLED": false,
    "STREAMING_ENABLED": true,
    "FEEDBACK_ENABLED": true,
    "EXPORT_ENABLED": false,
    "INFOBANK_SEARCH_ENABLED": false
  }
}
```

#### 6.2.8 GET `/v1/health`
Returns backend health and dependency status (no sensitive details).

### 6.3 Standard error response schema
All endpoints return errors in the following format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "requestId": "string",
    "retryable": true,
    "retryAfterMs": 0
  }
}
```

**Error codes**
- `AUTH_INVALID_TOKEN` (401)
- `AUTH_DOMAIN_REJECTED` (403)
- `AUTH_GOOGLE_DISCONNECTED` (403)
- `RATE_LIMITED` (429)
- `SEARCH_TIMEOUT` (504)
- `SEARCH_PARTIAL_FAILURE` (207 or 200 with `"status":"partial"`)
- `SERVICE_UNAVAILABLE` (503)
- `DATASTORE_UNAVAILABLE` (503)
- `INVALID_REQUEST` (400)
- `QUERY_TOO_LONG` (400)
- `INTERNAL_ERROR` (500)

### 6.5 Error Code → UX Mapping

| Error Code | User Message | Recommended Action | Auto-Retry |
|------------|--------------|-------------------|------------|
| `AUTH_INVALID_TOKEN` | "Your session has expired. Please sign in again." | Redirect to login | No |
| `AUTH_DOMAIN_REJECTED` | "Access is restricted to VNlaw employees." | Redirect to `/access-denied` | No |
| `AUTH_GOOGLE_DISCONNECTED` | "Connect your Google Workspace to search internal documents." | Show "Connect" button with `connectUrl` | No |
| `RATE_LIMITED` | "Too many requests. Please wait a moment." | Show countdown timer using `Retry-After` | Yes (1x) |
| `SEARCH_TIMEOUT` | "Search is taking longer than expected. Please try again." | Show "Retry" button | Yes (2x) |
| `SEARCH_PARTIAL_FAILURE` | "Some results may be missing. Showing available results." | Show results with warning banner | No |
| `SERVICE_UNAVAILABLE` | "Service temporarily unavailable. Retrying..." | Auto-retry with indicator | Yes (3x) |
| `DATASTORE_UNAVAILABLE` | "Some data sources are temporarily unavailable." | Show partial results if available | Yes (3x) |
| `INVALID_REQUEST` | "Invalid request. Please check your input." | Highlight invalid field | No |
| `QUERY_TOO_LONG` | "Query is too long. Maximum 500 characters." | Show character count, truncate | No |
| `INTERNAL_ERROR` | "Something went wrong. Please try again later." | Show "Retry" button, log `requestId` | Yes (1x) |

### 6.4 Rate limiting headers
All API responses include:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (on 429)

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

Retry matrix:
- 503: max 3 retries (1s, 2s, 4s)
- 504: max 2 retries (2s, 4s)
- 429: wait `Retry-After`, max 1 retry

**Circuit breaker**
- After 5 consecutive failures within 60s, open circuit for 30s.
- During open state, show countdown + “Try now” option.

### 7.3 Security
- Enforce HTTPS everywhere.
- Frontend must never store or log full JWTs (log only last 8 characters if needed).
- Prefer in-memory tokens; avoid localStorage for access tokens (Kinde SDK dependent).
- Apply CSP baseline (adjust as needed):
  ```
  default-src 'self';
  script-src 'self' https://cdn.kinde.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.vnlaw.app https://*.kinde.com;
  frame-ancestors 'none';
  form-action 'self';
  ```
- Do not log PII in client logs; redact emails (mask local part).

### 7.4 Accessibility
- WCAG 2.1 AA target for core flows.
- Full keyboard navigation for search, chat, citations, modals.

### 7.5 Observability
- Generate client session id on load; send via `X-Session-Id` on every request.
- Log structured events (PII-safe): navigation, search submit/complete, chat send/complete, auth events, errors.
- Surface backend `requestId` in UI for support.

---

## 8. State Management & Caching

### 8.1 State categories
| State | Storage | Persistence |
|---|---|---|
| Auth | memory + secure cookie (preferred) | session |
| UI prefs | localStorage | long-lived |
| Search | URL params + memory | navigation |
| Chat thread | memory | session |
| Response cache | TanStack Query/SWR | session |
| Recent searches | localStorage | per user |

### 8.2 URL state (required)
- Search query reflected in URL, e.g. `/search?q=...&scope=precedent`
- Back/forward navigation must work correctly
- URLs are shareable internally (subject to auth)

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
- Tooling: Vitest/Jest + Testing Library
- Coverage targets:
  - shared packages: 80%
  - app logic: 70%
  - UI components: 60%

### 10.2 Integration testing
- Use MSW for API mocking
- Validate auth flows, all scopes, chat multi-turn, error scenarios

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
Feature flags evaluated at app init (from config endpoint or build-time env).  
Initial flags:
- `WORKSPACE_SEARCH_ENABLED` (default false)
- `CHAT_HISTORY_ENABLED` (default false)
- `STREAMING_ENABLED` (default true)
- `FEEDBACK_ENABLED` (default true)
- `EXPORT_ENABLED` (default false)

Disabled feature behavior:
- Hide UI controls
- If invoked, show friendly message (no broken state)

---

## 13. Deployment & Environments

### 13.1 Environments
- Dev: local
- Staging: Netlify preview + `staging.vnlaw.app`
- Prod: `vnlaw.app`

### 13.2 Netlify config expectations
- Deploy previews for PRs
- Branch deploy for staging (e.g., `main`→prod, `develop`→staging)
- Environment variables per site/app

### 13.3 Cloudflare expectations
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

## 16. Required Next Artifacts (Recommended)
1) **OpenAPI spec (`openapi.yaml`)** for `/v1/search`, `/v1/chat`, `/v1/chat/stream`, `/v1/health`.
2) Frontend monorepo scaffolding (apps + packages) with shared UI/auth/api-client packages.
3) A minimal Figma wireframe set for: empty state, results, chat, citations, connect flow, error states.

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
- [ ] Create API hooks: `useSearch`, `useChat`, `useChatStream`
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
- [ ] Implement URL state sync (`/search?q=...&scope=...`)
- [ ] Add "Load more" pagination with cursor support
- [ ] Create empty state component with suggestions
- [ ] Create loading skeleton components
- [ ] Add search history to localStorage
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

### 17.4 Phase 4: Chat Feature

**Goal:** Question-answering interface with citations

**Prerequisites:** Phase 3 complete

**Tasks (in order):**
- [ ] Create `ChatContainer` component
- [ ] Create `ChatMessage` component (user/assistant variants)
- [ ] Create `ChatInput` component with submit handling
- [ ] Implement SSE streaming display with progressive tokens
- [ ] Create `CitationsPanel` component
- [ ] Create `CitationCard` component
- [ ] Add conversation state management (in-memory)
- [ ] Implement "Regenerate" button functionality
- [ ] Add copy-to-clipboard for answers
- [ ] Create markdown export functionality
- [ ] Handle mid-stream errors gracefully

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
    ├── useChat.ts
    └── useSSE.ts
```

**Exit Criteria:**
- [ ] User can ask questions and see answers
- [ ] Streaming responses display token-by-token
- [ ] Citations appear alongside answers
- [ ] "Regenerate" re-fetches the last answer
- [ ] Copy button works for answer text
- [ ] Mid-stream errors show partial answer with warning

**Requirement Coverage:** FR-CHAT-01 through FR-CHAT-06, FR-CHAT-STREAM-01 through FR-CHAT-STREAM-04

**PR Boundary:** Single PR titled `feat: chat UI with SSE streaming and citations`

**Verification Commands:**
```bash
npm run build && npm run lint && npm run typecheck
npm run test -- --filter=chat
# E2E: npm run e2e -- --grep="chat"
```

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
│       │   │   └── settings.tsx    # Optional
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
├── package.json                    # Root package.json (workspaces)
├── pnpm-workspace.yaml             # If using pnpm
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

export interface ChatRequest {
  conversationId?: string | null;
  message: string;
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
  answer: string;
  citations: Citation[];
  auth: AuthStatus;
}

// ============ SSE Event Types ============

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
  | 'RATE_LIMITED'
  | 'SEARCH_TIMEOUT'
  | 'SEARCH_PARTIAL_FAILURE'
  | 'SERVICE_UNAVAILABLE'
  | 'DATASTORE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'QUERY_TOO_LONG'
  | 'INTERNAL_ERROR';

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  retryable: boolean;
  retryAfterMs?: number;
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
| `VITE_SESSION_STORAGE_KEY` | Key for session ID storage | No | `vnlaw_session_id` | - |
| `VITE_FEATURE_FLAGS_URL` | Remote feature flags endpoint | No | - | `https://api.vnlaw.app/v1/flags` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | No | - | `https://...@sentry.io/...` |
| `VITE_GA_TRACKING_ID` | Google Analytics ID | No | - | `G-XXXXXXXXXX` |
| `VITE_ENABLE_DEV_TOOLS` | Enable React DevTools in prod | No | `false` | `true` |

### 20.2 Environment Files

```bash
# .env.example (committed to repo)
VITE_KINDE_DOMAIN=
VITE_KINDE_CLIENT_ID=
VITE_KINDE_REDIRECT_URI=
VITE_KINDE_LOGOUT_URI=
VITE_API_BASE_URL=
VITE_ALLOWED_DOMAIN=vnlaw.com.vn

# .env.local (local development - not committed)
VITE_KINDE_DOMAIN=vnlaw-dev.kinde.com
VITE_KINDE_CLIENT_ID=dev_client_id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8080
VITE_ALLOWED_DOMAIN=vnlaw.com.vn

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

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Deploy contexts
[context.production]
  environment = { VITE_ENV = "production" }

[context.staging]
  environment = { VITE_ENV = "staging" }

[context.deploy-preview]
  environment = { VITE_ENV = "preview" }
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

*End of SRS v1.2.0*
