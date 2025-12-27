# Phase 5 Development Prompts

Phase 5 implements error handling and user feedback per SRS Section 17.5.

**Requirement Coverage:** FR-ERR-01 through FR-ERR-03, FR-FB-01, FR-FB-02

**PR Boundary:** Single PR titled `feat: error handling, feedback, and resilience`

---

## Prompt 1: Feature Flags Hook & Feedback API

**Goal:** Create feature flag infrastructure and feedback API hook

**Tasks:**

1. Create `useFeedback` API hook in `packages/api-client/src/hooks/useFeedback.ts`
   - Call `POST /v1/feedback` endpoint
   - Types from OpenAPI: `FeedbackRequest`, `FeedbackResponse`
   - Use TanStack Query `useMutation`
   - Request payload:
     ```typescript
     {
       conversationId: string;
       messageId: string;
       rating: 'positive' | 'negative';
       comment?: string;
     }
     ```

2. Create `useFlags` API hook in `packages/api-client/src/hooks/useFlags.ts`
   - Call `GET /v1/flags` endpoint (already mocked in MSW handlers)
   - Return flags object with types:
     ```typescript
     {
       FEEDBACK_ENABLED: boolean;
       EXPORT_ENABLED: boolean;
       STREAMING_ENABLED: boolean;
       WORKSPACE_SEARCH_ENABLED: boolean;
       CHAT_HISTORY_ENABLED: boolean;
       INFOBANK_SEARCH_ENABLED: boolean;
     }
     ```

3. Create `useFeatureFlags` hook in `apps/precedent-search/src/hooks/useFeatureFlags.ts`
   - Consume useFlags from api-client
   - Cache flags for session duration (staleTime: Infinity)
   - Return: `{ flags, isLoading, error }`

4. Create `FeatureFlagProvider` context in `apps/precedent-search/src/contexts/FeatureFlags.tsx`
   - Wrap app with provider
   - Provide `useFlags()` hook for consuming flags
   - Default flags for loading state

5. Update `packages/api-client/src/hooks/index.ts` to export new hooks

**Files to Create:**
```
packages/api-client/src/hooks/useFeedback.ts
packages/api-client/src/hooks/useFlags.ts
apps/precedent-search/src/hooks/useFeatureFlags.ts
apps/precedent-search/src/contexts/FeatureFlags.tsx
apps/precedent-search/src/contexts/index.ts
```

**Files to Modify:**
```
packages/api-client/src/hooks/index.ts
packages/api-client/src/index.ts
apps/precedent-search/src/hooks/index.ts
```

**Exit Criteria:**
- [ ] useFeedback hook calls POST /v1/feedback with proper types
- [ ] useFlags hook fetches feature flags from GET /v1/flags
- [ ] FeatureFlagProvider created and exports useFlags context hook
- [ ] Hooks properly exported from packages
- [ ] Linting and type checking pass

---

## Prompt 2: Error Boundary & Toast Notification System

**Goal:** Create global error handling infrastructure

**Tasks:**

1. Create `ErrorBoundary` component in `apps/precedent-search/src/components/error/ErrorBoundary.tsx`
   - Class component that catches React rendering errors
   - Show fallback UI with:
     - "Something went wrong" message
     - Error message (in dev mode only)
     - requestId if available from error context
     - "Reload Page" button
   - Log errors to console
   - Props: `{ children, fallback?: ReactNode }`

2. Create `Toast` component in `apps/precedent-search/src/components/error/Toast.tsx`
   - Toast notification for messages
   - Tailwind CSS styling only (no external library)
   - Variants: 'error' (red), 'success' (green), 'warning' (yellow), 'info' (blue)
   - Auto-dismiss after configurable duration (default 5s)
   - Show message, optional requestId, dismiss button
   - Animate in/out with Tailwind transitions
   - Props: `{ id, message, type, requestId?, onDismiss, duration? }`

