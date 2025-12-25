# Gemini AI Agent Quick Reference Guide

> **For Gemini AI:** This guide provides Gemini-specific guidance for implementing the VNlaw Web Apps frontend platform with emphasis on comprehensive understanding, phased implementation, and edge case handling.

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

## Implementation Phases (Detailed)

### Phase 1: Project Scaffolding
**Goal:** Deployable skeleton with authentication working

**Prerequisites:**
- Kinde tenant configured (domain restriction enabled)
- Kinde application created with callback URLs
- Environment variables documented

**Key Tasks:**
1. Initialize Vite + React + TypeScript monorepo
2. Configure Tailwind CSS and shadcn/ui
3. Set up ESLint, Prettier, TypeScript strict mode
4. Install and configure Kinde React SDK
5. Implement login/logout flow with Google SSO
6. Add domain restriction check (`@vnlaw.com.vn`)
7. Create protected route wrapper component
8. Implement `/access-denied` page
9. Create basic layout shell (header, main, footer)
10. Configure Netlify deployment with `_redirects` for SPA
11. Set up environment variables for Kinde

**Exit Criteria:**
- [ ] User can visit `vnlaw.app` and see login button
- [ ] User can authenticate via Google (Kinde)
- [ ] Non-`@vnlaw.com.vn` users are redirected to `/access-denied`
- [ ] Authenticated users see empty dashboard
- [ ] Logout works and clears session
- [ ] Site deploys successfully to Netlify

**Reference:** SRS Section 17.1

### Phase 2: API Client & Core Infrastructure
**Goal:** Typed API client with authentication headers and error handling

**Prerequisites:** Phase 1 complete

**Key Tasks:**
1. Create `packages/api-client` package
2. Define TypeScript interfaces from OpenAPI (generate types)
3. Implement base fetch wrapper with Kinde token injection
4. Add `X-Session-Id` header generation and persistence (sessionStorage)
5. Implement standard error response handling
6. Create retry logic with exponential backoff
7. Add circuit breaker pattern (per-endpoint, not global)
8. Set up TanStack Query provider and configuration
9. Create API hooks: `useSearch`, `useChat` (note: `useChatStream` is post-MVP)
10. Add rate limit header parsing and display

**Exit Criteria:**
- [ ] API client sends Kinde token in `Authorization` header
- [ ] API client sends `X-Session-Id` on every request
- [ ] Error responses are parsed into typed objects
- [ ] Retry logic works for 503/504 errors
- [ ] Circuit breaker opens after 5 consecutive failures

**Reference:** SRS Section 17.2

### Phase 3: Search Feature
**Goal:** Complete search functionality with results display

**Prerequisites:** Phase 2 complete

**Key Tasks:**
1. Create `SearchInput` component with validation
2. Create `ScopeSelector` component (precedent only for MVP)
3. Create `SearchResults` container component
4. Create `SearchResultCard` component with metadata display
5. Implement URL state sync (`/?q=...&scope=...`) — see Section 8.2 for MVP URL pattern
6. Add "Load more" pagination with cursor support
7. Create empty state component with suggestions
8. Create loading skeleton components
9. Add search history to localStorage (store preview only per Section 7.3.8)
10. Implement query length validation (max 500 chars)

**Exit Criteria:**
- [ ] User can enter a query and see results
- [ ] Results display title, snippet, source, and link
- [ ] "Load more" loads additional results
- [ ] Empty queries are rejected
- [ ] Queries > 500 chars show error
- [ ] URL reflects current search state
- [ ] Browser back/forward works correctly

**Reference:** SRS Section 17.3

### Phase 4: Chat Feature (Non-Streaming MVP)
**Goal:** Question-answering interface with citations

**Prerequisites:** Phase 3 complete

**Key Tasks:**
1. Create `ChatContainer` component
2. Create `ChatMessage` component (user/assistant variants)
3. Create `ChatInput` component with submit handling
4. Implement loading state with "Generating answer..." indicator
5. Create `CitationsPanel` component (see Section 5.3.1 for rendering rules)
6. Create `CitationCard` component
7. Add conversation state management (in-memory)
8. Implement "Regenerate" button functionality
9. Add copy-to-clipboard for answers
10. Create markdown export functionality
11. Handle API errors gracefully (show error with retry option)

