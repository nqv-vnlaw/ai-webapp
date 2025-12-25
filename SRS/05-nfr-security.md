# NFR & Security

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

#### 7.3.8 OAuth Token Storage Security (BLOCKER - Issue #5)

> ⚠️ **CRITICAL:** Token storage security must be implemented before storing any OAuth tokens in production.

**Summary of mandatory controls:**
1. **Envelope encryption with Cloud KMS** (non-negotiable)
   - All OAuth tokens MUST be encrypted before storage in Firestore
   - Use dedicated KMS key: `vnlaw-tokens/oauth-tokens`
2. **Firestore security rules** deny all client access to UserTokens collection
3. **Audit logging** enabled for all token access (Cloud Audit Logs for Firestore)
4. **Revocation capability** via DELETE `/v1/me/workspace`
5. **Never log plaintext tokens** (see Section 7.5.3)

**Acceptance:**
- Tokens never readable in plaintext by unauthorized principals
- Token reads are auditable with requestId correlation
- Revocation is possible and tested
- Production logs do not contain plaintext tokens

**References:** Sections 3.4.1, 16.1.2

#### 7.3.9 Token Persistence Edge Cases (Issue #23)

This section documents edge case behaviors for Kinde authentication tokens and Google OAuth tokens to ensure consistent UX.

##### Kinde Token Expiry (Session Timeout)
- Kinde SDK attempts silent refresh
- If refresh fails: redirect to login, show "Your session has expired. Please log in again."

##### Browser Tab Close/Reopen (Session Restoration)
- Kinde SDK refreshes via cookie if valid
- New tab = new `X-Session-Id` (sessionStorage per tab)

##### Browser Crash/Restore
- Same behavior as tab close/reopen
- Each restored tab gets a new `X-Session-Id`

##### Google OAuth Token Expiry (Access Token)
- Backend refreshes access token using refresh token
- If refresh fails: return `AUTH_GOOGLE_DISCONNECTED` and prompt reconnect

##### Google OAuth Token Revocation (User-Initiated)
- Backend deletes UserTokens document on detection
- Return `AUTH_GOOGLE_DISCONNECTED` with reconnect prompt

##### Long Idle Period (Both Tokens Expired)
- Kinde re-auth required after refresh token expiry
- Google Workspace connection survives if Google tokens still valid

##### Network Failure During OAuth
- If OAuth callback fails due to network, show error and allow retry
- Do not mark connection as successful without `/v1/me` verification

##### Concurrent Tab OAuth (Race Condition)
- Each tab gets unique `state` token
- Last-write-wins is acceptable (tokens are for same user)

**Acceptance:**
- No crashes or auth loops during edge cases
- User can recover via reconnect or re-login
- `X-Session-Id` remains per-tab and not reused across sessions

#### 7.3.10 Recent Searches Privacy

Storing recent searches in localStorage can expose sensitive legal queries:
- Store only **query preview** (first 50 chars) or **hash** of full query
- Consider using **sessionStorage** instead of localStorage for higher privacy
- Provide user option to disable search history

### 7.4 Accessibility
- WCAG 2.1 AA target for core flows.
- Full keyboard navigation for search, chat, citations, modals.

### 7.5 Observability

#### 7.5.1 Client-Side Identifiers

**X-Session-Id (Issue #18):**
- **Format:** UUID v4 (`crypto.randomUUID()`)
- **Lifecycle:** Per browser tab (stored in `sessionStorage`)
- **Entropy:** Minimum 122 bits (UUID v4 standard)
- **Collision handling:**
  - Backend SHOULD detect improbable collisions (same session ID for different users)
  - On collision: reject with HTTP 400 and log as security event
- **Privacy:**
  - Do NOT log raw session IDs in production logs
  - Log `SHA-256(sessionId)` if correlation needed
- **Purpose:** Track user actions within a single browser session for UX analytics and support

**Implementation:**
```typescript
// On app init
let sessionId = sessionStorage.getItem('sessionId');
if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem('sessionId', sessionId);
}
```

**X-Request-Id:**
- **Format:** UUID v4 (client-generated per API call)
- **Purpose:** Client-side request correlation
- **Note:** Backend returns its own `requestId` in response body (see Section 6.2.1.1)

**Demo Mode:**
- Both IDs must be generated even in **Demo Mode** to ensure correlation plumbing is tested

**Acceptance:**
- Session IDs are unique per tab
- Session IDs are stable for tab lifetime
- Session IDs are not leaked in production logs (hashed only)

#### 7.5.2 Structured Event Logging

Log structured events (PII-safe) for:
- Navigation events (route changes)
- Search submit/complete (query length, scope, result count, duration)
- Chat send/complete (scope, citation count, duration)
- Auth events (login, logout, token refresh)
- Errors (code, requestId, retryable)

#### 7.5.3 Production Logging Restrictions

##### Never Log (Plaintext)
- **Authentication tokens** (Kinde JWT, Google OAuth tokens)
- **User search queries** (legal matters are sensitive - may contain case details, client info)
- **Chat message bodies** (conversations may contain PII/privileged information)
- **Full authorization headers** (`Authorization: Bearer <token>`)
- **Personally Identifiable Information** (email in logs acceptable only in structured fields for correlation)

##### Allowed Diagnostics
For search and chat requests, production logs MAY include:
- `requestId`, `conversationId`, `messageId` (from response)
- `X-Session-Id` (hashed as `SHA-256(sessionId)` - NOT plaintext)
- Query/message **length** (character count)
- **Hashed query** (salted SHA-256) if needed for deduplication analysis
- HTTP status code
- Latency (ms)
- Error codes (without sensitive details)
- Scope selection (e.g., "precedent", "workspace")
- Result/citation count

##### Security Event Logging (Always Allowed)
These events MUST be logged:
- Authentication failures (with reason code, NOT credentials)
- Authorization rejections (with requestId, userId, attempted resource)
- Rate limit violations (userId, endpoint, timestamp)
- CORS violations (rejected origin, requestId)
- OAuth security violations:
  - State token mismatch
  - PKCE validation failure
  - Identity mismatch (wrong Google account)
  - Invalid redirect attempt
  - Token encryption/decryption errors

##### Implementation
- **Structured logging** with `severity` field (DEBUG, INFO, WARN, ERROR, CRITICAL)
- **Log scrubbing middleware** to strip sensitive fields before export
- **Separate log sinks** for security events (higher retention, 90 days minimum)
- **Never use** `console.log` in production (use structured logger only)

**Acceptance:**
- Production logs cannot reconstruct user legal queries or chat messages
- Security events are logged with appropriate severity
- Token values never appear in logs (encrypted or plaintext)

#### 7.5.4 Support Reference

- Surface backend `requestId` in UI for all errors
- Format: "Error ID: {requestId}" with copy button
- Users can provide this ID to support for investigation
