# AI Agent Quick Reference Guide

> **For AI coding agents:** This guide extracts critical information from the SRS for quick reference during implementation.

**Full SRS:** `1. Research/VNlaw_WebApps_SRS_v1.5.2.md`  
**OpenAPI Spec:** `1. Research/openapi.yaml`  
**Last Updated:** 2025-12-25

---

## Project Overview

**VNlaw Web Apps** is a multi-application web frontend platform for legal research and AI-powered search/chat.

### Tech Stack

**Frontend:**
- TypeScript + React + Vite (SPA)
- TanStack Query, Zod, shadcn/ui, React Hook Form, Tailwind CSS
- Hosted on Netlify (protected by Cloudflare)
- Authentication via Kinde (domain-restricted to `@vnlaw.com.vn`)

**Backend:**
- Cloud Run Python BFF (Pattern A - mandatory)
- Cloud Functions for supporting services
- Firestore (MVP persistence)
- PostgreSQL/Supabase (post-MVP)

**Key Architecture:**
- **Dual Authentication:** Kinde token (identity) + Google OAuth tokens (Workspace access)
- **BFF Pattern:** All business logic in Cloud Run; frontend is presentation layer only
- **Monorepo Structure:** `apps/precedent-search/` + shared `packages/`

---

## Critical Blockers (READ FIRST)

> ⚠️ **These requirements are BLOCKERS. Implementation cannot proceed safely without them.**

### 1. OAuth Connect Contract (Issue #1)
- **Status:** ✅ Resolved in OpenAPI v1.0.2
- **Endpoints Required:** `GET /v1/oauth/google/connect`, `GET /v1/oauth/google/callback`, `DELETE /v1/me/workspace`
- **Impact:** Frontend cannot implement "Connect Google Workspace" without these endpoints
- **Reference:** SRS Section 16.1.1

### 2. Token Storage Security (Issue #5)
- **Requirements:**
  - Cloud KMS encryption for OAuth tokens (envelope encryption)
  - Firestore security rules: DENY all client access to `UserTokens` collection
  - Audit logging enabled (90-day retention minimum)
  - Revocation endpoint implemented and tested
- **Impact:** Storing OAuth tokens without proper security is catastrophic
- **Reference:** SRS Sections 3.4.1, 7.3.8, 16.1.2

### 3. CORS Configuration (Issue #6)
- **Production:** Exact match only (`https://vnlaw.app`, `https://staging.vnlaw.app`)
- **Preview:** Restricted pattern `https://*-vnlaw-app.netlify.app` OR Firestore allowlist
- **Preflight:** All endpoints MUST handle `OPTIONS` requests
- **Impact:** Browsers will block API calls if CORS is misconfigured
- **Reference:** SRS Sections 3.3.1, 6.2.0

---

## Authoritative Contracts

| Artifact | Status | Location |
|----------|--------|----------|
| **OpenAPI Spec** | ✅ Ready | `1. Research/openapi.yaml` (v1.0.2) |
| **SRS Document** | ✅ Ready | `1. Research/VNlaw_WebApps_SRS_v1.5.2.md` |
| **Sample JSON** | ✅ Ready | `1. Research/samples/` |

**⚠️ OpenAPI Governance Rule:**  
Agents MUST use `openapi.yaml` as the single source of truth for API contracts. Any discrepancies between SRS and OpenAPI should be resolved by updating BOTH documents.

**Type Generation:**
```bash
npx openapi-typescript "1. Research/openapi.yaml" -o packages/shared/src/types/generated/api.ts
```

---

## MVP Scope Matrix

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

**MVP Default Feature Flags:**
```typescript
{
  WORKSPACE_SEARCH_ENABLED: false,
  CHAT_HISTORY_ENABLED: false,
  STREAMING_ENABLED: false,
  FEEDBACK_ENABLED: true,
  EXPORT_ENABLED: true,
  INFOBANK_SEARCH_ENABLED: false
}
```

---

## Architecture Overview

### Pattern A: Cloud Run BFF (Mandatory)

**Decision:** All business logic in Cloud Run Python BFF. Frontend is presentation layer only.

**Request Flow:**
1. User → `vnlaw.app` (Cloudflare → Netlify)
2. Frontend → `api.vnlaw.app` (Cloudflare → Cloud Run BFF)
3. BFF validates Kinde token, enforces domain restriction
4. BFF looks up Google OAuth tokens in Firestore `UserTokens` (if needed)
5. BFF executes search/chat via internal services
6. Returns JSON responses to frontend

**Critical Rule:**  
Kinde is source of truth for "who is logged in." Google OAuth tokens required only for Workspace features. Backend maps Kinde identity → stored Google tokens.

### Dual Authentication System

