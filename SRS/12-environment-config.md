# Environment Config

## 20. Environment Configuration

### 20.1 Environment Variables

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `VITE_KINDE_DOMAIN` | Kinde tenant domain | Yes | - | `vnlaw.kinde.com` |
| `VITE_KINDE_CLIENT_ID` | Kinde application client ID | Yes | - | `abc123...` |
| `VITE_KINDE_REDIRECT_URI` | OAuth callback URL | Yes | - | `https://vnlaw.app/callback` |
| `VITE_KINDE_LOGOUT_URI` | Post-logout redirect URL | Yes | - | `https://vnlaw.app` |
| `VITE_API_BASE_URL` | Cloud Run BFF base URL | Yes | - | `https://api.vnlaw.app` |
| `VITE_ALLOWED_DOMAIN` | Allowed email domain | Yes | - | `vnlaw.com.vn` |
| `VITE_DEMO_MODE` | Enable Demo Mode with MSW mocks | No | `false` | `true` |
| `VITE_SESSION_STORAGE_KEY` | Key for session ID storage | No | `vnlaw_session_id` | - |
| `VITE_FEATURE_FLAGS_URL` | Remote feature flags endpoint | No | - | `https://api.vnlaw.app/v1/flags` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | No | - | `https://...@sentry.io/...` |
| `VITE_GA_TRACKING_ID` | Google Analytics ID | No | - | `G-XXXXXXXXXX` |
| `VITE_ENABLE_DEV_TOOLS` | Enable React DevTools in prod | No | `false` | `true` |

**Demo Mode Note:** When `VITE_DEMO_MODE=true`, the app uses MSW to intercept all API calls. A "Demo Mode" banner is displayed in the header. See `SRS/07-testing.md` Section 10.2.1 for mock requirements.

### 20.2 Environment Files

```bash
# .env.example (committed to repo)
VITE_KINDE_DOMAIN=
VITE_KINDE_CLIENT_ID=
VITE_KINDE_REDIRECT_URI=
VITE_KINDE_LOGOUT_URI=
VITE_API_BASE_URL=
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=false

# .env.local (local development - not committed)
VITE_KINDE_DOMAIN=vnlaw-dev.kinde.com
VITE_KINDE_CLIENT_ID=dev_client_id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8080
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=true  # Enable Demo Mode for local development without backend

# .env.demo (standalone frontend development - committed)
VITE_KINDE_DOMAIN=vnlaw-dev.kinde.com
VITE_KINDE_CLIENT_ID=dev_client_id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5173  # Not used in demo mode
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_DEMO_MODE=true

# .env.staging (Netlify staging environment)
VITE_KINDE_DOMAIN=vnlaw-staging.kinde.com
VITE_KINDE_CLIENT_ID=staging_client_id
VITE_KINDE_REDIRECT_URI=https://staging.vnlaw.app/callback
VITE_KINDE_LOGOUT_URI=https://staging.vnlaw.app
VITE_API_BASE_URL=https://api-staging.vnlaw.app
VITE_ALLOWED_DOMAIN=vnlaw.com.vn

# .env.production (Netlify production environment)
VITE_KINDE_DOMAIN=vnlaw.kinde.com
VITE_KINDE_CLIENT_ID=prod_client_id
VITE_KINDE_REDIRECT_URI=https://vnlaw.app/callback
VITE_KINDE_LOGOUT_URI=https://vnlaw.app
VITE_API_BASE_URL=https://api.vnlaw.app
VITE_ALLOWED_DOMAIN=vnlaw.com.vn
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### 20.3 Netlify Configuration

```toml
# netlify.toml

[build]
  command = "npm run build"
  publish = "apps/precedent-search/dist"

[build.environment]
  NODE_VERSION = "20"

# SPA redirect for React Router
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://cdn.kinde.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.vnlaw.app https://*.kinde.com; frame-ancestors 'none'; form-action 'self'"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Deploy contexts
[context.production]
  environment = { VITE_ENV = "production", VITE_DEMO_MODE = "false" }

[context.staging]
  # staging.vnlaw.app branch deploy - uses real Kinde auth
  environment = { VITE_ENV = "staging", VITE_DEMO_MODE = "false" }

[context.deploy-preview]
  # PR previews use Demo Mode (no real auth - see Section 13.2)
  environment = { VITE_ENV = "preview", VITE_DEMO_MODE = "true" }
```