**Exit Criteria:**
- [ ] User can ask questions and see answers
- [ ] Loading state shows "Generating answer..." during API call
- [ ] Citations appear in sidebar after response received (deduplicated, ordered per Section 5.3.1)
- [ ] "Regenerate" re-fetches the last answer
- [ ] Copy button works for answer text
- [ ] API errors show user-friendly message with retry option

**Reference:** SRS Section 17.4

### Phase 5: Error Handling & Feedback
**Goal:** Production-ready error handling and user feedback

**Prerequisites:** Phase 4 complete

**Key Tasks:**
1. Create global error boundary component
2. Create toast/notification system for errors
3. Implement "Retrying..." indicator during auto-retry
4. Add manual retry buttons after max retries
5. Create circuit breaker UI (countdown + "Try now")
6. Implement feedback component (thumbs up/down)
7. Add optional comment input for feedback
8. Create feedback submission API call
9. Ensure no PII in feedback payload
10. Add `requestId` display for support

**Exit Criteria:**
- [ ] Network errors show user-friendly messages
- [ ] "Retrying..." appears during automatic retries
- [ ] Manual retry available after max retries
- [ ] Circuit breaker shows countdown when open
- [ ] Thumbs up/down works on answers
- [ ] Feedback submission succeeds
- [ ] Request ID visible for support

**Reference:** SRS Section 17.5

### Phase 6: Polish & Responsive Design
**Goal:** Mobile-responsive UI and accessibility compliance

**Prerequisites:** Phase 5 complete

**Key Tasks:**
1. Add responsive breakpoints to all components
2. Convert citations panel to bottom sheet on mobile
3. Ensure touch targets ≥ 44×44px
4. Add keyboard navigation to all interactive elements
5. Run axe-core and fix accessibility issues
6. Add focus indicators and ARIA labels
7. Optimize bundle size (code splitting)
8. Add loading states for all async operations
9. Implement "cached results" warning display
10. Add session timeout handling

**Exit Criteria:**
- [ ] UI works on mobile, tablet, and desktop
- [ ] All interactive elements are keyboard accessible
- [ ] axe-core reports no critical violations
- [ ] Initial bundle < 200KB gzipped
- [ ] Touch targets meet minimum size
- [ ] Cached results show warning indicator

**Reference:** SRS Section 17.6

### Phase 7: Testing & Quality Gates
**Goal:** Test coverage and CI/CD pipeline

**Prerequisites:** Phase 6 complete

**Key Tasks:**
1. Set up Vitest with Testing Library
2. Write unit tests for API client (80% coverage)
3. Write unit tests for hooks (70% coverage)
4. Write component tests (60% coverage)
5. Set up MSW for API mocking in tests
6. Write integration tests for auth flow
7. Write integration tests for search flow
8. Write integration tests for chat flow
9. Set up Playwright for E2E tests
10. Write P0 E2E scenarios (login, search, chat, logout)
11. Configure Lighthouse CI on PRs
12. Set up GitHub Actions for CI

**Exit Criteria:**
- [ ] Unit test coverage meets targets
- [ ] All P0 E2E scenarios pass
- [ ] Lighthouse score ≥ 80 performance, ≥ 90 accessibility
- [ ] CI runs tests on every PR
- [ ] No critical security vulnerabilities

**Reference:** SRS Section 17.7

**Phase Dependencies:**
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

---

## Gemini-Specific Implementation Guidance

### Phased Implementation Approach

**Follow phases sequentially:**
1. Complete each phase fully before moving to the next
2. Verify all exit criteria are met
3. Run tests and linting before marking phase complete
4. Document any deviations or decisions made

**Dependency Checking:**
- Before starting a phase, verify all prerequisites are met
- Check that previous phase's exit criteria are satisfied
- Ensure external dependencies (Kinde config, backend endpoints) are ready

**Acceptance Criteria Verification:**
- For each phase, verify all acceptance criteria from SRS
- Test both happy paths and error scenarios
- Verify security requirements are met
- Check performance budgets are not exceeded