3. Create `ToastContainer` component in `apps/precedent-search/src/components/error/ToastContainer.tsx`
   - Renders toast stack (max 5 visible)
   - Fixed position (bottom-right on desktop, bottom-center on mobile)
   - Proper z-index (z-50)

4. Create `ToastProvider` context in `apps/precedent-search/src/contexts/Toast.tsx`
   - `showToast(message, type, options?)` function
   - `showError(message, requestId?)` convenience function
   - `showSuccess(message)` convenience function
   - Auto-generate toast IDs
   - Manage toast state (add, remove, auto-dismiss)
   - Export `useToast()` hook

5. Update `App.tsx` to wrap with ErrorBoundary and ToastProvider

**Files to Create:**
```
apps/precedent-search/src/components/error/ErrorBoundary.tsx
apps/precedent-search/src/components/error/Toast.tsx
apps/precedent-search/src/components/error/ToastContainer.tsx
apps/precedent-search/src/components/error/index.ts
apps/precedent-search/src/contexts/Toast.tsx
```

**Files to Modify:**
```
apps/precedent-search/src/App.tsx
apps/precedent-search/src/contexts/index.ts
```

**Exit Criteria:**
- [ ] ErrorBoundary catches React rendering errors
- [ ] Fallback UI shows error message and reload button
- [ ] Toast component renders with proper styling for all variants
- [ ] ToastProvider exposes showToast, showError, showSuccess functions
- [ ] Toasts auto-dismiss after timeout
- [ ] App.tsx wraps children with ErrorBoundary and ToastProvider
- [ ] Linting and type checking pass

---

## Prompt 3: Retry UI Components

**Goal:** Implement visual retry indicators per FR-ERR-02 and FR-ERR-03

**Tasks:**

1. Create `RetryIndicator` component in `apps/precedent-search/src/components/error/RetryIndicator.tsx`
   - Show "Retrying..." text during automatic retries
   - Display retry count: "Retry 2 of 3..."
   - Animated spinner (Tailwind animate-spin)
   - Subtle background color (gray-50)
   - Props: `{ isRetrying, retryCount, maxRetries }`

2. Create `ManualRetryButton` component in `apps/precedent-search/src/components/error/ManualRetryButton.tsx`
   - Show after max retries exceeded
   - "Try Again" button with loading state
   - Error message display
   - requestId display for support reference
   - Props: `{ onRetry, isLoading, error, requestId? }`

3. Create `CircuitBreakerUI` component in `apps/precedent-search/src/components/error/CircuitBreakerUI.tsx`
   - Show when circuit breaker is open
   - Message: "Service temporarily unavailable"
   - Countdown timer showing seconds until recovery
   - "Try Now" button for half-open test (manual override)
   - Props: `{ isOpen, recoveryTimeMs, onTryNow }`
   - Use `useEffect` with `setInterval` for countdown

4. Create `useRetryState` hook in `apps/precedent-search/src/hooks/useRetryState.ts`
   - Track retry attempts per request key
   - State: `{ retryCount, isRetrying, maxRetriesExceeded, reset }`
   - Integrate with circuit breaker state from API client
   - Expose circuit breaker status: `{ isCircuitOpen, recoveryTime }`

5. Update error component exports

**Files to Create:**
```
apps/precedent-search/src/components/error/RetryIndicator.tsx
apps/precedent-search/src/components/error/ManualRetryButton.tsx
apps/precedent-search/src/components/error/CircuitBreakerUI.tsx
apps/precedent-search/src/hooks/useRetryState.ts
```

**Files to Modify:**
```
apps/precedent-search/src/components/error/index.ts
apps/precedent-search/src/hooks/index.ts
```

**Exit Criteria:**
- [ ] RetryIndicator shows "Retrying 2 of 3..." with spinner
- [ ] ManualRetryButton shows after max retries with error details
- [ ] CircuitBreakerUI shows countdown when circuit open
- [ ] "Try Now" button triggers half-open test
- [ ] useRetryState hook tracks retry state
- [ ] Linting and type checking pass

---

## Prompt 4: Feedback Component (Thumbs Up/Down)