- **Kinde Token:** OIDC/JWT for identity & app access (stored in memory, not localStorage)
- **Google OAuth Tokens:** Required for Workspace search features
- **Backend Responsibility:** Maps Kinde identity → stored Google tokens from Firestore

### Frontend Architecture

- **SPA Pattern:** Single Page Application (no SSR)
- **Routing:** Combined search + chat on `/` (MVP canonical route)
- **State Management:** TanStack Query for API state, URL params for search state
- **Authentication:** Kinde SDK handles OAuth flow; tokens in memory only

---

## Implementation Phases

### Phase 1: Project Scaffolding
**Goal:** Deployable skeleton with authentication working  
**Key Tasks:** Vite + React + TypeScript setup, Kinde integration, domain restriction, protected routes  
**Exit Criteria:** User can log in, non-domain users redirected, site deploys to Netlify  
**Reference:** SRS Section 17.1

### Phase 2: API Client & Core Infrastructure
**Goal:** Typed API client with authentication headers and error handling  
**Key Tasks:** API client package, TypeScript types from OpenAPI, retry logic, circuit breaker  
**Exit Criteria:** Client sends Kinde token, X-Session-Id, handles errors, retries work  
**Reference:** SRS Section 17.2

### Phase 3: Search Feature
**Goal:** Complete search functionality with results display  
**Key Tasks:** Search input, scope selector (precedent only MVP), results display, pagination, URL state sync  
**Exit Criteria:** User can search, see results, paginate, URL reflects state  
**Reference:** SRS Section 17.3

### Phase 4: Chat Feature (Non-Streaming MVP)
**Goal:** Question-answering interface with citations  
**Key Tasks:** Chat UI, message display, citations panel, conversation state, regenerate, copy/export  
**Exit Criteria:** User can chat, see answers with citations, regenerate works  
**Reference:** SRS Section 17.4

### Phase 5: Error Handling & Feedback
**Goal:** Production-ready error handling and user feedback  
**Key Tasks:** Error boundary, retry UI, circuit breaker UI, feedback component, requestId display  
**Exit Criteria:** Errors handled gracefully, retry works, feedback submits, requestId visible  
**Reference:** SRS Section 17.5

### Phase 6: Polish & Responsive Design
**Goal:** Mobile-responsive UI and accessibility compliance  
**Key Tasks:** Responsive breakpoints, mobile citations panel, keyboard navigation, accessibility fixes  
**Exit Criteria:** Works on mobile/tablet/desktop, keyboard accessible, Lighthouse scores met  
**Reference:** SRS Section 17.6

### Phase 7: Testing & Quality Gates
**Goal:** Test coverage and CI/CD pipeline  
**Key Tasks:** Vitest setup, unit tests (80% packages, 70% app, 60% UI), MSW integration tests, Playwright E2E  
**Exit Criteria:** Coverage targets met, P0 E2E scenarios pass, CI runs on PRs  
**Reference:** SRS Section 17.7

**Phase Dependencies:**
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

---

## Key Requirements

### Authentication & Authorization
- **FR-AUTH-01:** Login via Kinde (Google SSO)
- **FR-AUTH-02:** Domain restriction to `@vnlaw.com.vn` only
- **FR-AUTH-03:** Session persistence via Kinde SDK silent refresh (tokens in memory)
- **FR-AUTH-04:** API auth via `Authorization: Bearer <kinde_token>`
- **FR-AUTH-05:** Google Workspace OAuth connect flow (when Workspace scope selected)

### Search
- **FR-SEARCH-01:** Free-text legal query input
- **FR-SEARCH-02:** Scope selector (MVP: `precedent` only)
- **FR-SEARCH-03:** Submit query + scope to backend
- **FR-SEARCH-04:** Display results (title, snippet, source, link)
- **FR-SEARCH-05:** Pagination with opaque cursors
- **FR-SEARCH-06:** Empty state handling
- **FR-SEARCH-07:** Query validation (max 500 chars)

### Chat
- **FR-CHAT-01:** Chat UI for Q&A
- **FR-CHAT-02:** Answer display with loading state (non-streaming MVP)
- **FR-CHAT-03:** Citations display (deduplicated by backend, preserve order)
- **FR-CHAT-04:** Conversation state (in-memory, optionally persisted)
- **FR-CHAT-05:** Regenerate answer functionality
- **FR-CHAT-06:** Copy/export (Markdown MVP)

### Error Handling
- **FR-ERR-01:** Automatic retry with exponential backoff
- **FR-ERR-02:** Retry UI indicator
- **FR-ERR-03:** Manual retry after max retries

---

## Common Pitfalls

### Security Pitfalls
1. **❌ Storing tokens in localStorage** → ✅ Use Kinde SDK memory storage + silent refresh
2. **❌ Client-side domain validation only** → ✅ Backend MUST enforce domain restriction
3. **❌ CORS wildcards in production** → ✅ Exact match only for production origins
4. **❌ Plaintext OAuth tokens in logs** → ✅ Never log tokens; hash session IDs
5. **❌ Demo Mode in production** → ✅ Build-time AND runtime guards required

