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