**Goal:** Implement feedback UI per FR-FB-01 and FR-FB-02

**Tasks:**

1. Create `FeedbackButtons` component in `apps/precedent-search/src/components/feedback/FeedbackButtons.tsx`
   - Thumbs up/down icons (inline SVG, no icon library)
   - Props: `{ messageId, conversationId, disabled? }`
   - States: idle, selected (up or down), submitting, submitted
   - Visual feedback: filled icon when selected, gray when idle
   - Disabled state during submission
   - Success checkmark after submission
   - Accessibility: aria-label, keyboard navigation

2. Create `FeedbackModal` component in `apps/precedent-search/src/components/feedback/FeedbackModal.tsx`
   - Modal dialog (Tailwind, no library)
   - Triggered on thumbs down click
   - Optional comment textarea (max 500 chars with counter)
   - Character limit validation
   - Submit and Cancel buttons
   - Loading state during submission
   - Error handling with requestId display
   - Backdrop click to close
   - Props: `{ isOpen, onClose, onSubmit, isLoading, error? }`

3. Create `useFeedbackSubmit` hook in `apps/precedent-search/src/hooks/useFeedbackSubmit.ts`
   - Call `useFeedback` mutation from api-client
   - Build FeedbackRequest payload
   - **CRITICAL: Ensure no PII in payload (FR-FB-02)**
     - Only include: conversationId, messageId, rating, comment
     - NO user email, tokens, or sensitive data
   - Return: `{ submitFeedback, isLoading, error, isSuccess }`

4. Integrate FeedbackButtons into ChatMessage component
   - Only show on assistant messages
   - Conditionally render based on `FEEDBACK_ENABLED` feature flag
   - Pass messageId from useChat state (lastAssistantMessageId)
   - Pass conversationId from useChat state

5. Update ChatContainer to pass feedback props

**Files to Create:**
```
apps/precedent-search/src/components/feedback/FeedbackButtons.tsx
apps/precedent-search/src/components/feedback/FeedbackModal.tsx
apps/precedent-search/src/components/feedback/index.ts
apps/precedent-search/src/hooks/useFeedbackSubmit.ts
```

**Files to Modify:**
```
apps/precedent-search/src/components/chat/ChatMessage.tsx
apps/precedent-search/src/components/chat/ChatContainer.tsx
apps/precedent-search/src/hooks/index.ts
```

**Exit Criteria:**
- [ ] Thumbs up/down buttons visible on assistant messages
- [ ] Clicking thumbs down opens comment modal
- [ ] Thumbs up submits immediately (no modal)
- [ ] Comment modal validates 500 char limit
- [ ] Feedback submits to POST /v1/feedback
- [ ] No PII in feedback payload (verified in code review)
- [ ] Only visible when FEEDBACK_ENABLED=true
- [ ] Success indicator shows after submission
- [ ] Linting and type checking pass

---

## Prompt 5: Integration & Verification

**Goal:** Integrate all Phase 5 components and verify exit criteria

**Tasks:**

1. Update `App.tsx` provider hierarchy:
   ```tsx
   <ErrorBoundary>
     <ToastProvider>
       <FeatureFlagProvider>
         <ApiClientProvider>
           <AuthProvider>
             {/* routes */}
           </AuthProvider>
         </ApiClientProvider>
       </FeatureFlagProvider>
     </ToastProvider>
   </ErrorBoundary>
   ```

2. Update `SearchResults.tsx` to show retry UI:
   - Add RetryIndicator when search is retrying
   - Add ManualRetryButton after max retries
   - Add CircuitBreakerUI when circuit open
   - Use useRetryState hook
   - Show toast on recoverable errors

3. Update `ChatContainer.tsx` to show retry UI:
   - Add RetryIndicator when chat is retrying
   - Add ManualRetryButton after max retries
   - Add CircuitBreakerUI when circuit open
   - Integrate with useToast for error notifications

4. Update `ChatMessage.tsx` to show feedback:
   - Add FeedbackButtons for assistant messages
   - Conditionally render based on feature flag
   - Pass required props (messageId, conversationId)