### Implementation Pitfalls
1. **❌ Manual TypeScript types** → ✅ Generate from OpenAPI spec
2. **❌ Frontend citation deduplication** → ✅ Backend deduplicates; frontend displays as-provided
3. **❌ Using EventSource for streaming** → ✅ Use `fetch()` + `ReadableStream` (post-MVP)
4. **❌ Missing `/callback` route** → ✅ Required for Kinde OAuth callback
5. **❌ Feature flags not loaded before UI render** → ✅ Fetch flags on app mount, wait before rendering

### API Contract Pitfalls
1. **❌ Using error message strings** → ✅ Use `error.code` for error handling
2. **❌ Missing `requestId` in responses** → ✅ Every response MUST include `requestId` (UUID v4)
3. **❌ HTTP 200 for partial success** → ✅ Use HTTP 207 when some datastores fail
4. **❌ Frontend validation as security** → ✅ Frontend validation is UX only; backend is authoritative

---

## Quick Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_KINDE_DOMAIN` | Yes | Kinde tenant domain | `vnlaw.kinde.com` |
| `VITE_KINDE_CLIENT_ID` | Yes | Kinde application client ID | `abc123...` |
| `VITE_KINDE_REDIRECT_URI` | Yes | OAuth callback URL | `https://vnlaw.app/callback` |
| `VITE_KINDE_LOGOUT_URI` | Yes | Post-logout redirect | `https://vnlaw.app` |
| `VITE_API_BASE_URL` | Yes | Cloud Run BFF base URL | `https://api.vnlaw.app` |
| `VITE_ALLOWED_DOMAIN` | Yes | Allowed email domain | `vnlaw.com.vn` |
| `VITE_DEMO_MODE` | No | Enable MSW mocks | `true` / `false` |

### Key File Locations

```
vnlaw-webapps/
├── apps/precedent-search/     # Main application
│   ├── src/
│   │   ├── routes/            # Page components
│   │   ├── components/        # Feature components
│   │   └── hooks/              # App-specific hooks
├── packages/
│   ├── api-client/            # Typed API client
│   ├── auth/                  # Kinde integration
│   ├── ui/                    # Shared UI components
│   └── shared/                # Shared types/utils
└── 1. Research/
    ├── openapi.yaml           # API contract (authoritative)
    ├── VNlaw_WebApps_SRS_v1.5.2.md
    └── samples/               # Sample JSON responses
```

### Critical Implementation Notes

- **SSE Streaming:** Deferred to post-MVP. When implemented, use `fetch()` + `ReadableStream` (not `EventSource`)
- **Demo Mode:** Frontend MUST work with MSW mocks before backend exists
- **Kinde Callback:** Provide `/callback` route (minimal "Signing you in..." page)
- **Token Storage:** Kinde SDK stores tokens in memory; use silent refresh for persistence
- **URL State:** MVP uses `/?q=<query>&scope=precedent` (singular `scope`, not plural)

### Error Code → UX Mapping

| Error Code | User Message | Action |
|------------|--------------|--------|
| `AUTH_INVALID_TOKEN` | "Your session has expired. Please sign in again." | Redirect to login |
| `AUTH_DOMAIN_REJECTED` | "Access is restricted to VNlaw employees." | Redirect to `/access-denied` |
| `AUTH_GOOGLE_DISCONNECTED` | "Connect your Google Workspace..." | Show "Connect" button with `connectUrl` |
| `RATE_LIMITED` | "Too many requests. Please wait a moment." | Show countdown timer |
| `SEARCH_TIMEOUT` | "Search is taking longer than expected..." | Show "Retry" button |
| `INTERNAL_ERROR` | "Something went wrong..." | Show "Retry" button, log `requestId` |

### Rate Limits

- **Authenticated endpoints:** 60 requests/minute per user
- **Health endpoint:** 10 requests/minute per IP
- **OAuth endpoints:** 5 requests/minute per IP

### Testing Requirements

- **Unit Tests:** Vitest + Testing Library
- **Coverage Targets:** 80% (packages), 70% (app), 60% (UI)
- **Integration Tests:** MSW for API mocking
- **E2E Tests:** Playwright (P0 scenarios: login, search, chat, logout)
- **Performance:** Lighthouse CI (≥80 perf, ≥90 accessibility)

---

## References

- **Full SRS:** `1. Research/VNlaw_WebApps_SRS_v1.5.2.md`
- **OpenAPI Spec:** `1. Research/openapi.yaml`
- **Sample Files:** `1. Research/samples/`

For detailed requirements, error codes, API contracts, and implementation guidance, refer to the full SRS document.