### Comprehensive Requirement Coverage

**Edge Case Handling:**
- Token expiry scenarios (Kinde and Google OAuth)
- Browser tab close/reopen (session restoration)
- Network failures during OAuth callback
- Concurrent tab OAuth (race conditions)
- Long idle periods (both tokens expired)
- Partial success scenarios (HTTP 207)

**Token Persistence Edge Cases (SRS Section 7.3.9):**
1. **Kinde Token Expiry:** Silent refresh via SDK; redirect to login on failure
2. **Browser Tab Close/Reopen:** Session restoration via refresh token (secure cookie)
3. **Browser Crash/Restore:** Same as tab close/reopen
4. **Google OAuth Token Expiry:** Backend refreshes transparently; return `AUTH_GOOGLE_DISCONNECTED` if refresh fails
5. **Google OAuth Token Revocation:** Backend detects and deletes tokens; return `AUTH_GOOGLE_DISCONNECTED`
6. **Long Idle Period:** User must re-authenticate to Kinde; Google connection preserved if tokens valid
7. **Network Failure During OAuth:** Show error message; allow retry with new OAuth flow
8. **Concurrent Tab OAuth:** Each tab gets unique state token; last-write-wins is acceptable

**Testing Requirements:**
- Simulate token expiry (mock short TTLs)
- Test browser dev tools "Offline" mode during OAuth
- Test multi-tab scenarios manually
- Use Firestore emulator for token storage testing

### Architecture Deep-Dive

**BFF Pattern Understanding:**
- Frontend is presentation layer only
- All business logic in Cloud Run BFF
- Frontend never directly calls Discovery Engine or other GCP services
- BFF handles token mapping (Kinde → Google OAuth)

**Dual Authentication Flow:**
1. User authenticates with Kinde (Google SSO)
2. Kinde issues JWT token (stored in memory by SDK)
3. For Workspace features, backend checks for Google OAuth tokens
4. If missing, backend returns `AUTH_GOOGLE_DISCONNECTED` with `connectUrl`
5. Frontend redirects to `connectUrl` to initiate Google OAuth
6. Backend stores encrypted Google tokens in Firestore `UserTokens`
7. Backend maps Kinde user ID → Google tokens for subsequent requests

**State Management Strategy:**
- **Server State:** TanStack Query (API responses, caching)
- **URL State:** Search query, scope (shareable, bookmarkable)
- **UI State:** React Context (theme, feature flags, modals)
- **Session State:** sessionStorage (X-Session-Id, per-tab)
- **User Preferences:** localStorage (theme, results per page)

### Error Handling Comprehensive Approach

**Error Response Structure:**
```typescript
{
  error: {
    code: "ERROR_CODE",           // Use this for type-safe handling
    message: "Human readable",    // Display to user
    requestId: "uuid-string",     // Always present, show to user
    details: {},                  // Type-specific (e.g., connectUrl for AUTH_GOOGLE_DISCONNECTED)
    retryable: true,              // Authoritative for retry logic
    retryAfterSeconds: 30         // In seconds, not milliseconds
  }
}
```

**Retry Decision Matrix:**
- Use `error.retryable` as authoritative
- Check `Retry-After` header first, then `retryAfterSeconds`, then default backoff
- Implement per-endpoint circuit breaker (not global)
- Show countdown timer during retry wait
- Display requestId in all error states

**Partial Success Handling:**
- HTTP 207 indicates some datastores succeeded, some failed
- Check `response.status === "partial"`
- Display available results with warning banner
- Show failed datastores using `datastoreStatus[scope].error`
- Example: "⚠️ Workspace search unavailable. Google Workspace not connected."

### Security-First Implementation

**Token Security:**
- Never store tokens in localStorage (use Kinde SDK memory storage)
- Backend MUST enforce domain restriction (frontend check is UX only)
- OAuth tokens encrypted with Cloud KMS before Firestore storage
- Never log plaintext tokens (hash session IDs if logging needed)

