# Implementation Phases

## 16. Required Next Artifacts

### 16.1 Blocking Artifacts (Required Before Phase 2)

| Artifact | Status | Owner | Notes |
|----------|--------|-------|-------|
| `openapi.yaml` | ✅ Complete | IT | Located at `1. Research/openapi.yaml`; v1.0.3 with OAuth endpoints + CORS contract |
| Sample JSON files | ✅ Complete | IT | Located at `1. Research/samples/` |
| OAuth security implementation | ❌ Required | Backend | **BLOCKER:** See Section 16.1.1 |
| Token storage security | ❌ Required | Backend | **BLOCKER:** See Section 16.1.2 |

#### 16.1.1 OpenAPI OAuth Endpoints Specification (✅ RESOLVED - Issue #1)

> ✅ **RESOLVED:** OAuth endpoints are fully specified in OpenAPI v1.0.3 and ready for implementation.

##### GET /v1/oauth/google/connect
- **Purpose:** Initiate Google Workspace OAuth flow
- **Authentication:** Public endpoint (no Authorization header required)
- **Security:** Issues cryptographically strong `state` token; stores state with session binding, PKCE verifier hash, redirect URL; enforces redirect allowlist

##### GET /v1/oauth/google/callback
- **Purpose:** Handle OAuth callback from Google
- **Security:** Validates `state` and PKCE, verifies Google account email matches Kinde user, exchanges code for tokens, encrypts tokens, deletes state token

##### DELETE /v1/me/workspace
- **Purpose:** Disconnect Google Workspace (revoke tokens)
- **Security:** Revokes refresh token, deletes UserTokens document, logs revocation event

**Acceptance Criteria:**
- Frontend can implement connect/disconnect purely from OpenAPI spec
- Backend can validate all security controls from spec requirements
- No SRS/OpenAPI drift for OAuth contract

#### 16.1.2 Token Storage Security Implementation (CRITICAL BLOCKER - Issue #5)

> ⚠️ **BLOCKER:** Before storing any OAuth tokens in production, the following MUST be implemented.

**Cloud KMS Setup**
- Create KMS key ring: `vnlaw-tokens`
- Create KMS key: `oauth-tokens`
- Grant Cloud Run service account `cloudkms.cryptoKeyEncrypterDecrypter`

**Firestore Rules**
- Deny all client access to `UserTokens` collection
- Allow only backend service accounts

**Audit Logging**
- Enable Cloud Audit Logs for Firestore
- Log token access events with `requestId` correlation

**Acceptance:**
- Tokens are encrypted at rest
- Token reads are auditable
- Revocation works and is tested

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

**Prerequisites:** Kinde tenant and application configured (external setup required before implementation)

Before starting Phase 1 implementation, the following Kinde tenant configuration must be complete:
1. Kinde tenant created (e.g., `vnlaw-app.kinde.com`)
2. Application created in Kinde tenant (type: "Regular Web Application")
3. Callback URLs configured:
   - `https://vnlaw.app/callback`
   - `https://staging.vnlaw.app/callback`
   - `http://localhost:5173/callback`
4. Allowed logout URLs configured:
   - `https://vnlaw.app`
   - `https://staging.vnlaw.app`
   - `http://localhost:5173`
5. Allowed origins configured:
   - `https://vnlaw.app`
   - `https://staging.vnlaw.app`
   - `http://localhost:5173`
6. Environment variables available for developers:
   - `VITE_KINDE_DOMAIN`
   - `VITE_KINDE_CLIENT_ID`
   - `VITE_KINDE_REDIRECT_URI`
   - `VITE_KINDE_LOGOUT_URI`
   - `VITE_ALLOWED_DOMAIN`

These prerequisites and their values MUST be documented in the project README before Phase 1 begins.

**Tasks (in order):**
- [x] Initialize Vite + React + TypeScript project with monorepo structure
- [x] Configure Tailwind CSS and install shadcn/ui
- [x] Set up ESLint, Prettier, and TypeScript strict mode
- [x] Install and configure Kinde React SDK
- [x] Implement login/logout flow with Google SSO
- [x] Add domain restriction check (`@vnlaw.com.vn`)
- [x] Create protected route wrapper component
- [x] Implement `/access-denied` page
- [x] Create basic layout shell (header, main, footer)
- [x] Configure Netlify deployment with `_redirects` for SPA
- [x] Set up environment variables for Kinde

**Status:** ✅ **COMPLETE** (2025-12-26) - All tasks completed, exit criteria met, code quality fixes applied.

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
- [x] User can visit `vnlaw.app` and see login button
- [x] User can authenticate via Google (Kinde)
- [x] Non-`@vnlaw.com.vn` users are redirected to `/access-denied`
- [x] Authenticated users see empty dashboard
- [x] Logout works and clears session
- [x] Site deploys successfully to Netlify

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
- [ ] Add search history to localStorage (store preview only per Section 7.3.10)
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

**Post-MVP Enhancement:** Add SSE streaming support when `STREAMING_ENABLED` flag is true. See `SRS/04-api-contracts.md` Section 6.2.4 for streaming implementation notes.

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
