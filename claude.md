# Claude AI Agent Quick Reference Guide

> **For Claude AI:** This guide provides Claude-specific guidance for implementing the VNlaw Web Apps frontend platform.

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

## Claude-Specific Implementation Guidance

### Contract-First Development

**Always start with OpenAPI types:**
1. Generate TypeScript types from OpenAPI spec before writing any API code
2. Use generated types in API client, hooks, and components
3. Never create manual type definitions that duplicate OpenAPI schemas
4. If types are missing, update OpenAPI spec first, then regenerate

**Example:**
```typescript
// ✅ CORRECT: Use generated types
import type { SearchRequest, SearchResponse } from '@/shared/types/generated/api';

// ❌ WRONG: Manual type definition
interface SearchRequest {
  query: string;
  scope: string;
}
```

### TypeScript Best Practices

**Type Safety:**
- Use strict TypeScript configuration (`strict: true`)
- Leverage discriminated unions for error responses (see SRS Section 6.3.1)
- Use `satisfies` operator for type-checked constants
- Prefer `const` assertions for literal types

**Error Handling Pattern:**
```typescript
// Use error.code for type-safe error handling
if (error.code === 'AUTH_GOOGLE_DISCONNECTED') {
  // TypeScript knows error.details.connectUrl exists
  const connectUrl = error.details.connectUrl;
  // Show connect button
}
```

**Zod Schema Validation:**
- Use Zod for runtime validation of API responses
- Align Zod schemas with OpenAPI definitions
- Use `.passthrough()` to allow `_meta` and future fields
- Validate at API client boundary, not in components

### Security-First Implementation

**Authentication:**
- Never store tokens in localStorage (use Kinde SDK memory storage)
- Always validate domain restriction on backend (frontend check is UX only)
- Implement token refresh handling before token expiry
- Use secure session cookies for OAuth state (backend responsibility)

**Input Validation:**
- Client-side validation is UX only; backend is authoritative
- Enforce max lengths (query: 500 chars, message: 4000 chars)
- Sanitize all user input before display (prevent XSS)
- Use DOMPurify for Markdown rendering

**CORS & CSP:**
- Never use wildcards in production CORS policy
- Align CSP `connect-src` with CORS allowed origins
- Test CORS preflight handling for all endpoints
- Log rejected origins as security events

### Error Handling Patterns

**Structured Error Responses:**
```typescript
// Always use error.code, never message strings
if (error.code === 'RATE_LIMITED') {
  const retryAfter = error.retryAfterSeconds ?? 30;
  showCountdownTimer(retryAfter);
}

// Display requestId for support
if (error.requestId) {
  showSupportReference(error.requestId);
}
```

**Retry Logic:**
- Use `error.retryable` field as authoritative
- Implement exponential backoff with jitter
- Show "Retrying..." indicator during auto-retry
- Circuit breaker per endpoint (not global)

**Partial Success Handling:**
- Check `response.status === "partial"` for HTTP 207
- Display available results with warning banner
- Show failed datastores using `datastoreStatus`

### React Patterns

**Component Structure:**
- Use functional components with hooks
- Separate container components (data fetching) from presentational components
- Use React Hook Form for form management
- Leverage TanStack Query for API state management

**State Management:**
- TanStack Query for server state (API responses)
- URL params for shareable state (search query, scope)
- React Context for global UI state (theme, feature flags)
- sessionStorage for session-scoped data (X-Session-Id)

**Performance:**
- Use `React.memo` for expensive components
- Implement code splitting with React.lazy
- Optimize bundle size (target: <200KB gzipped initial)
- Use `useMemo` and `useCallback` judiciously

### Testing Approach

**Unit Tests (Vitest):**
- Test hooks in isolation with Testing Library
- Mock API calls with MSW handlers
- Test error handling paths explicitly
- Aim for 80% coverage (packages), 70% (app), 60% (UI)

**Integration Tests:**
- Use MSW for API mocking (matches OpenAPI spec)
- Test complete user flows (search → results → pagination)
- Test error scenarios (network failures, rate limits)
- Test authentication flows (login, domain rejection)

**E2E Tests (Playwright):**
- P0 scenarios: login, search, chat, logout
- Test responsive behavior (mobile, tablet, desktop)
- Test accessibility (keyboard navigation, screen readers)
- Run smoke tests on every PR

### Code Quality Standards

**Naming Conventions:**
- Components: PascalCase (`SearchInput.tsx`)
- Hooks: camelCase with `use` prefix (`useSearch.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Types/Interfaces: PascalCase (`SearchResult`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_QUERY_LENGTH`)

**File Organization:**
- Group by feature, not by type
- Co-locate related files (component + test + styles)
- Use index files for clean imports
- Keep shared code in `packages/`

**Code Review Checklist:**
- [ ] Types generated from OpenAPI (not manual)
- [ ] Error handling uses `error.code` (not message strings)
- [ ] Security requirements implemented (no localStorage tokens, CORS correct)
- [ ] Tests added for new functionality
- [ ] Demo Mode guard present (if applicable)
- [ ] requestId displayed in error states

---

## Common Pitfalls (Claude-Specific)

### Type Safety Pitfalls
1. **❌ Manual type definitions** → ✅ Generate from OpenAPI
2. **❌ Using `any` types** → ✅ Use proper TypeScript types or `unknown`
3. **❌ Error message string matching** → ✅ Use `error.code` for type-safe handling
4. **❌ Missing discriminated unions** → ✅ Use `oneOf`/`discriminator` in OpenAPI

### React Pitfalls
1. **❌ Storing tokens in component state** → ✅ Use Kinde SDK hooks
2. **❌ Fetching in components** → ✅ Use TanStack Query hooks
3. **❌ Missing loading states** → ✅ Always show loading indicators
4. **❌ Not handling errors** → ✅ Error boundaries + error states

### API Integration Pitfalls
1. **❌ Not using generated types** → ✅ Import from `@/shared/types/generated/api`
2. **❌ Missing requestId handling** → ✅ Display requestId in all error states
3. **❌ Ignoring retryable flag** → ✅ Implement retry logic based on `error.retryable`
4. **❌ Not validating responses** → ✅ Use Zod schemas for runtime validation

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
│       └── src/types/generated/api.ts  # Generated from OpenAPI
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

## Claude-Specific Tips

1. **Leverage TypeScript's type system:** Use discriminated unions, const assertions, and satisfies operator
2. **Generate types first:** Always generate OpenAPI types before writing API integration code
3. **Test error paths:** Explicitly test error handling, retry logic, and edge cases
4. **Security by default:** Never assume frontend validation is sufficient; backend is authoritative
5. **Use React patterns correctly:** TanStack Query for server state, URL params for shareable state
6. **Follow naming conventions:** Consistent naming makes code more maintainable
7. **Document complex logic:** Add comments for non-obvious decisions, especially security-related

---

## References

- **Full SRS:** `1. Research/VNlaw_WebApps_SRS_v1.5.2.md`
- **OpenAPI Spec:** `1. Research/openapi.yaml`
- **Sample Files:** `1. Research/samples/`
- **Universal Guide:** `Agents.md`

For detailed requirements, error codes, API contracts, and implementation guidance, refer to the full SRS document.

