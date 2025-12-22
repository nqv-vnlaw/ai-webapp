# VNlaw Web Apps Frontend Platform — Software Requirements Specification (SRS)
**Document ID:** VNLAW-WEBAPPS-SRS  
**Version:** 1.1.0 (Consolidated)  
**Status:** Draft (Build-ready baseline)  
**Primary application (App #1):** Precedent Search Bot (Web)  
**Repository:** Separate frontend repository (monorepo) e.g., `vnlaw-webapps`  
**Last updated:** 2025-12-22  

---

## 0. Executive Summary
VNlaw Web Apps is a **multi-application web frontend platform** deployed on **Netlify** and protected by **Cloudflare**, using **Kinde** for user authentication. The platform is **restricted to VNlaw Google Workspace users** (`@vnlaw.com.vn`). Business logic and sensitive credential handling remain in **GCP** using **Cloud Run (Python BFF)** and **Cloud Functions**, with optional persistence in **Firestore** (MVP) and **PostgreSQL** (Supabase or Neon) for longer-term product features.

A critical requirement is **dual-authentication** for Workspace-connected features:
- **Kinde token = identity & app access**
- **Google OAuth token(s) = access to Google Workspace data**  
The backend (Cloud Run BFF) is responsible for **mapping Kinde identity → stored Google tokens** (from Firestore `UserTokens`) and handling the OAuth “connect” flow as needed.

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

### 3.3 Critical “Kinde ↔ Google token handoff”
**Problem addressed:** Kinde JWT cannot be used to query Google Workspace APIs.  
**Requirement:** Cloud Run BFF must map Kinde identity to stored Google tokens.

**Rules**
- Kinde is the source of truth for “who is logged in”.
- Google OAuth tokens are required only for Workspace-connected features.
- If tokens are missing/expired/insufficient scope, backend returns `AUTH_GOOGLE_DISCONNECTED` with a `connectUrl`.

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization
**FR-AUTH-01 Login:** The app shall require users to authenticate via Kinde (Google login).  
**FR-AUTH-02 Domain restriction:** The app shall only allow users with email domain `vnlaw.com.vn`.  
**FR-AUTH-03 Session:** The app shall maintain a session across page reloads and support logout.  
**FR-AUTH-04 API auth:** The app shall send Kinde access tokens to the backend in `Authorization: Bearer <token>`.  
**FR-AUTH-05 Google token linking (Workspace):** For Workspace features, the app shall detect if the backend indicates missing Google OAuth credentials and shall redirect the user to the backend-provided `connectUrl` to complete Google OAuth and link the credential to the current Kinde session.

**FR-AUTH-06 Session timeout:** The app shall refresh tokens (if supported by Kinde SDK) before expiry; on failure, prompt re-login and return to the previous route.

### 4.2 Precedent Search (App #1 Core)
**FR-SEARCH-01 Query input:** Provide a query input supporting free-text legal queries.  
**FR-SEARCH-02 Scope selection:** Provide a scope selector: `precedent`, `infobank`, `both`, `workspace` (feature-flagged). Default is `precedent`.  
**FR-SEARCH-03 Search execution:** Submit query + scope to the backend and display results.  
**FR-SEARCH-04 Results display:** Each result displays title, snippet, source indicator, and link.  
**FR-SEARCH-05 Pagination:** Support “Load more” using opaque cursors/tokens returned by backend.  
**FR-SEARCH-06 Empty state:** If no results, show guidance and alternative suggestions.  
**FR-SEARCH-07 Query validation:** Reject empty queries; enforce max query length (500 chars).

### 4.3 Chat (Answer + Citations)
**FR-CHAT-01 Ask question:** Provide a chat UI for question-answering and follow-ups.  
**FR-CHAT-02 Answer display:** Render answers with loading state.  
**FR-CHAT-03 Citations:** Display citations/sources returned by backend (title + URL + optional snippet).  
**FR-CHAT-04 Conversation state:** Maintain conversation history in-session; optionally persist via backend.  
**FR-CHAT-05 Regenerate answer:** Allow “Regenerate” for the latest assistant message (backend flag `regenerate: true`).  
**FR-CHAT-06 Copy/export:** Allow copying answer text and exporting conversation (Markdown for MVP; PDF optional later).

### 4.4 Workspace Search (Feature-flagged)
**FR-WS-01 Connect flow:** If Workspace scope is selected and backend returns `AUTH_GOOGLE_DISCONNECTED`, the app shall present a “Connect Google Workspace” prompt and redirect to `connectUrl`.  
**FR-WS-02 Status display:** Show Workspace connection status (connected/disconnected) and connected Google account email if provided.  
**FR-WS-03 OAuth error handling:** Gracefully handle cancel/denial and return user to the app with a message.  
**FR-WS-04 Disconnect (optional):** Provide a disconnect action if backend supports revoking tokens.

### 4.5 Feedback
**FR-FB-01 Feedback:** Provide thumbs up/down on answers with optional comment and send to backend.  
**FR-FB-02 No PII leakage:** Feedback payload must not include full tokens or sensitive headers.

---

## 5. External Interface Requirements

### 5.1 Frontend routes (initial)
- `/` Combined search + chat (recommended)
- `/search` Dedicated search page (optional)
- `/chat` Dedicated chat page (optional)
- `/access-denied` Domain rejected
- `/settings` Connection status and toggles (optional)
- `/status` Minimal diagnostics (optional)

### 5.2 API Interface (Cloud Run BFF) — v1
**Versioning:** All endpoints are under `/v1`.

#### 5.2.1 Headers
- `Authorization: Bearer <kinde_access_token>` (required)
- `X-Session-Id: <client-generated>` (required)
- `X-Request-Id: <uuid>` (optional, if client provides; backend also generates)

#### 5.2.2 POST `/v1/search`
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

#### 5.2.3 POST `/v1/chat`
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

#### 5.2.4 POST `/v1/chat/stream` (SSE, optional but recommended)
- Request body is the same as `/v1/chat`
- Response: `Content-Type: text/event-stream`

Events:
- `start`: contains `conversationId`, `messageId`
- `token`: streamed answer text chunks
- `citation`: citation entries as they become available
- `done`: final metadata
- `error`: structured error (may indicate partial output)

Frontend requirements:
- **FR-CHAT-STREAM-01** Display tokens progressively.
- **FR-CHAT-STREAM-02** Render citations after `citation` events.
- **FR-CHAT-STREAM-03** Handle mid-stream errors gracefully; show partial answer with warning.

#### 5.2.5 GET `/v1/health`
Returns backend health and dependency status (no sensitive details).

### 5.3 Standard error response schema
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

### 5.4 Rate limiting headers
All API responses include:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (on 429)

---

## 6. Non-Functional Requirements

### 6.1 Performance targets
- TTI < 3.5s (4G throttling test)
- LCP < 2.5s
- CLS < 0.1
- Search results render < 500ms after API response received
- Streaming token display < 50ms per event

**Bundle budgets**
- Initial JS bundle < 200KB gzipped (target)
- Lazy chunks < 50KB gzipped (target)

### 6.2 Reliability & resiliency
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

### 6.3 Security
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

### 6.4 Accessibility
- WCAG 2.1 AA target for core flows.
- Full keyboard navigation for search, chat, citations, modals.

### 6.5 Observability
- Generate client session id on load; send via `X-Session-Id` on every request.
- Log structured events (PII-safe): navigation, search submit/complete, chat send/complete, auth events, errors.
- Surface backend `requestId` in UI for support.

---

## 7. State Management & Caching

### 7.1 State categories
| State | Storage | Persistence |
|---|---|---|
| Auth | memory + secure cookie (preferred) | session |
| UI prefs | localStorage | long-lived |
| Search | URL params + memory | navigation |
| Chat thread | memory | session |
| Response cache | TanStack Query/SWR | session |
| Recent searches | localStorage | per user |

### 7.2 URL state (required)
- Search query reflected in URL, e.g. `/search?q=...&scope=precedent`
- Back/forward navigation must work correctly
- URLs are shareable internally (subject to auth)

### 7.3 Caching rules
- Search responses: TTL 5 minutes; stale-while-revalidate 5 minutes.
- Never cache error responses.
- Show “cached results from …” warning when serving stale cache due to backend failure.

---

## 8. Chat Persistence (MVP vs Post-MVP)

### 8.1 MVP recommendation
- Persist conversation summaries or full messages in **Firestore** (optional toggle).
- Benefits: lowest operational overhead and matches existing GCP setup.

### 8.2 Post-MVP
- Introduce PostgreSQL (Supabase/Neon) when:
  - cross-app reporting is needed
  - complex queries/auditing required
  - long-term retention policies mature

---

## 9. Testing Requirements

### 9.1 Unit testing
- Tooling: Vitest/Jest + Testing Library
- Coverage targets:
  - shared packages: 80%
  - app logic: 70%
  - UI components: 60%

### 9.2 Integration testing
- Use MSW for API mocking
- Validate auth flows, all scopes, chat multi-turn, error scenarios

### 9.3 E2E testing
- Tool: Playwright (recommended)
- P0 scenarios: login, domain rejection, basic search, chat with citations, logout
- Run smoke tests on every PR; nightly full suite

### 9.4 Performance & accessibility testing
- Lighthouse CI on PRs (target score ≥ 80 perf, ≥ 90 accessibility)
- axe-core checks for key pages/components

---

## 10. Mobile & Responsive Requirements
Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px.  
- Touch targets ≥ 44×44px
- Citations panel becomes bottom sheet on mobile
- Reduce results per page on mobile (e.g., 5) if needed

---

## 11. Feature Flags
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

## 12. Deployment & Environments

### 12.1 Environments
- Dev: local
- Staging: Netlify preview + `staging.vnlaw.app`
- Prod: `vnlaw.app`

### 12.2 Netlify config expectations
- Deploy previews for PRs
- Branch deploy for staging (e.g., `main`→prod, `develop`→staging)
- Environment variables per site/app

### 12.3 Cloudflare expectations
- DNS + SSL/TLS for `vnlaw.app` and `api.vnlaw.app`
- WAF + rate limiting policies
- Optional: Access policies for internal-only routes

---

## 13. Migration & Compatibility (V1 Chat Bot → Web App)
- Web app is a separate UI; backend should remain shared or parallelized safely.
- Bot can include a link to the web app for discoverability (post-launch).
- Future: conversation portability (optional) if IDs are unified.

---

## 14. MVP Acceptance Criteria (App #1: Precedent Search Bot Web)
MVP is accepted when:
1) Only `@vnlaw.com.vn` users can access after login.
2) Search works for Precedent scope: results show title/snippet/link.
3) Chat answers display with citations (when available).
4) Errors show user-friendly messages; retry works for transient failures.
5) `vnlaw.app` is served via Cloudflare → Netlify, and API calls go to Cloud Run BFF.

---

## 15. Required Next Artifacts (Recommended)
1) **OpenAPI spec (`openapi.yaml`)** for `/v1/search`, `/v1/chat`, `/v1/chat/stream`, `/v1/health`.
2) Frontend monorepo scaffolding (apps + packages) with shared UI/auth/api-client packages.
3) A minimal Figma wireframe set for: empty state, results, chat, citations, connect flow, error states.

---
*End of SRS v1.1.0*