5. Verify all error states display requestId:
   - SearchResults error banner ✅ (already done)
   - ChatContainer error banner ✅ (already done)
   - Toast notifications (add requestId support)
   - ManualRetryButton (add requestId display)
   - ErrorBoundary fallback

6. Update MSW handlers for error testing:
   - Add handler for simulating rate limit (429)
   - Add handler for simulating server error (500)
   - Add handler for simulating timeout (504)
   - Add toggle for circuit breaker testing

7. Run full verification:
   ```bash
   pnpm lint && pnpm typecheck && pnpm build
   ```

**Files to Modify:**
```
apps/precedent-search/src/App.tsx
apps/precedent-search/src/components/search/SearchResults.tsx
apps/precedent-search/src/components/chat/ChatContainer.tsx
apps/precedent-search/src/components/chat/ChatMessage.tsx
apps/precedent-search/src/mocks/handlers.ts
```

**Exit Criteria (Phase 5 Complete):**
- [ ] ErrorBoundary wraps entire app
- [ ] ToastProvider available throughout app
- [ ] FeatureFlagProvider loads and caches flags
- [ ] Network errors show user-friendly toast messages
- [ ] "Retrying..." indicator appears during automatic retries
- [ ] Manual retry button available after max retries
- [ ] Circuit breaker UI shows countdown when open
- [ ] Thumbs up/down works on assistant messages
- [ ] Feedback submission succeeds (verify in Network tab)
- [ ] Request ID visible in all error states
- [ ] Feature flag controls feedback visibility
- [ ] Linting and type checking pass
- [ ] Build succeeds

---

## Phase 5 Summary

| Prompt | Focus | Key Deliverables |
|--------|-------|------------------|
| 1 | Feature Flags | useFeedback, useFlags, FeatureFlagProvider |
| 2 | Error Handling | ErrorBoundary, Toast, ToastProvider |
| 3 | Retry UI | RetryIndicator, ManualRetryButton, CircuitBreakerUI |
| 4 | Feedback | FeedbackButtons, FeedbackModal, useFeedbackSubmit |
| 5 | Integration | Wire everything, verify all exit criteria |

---

## Files Created Summary

### packages/api-client/src/hooks/
- `useFeedback.ts` - POST /v1/feedback mutation
- `useFlags.ts` - GET /v1/flags query

### apps/precedent-search/src/contexts/
- `FeatureFlags.tsx` - Feature flag provider and hook
- `Toast.tsx` - Toast notification provider and hook
- `index.ts` - Context exports

### apps/precedent-search/src/components/error/
- `ErrorBoundary.tsx` - React error boundary
- `Toast.tsx` - Toast notification component
- `ToastContainer.tsx` - Toast stack container
- `RetryIndicator.tsx` - "Retrying..." indicator
- `ManualRetryButton.tsx` - Manual retry after max attempts
- `CircuitBreakerUI.tsx` - Circuit breaker countdown
- `index.ts` - Error component exports

### apps/precedent-search/src/components/feedback/
- `FeedbackButtons.tsx` - Thumbs up/down buttons
- `FeedbackModal.tsx` - Comment input modal
- `index.ts` - Feedback component exports

### apps/precedent-search/src/hooks/
- `useFeatureFlags.ts` - Feature flag consumption hook
- `useRetryState.ts` - Retry state tracking hook
- `useFeedbackSubmit.ts` - Feedback submission hook

---

## Verification Checklist

After completing all prompts, verify:

```bash
# Build passes
pnpm build

# Lint passes
pnpm lint

# Type check passes
pnpm typecheck

# Manual testing in browser:
# 1. Trigger a network error (disconnect network)
# 2. Verify "Retrying..." appears
# 3. Verify manual retry button after max retries
# 4. Click thumbs up on an assistant message
# 5. Click thumbs down and add a comment
# 6. Verify feedback submissions in Network tab
# 7. Verify requestId in error messages
```