**CORS & CSP:**
- Production: exact match only (no wildcards)
- Preview: restricted pattern or allowlist
- CSP `connect-src` must match CORS allowed origins
- Test CORS preflight handling for all endpoints

**Input Validation:**
- Client-side validation is UX only
- Backend validation is authoritative
- Enforce max lengths (query: 500, message: 4000)
- Sanitize all user input (prevent XSS)

**Demo Mode Guards:**
- Build-time check: fail if `VITE_ENV=production` AND `VITE_DEMO_MODE=true`
- Runtime check: throw error if both conditions true
- Always show Demo Mode banner when active

### Testing Comprehensive Approach

**Unit Tests:**
- Test hooks in isolation
- Mock API calls with MSW
- Test error handling paths explicitly
- Test edge cases (token expiry, network failures)

**Integration Tests:**
- Use MSW for API mocking (matches OpenAPI spec)
- Test complete user flows
- Test error scenarios
- Test authentication flows

**E2E Tests:**
- P0 scenarios: login, search, chat, logout
- Test responsive behavior
- Test accessibility
- Run smoke tests on every PR

**Performance Testing:**
- Lighthouse CI on PRs
- Target: ≥80 performance, ≥90 accessibility
- Bundle size: <200KB gzipped initial
- TTI < 3.5s (4G throttling)

---

## Common Pitfalls (Gemini-Specific)

### Phased Implementation Pitfalls
1. **❌ Starting next phase before completing current** → ✅ Verify all exit criteria met
2. **❌ Skipping prerequisite checks** → ✅ Verify dependencies before starting
3. **❌ Not testing edge cases** → ✅ Test all scenarios from SRS Section 7.3.9

### Edge Case Pitfalls
1. **❌ Not handling token expiry** → ✅ Implement silent refresh and error handling
2. **❌ Ignoring concurrent tab scenarios** → ✅ Each tab gets unique state token
3. **❌ Not testing network failures** → ✅ Test offline mode, OAuth callback failures
4. **❌ Missing partial success handling** → ✅ Check HTTP 207 and `status === "partial"`

### Security Pitfalls
1. **❌ Storing tokens in localStorage** → ✅ Use Kinde SDK memory storage
2. **❌ Client-side domain validation only** → ✅ Backend MUST enforce
3. **❌ CORS wildcards in production** → ✅ Exact match only
4. **❌ Plaintext tokens in logs** → ✅ Never log tokens; hash session IDs
5. **❌ Demo Mode in production** → ✅ Build-time AND runtime guards

### Implementation Pitfalls
1. **❌ Manual TypeScript types** → ✅ Generate from OpenAPI spec
2. **❌ Frontend citation deduplication** → ✅ Backend deduplicates; frontend displays as-provided
3. **❌ Using EventSource for streaming** → ✅ Use `fetch()` + `ReadableStream` (post-MVP)
4. **❌ Missing `/callback` route** → ✅ Required for Kinde OAuth callback
5. **❌ Feature flags not loaded before UI render** → ✅ Fetch flags on app mount, wait before rendering

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

## Gemini-Specific Tips

1. **Follow phases sequentially:** Complete each phase fully before moving to the next
2. **Test edge cases comprehensively:** Reference SRS Section 7.3.9 for token persistence scenarios
3. **Verify acceptance criteria:** Check all exit criteria before marking phase complete
4. **Handle partial success:** Implement HTTP 207 handling with warning banners
5. **Test concurrent scenarios:** Multi-tab OAuth, network failures, token expiry
6. **Security by default:** Never assume frontend validation is sufficient
7. **Comprehensive error handling:** Test all error codes and retry scenarios
8. **Performance budgets:** Monitor bundle size and Lighthouse scores throughout development

---

## References

- **Full SRS:** `1. Research/VNlaw_WebApps_SRS_v1.5.2.md`
- **OpenAPI Spec:** `1. Research/openapi.yaml`
- **Sample Files:** `1. Research/samples/`
- **Universal Guide:** `Agents.md`
- **Token Persistence Edge Cases:** SRS Section 7.3.9
- **Implementation Phases:** SRS Section 17

For detailed requirements, error codes, API contracts, and implementation guidance, refer to the full SRS document.

