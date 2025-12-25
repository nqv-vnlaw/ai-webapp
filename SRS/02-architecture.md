# Architecture

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
