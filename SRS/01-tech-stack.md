# Technology Stack

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
- Publish directory: `apps/precedent-search/dist` (monorepo path)
- Node version: current LTS (20.x)
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

**CORS Requirements (Backend):**

The BFF MUST implement dynamic CORS to allow requests from Netlify-hosted frontend:

**Allowed Origins (explicit allowlist):**
- `https://vnlaw.app` (production)
- `https://staging.vnlaw.app` (staging)
- `http://localhost:5173` (local development)
- `http://localhost:3000` (alternative local)

**Netlify Preview Handling (dynamic):**
```python
# Backend validates Origin header dynamically
ALLOWED_ORIGINS = [
    "https://vnlaw.app",
    "https://staging.vnlaw.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

# Validate origin against allowlist (see Section 3.3.1 for complete rules)
def validate_origin(origin: str, environment: str) -> str | None:
    if environment == 'production':
        # Production: exact match only
        if origin in ['https://vnlaw.app', 'https://staging.vnlaw.app']:
            return origin
    elif environment == 'preview':
        # Preview: restricted pattern or allowlist
        if origin and origin.startswith('https://') and origin.endswith('-vnlaw-app.netlify.app'):
            return origin
        if origin in ['http://localhost:5173', 'http://localhost:3000']:
            return origin
    return None  # Reject unknown origins
```

**Required Headers:**
- `Access-Control-Allow-Origin`: Echo validated origin (NOT wildcard)
- `Access-Control-Allow-Headers`: `Authorization`, `X-Session-Id`, `X-Request-Id`, `Content-Type`
- `Access-Control-Allow-Methods`: `GET`, `POST`, `DELETE`, `OPTIONS`
- `Access-Control-Max-Age`: `86400` (preflight cache)
- `Vary`: `Origin` (required when origin is dynamic)

Custom headers (`X-Session-Id`, `X-Request-Id`) trigger CORS preflight; backend MUST handle `OPTIONS` requests.

#### 3.3.1 CORS Security Policy

##### Production Environment
- **Allowed origins:** Exact match only
  - `https://vnlaw.app` (production)
  - `https://staging.vnlaw.app` (staging)
- **Forbidden:** Wildcard patterns like `*.netlify.app` (Issue #7)
- **Rationale:** Over-broad patterns allow malicious sites hosted on the same platform to attempt cross-origin calls

##### Preview Environment (Development/PR)
- **Allowed origins:**
  - `https://*-vnlaw-app.netlify.app` (restricted pattern for PR previews)
  - OR: Firestore allowlist of approved preview URLs (more restrictive)
  - `http://localhost:5173`, `http://localhost:3000` (local development)
- **Security note:** Never use unrestricted `*.netlify.app` in production

##### Preflight Handling (OPTIONS)
All API routes MUST respond to `OPTIONS` requests with:
- `Access-Control-Allow-Origin`: validated origin (echoed from request)
- `Access-Control-Allow-Methods`: `GET, POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Authorization, Content-Type, X-Session-Id, X-Request-Id`
- `Access-Control-Max-Age`: `86400` (24 hours)

##### Credentials
- `Access-Control-Allow-Credentials`: NOT used (tokens in Authorization header only)
- No cookies or session cookies relied upon for API authentication
- All authentication via Bearer token (Kinde JWT)

##### Implementation Note
- CORS validation MUST happen at the edge (Cloudflare Worker or Cloud Run ingress) before request reaches application logic
- Origin validation MUST use exact string matching (NOT regex suffix matching)
- Rejected origins MUST be logged as security events (see Section 7.5.3)

**Acceptance:**
- Production does not accept arbitrary Netlify origins
- Preview/staging origin rules are explicit and documented
- CORS and CSP policies align (same allowed origins)

**References:** Consolidated Review Issues #6, #7

### 3.4 Firestore (MVP persistence)
**Why selected**
- Already in use for token storage and session-like state.
- Low friction for MVP features (chat history, feedback, lightweight metadata).

**Role**
- Stores `UserTokens` (Google OAuth tokens keyed by user email).
- Stores sessions/conversation metadata for MVP (optional but recommended).

#### 3.4.1 UserTokens Collection Security (BLOCKER - Issue #5)

> ⚠️ **CRITICAL BLOCKER:** Token storage security must be implemented before storing any OAuth tokens in production.

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

**References:** Sections 7.3.8, 16.1.2

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
