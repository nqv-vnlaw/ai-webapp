# VNlaw Web Apps

Multi-application web frontend platform for legal research and AI-powered search/chat.

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
vnlaw-webapps/
├── apps/
│   └── precedent-search/    # Main application
├── packages/
│   └── auth/                # Kinde authentication integration
└── README.md
```

## Prerequisites

Before starting development, ensure you have:

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0 (install via `npm install -g pnpm` or use `corepack enable`)
- **Kinde tenant** configured (see [Kinde Setup](#kinde-setup) below)

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp apps/precedent-search/.env.example apps/precedent-search/.env.local
   # Edit .env.local with your Kinde credentials
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:5173`

4. **Build for production:**
   ```bash
   pnpm build
   ```

## Kinde Setup

### Required Kinde Tenant Configuration

Before Phase 1 implementation, the following Kinde tenant configuration must be complete:

1. **Create Kinde tenant** (e.g., `vnlaw-app.kinde.com`)

2. **Create application** in Kinde tenant:
   - Type: "Regular Web Application"
   - Note the `Client ID` for your `.env` file

3. **Configure Callback URLs:**
   - `https://vnlaw.app/callback` (production)
   - `https://staging.vnlaw.app/callback` (staging)
   - `http://localhost:5173/callback` (local development)

4. **Configure Allowed Logout URLs:**
   - `https://vnlaw.app`
   - `https://staging.vnlaw.app`
   - `http://localhost:5173`

5. **Configure Allowed Origins:**
   - `https://vnlaw.app`
   - `https://staging.vnlaw.app`
   - `http://localhost:5173`

6. **Enable Google SSO:**
   - In Kinde dashboard, go to Settings → Social logins
   - Enable Google login
   - Configure Google OAuth credentials

### Environment Variables

Create `.env.local` in `apps/precedent-search/` with the following variables:

```bash
# Kinde Configuration
VITE_KINDE_DOMAIN=your-tenant.kinde.com
VITE_KINDE_CLIENT_ID=your-client-id
VITE_KINDE_REDIRECT_URI=http://localhost:5173/callback
VITE_KINDE_LOGOUT_URI=http://localhost:5173

# Domain Restriction
VITE_ALLOWED_DOMAIN=vnlaw.com.vn

# API Configuration (for future phases)
VITE_API_BASE_URL=https://api.vnlaw.app

# Demo Mode (optional, for local development without backend)
VITE_DEMO_MODE=false
```

**Important:** Never commit `.env.local` to version control. The `.env.example` file is provided as a template.

## Available Scripts

### Root Level

- `pnpm install` - Install all dependencies across workspaces
- `pnpm build` - Build all apps and packages
- `pnpm dev` - Start development server for apps
- `pnpm lint` - Lint all apps and packages
- `pnpm typecheck` - Type check all apps and packages
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

### App Level (`apps/precedent-search`)

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## Authentication Flow

1. **Login:** User clicks "Sign in with Google" → Redirected to Kinde → Google OAuth → Callback to `/callback`
2. **Domain Check:** After authentication, the app checks if the user's email ends with `@vnlaw.com.vn`
3. **Access Control:**
   - ✅ Allowed domain → Access granted, redirected to `/`
   - ❌ Other domains → Redirected to `/access-denied`
4. **Session Persistence:** Kinde SDK handles session persistence via secure cookies (tokens remain in memory)

## Routes

- `/` - Main application (protected, requires authentication + domain check)
- `/login` - Login page
- `/callback` - OAuth callback handler (handled by Kinde SDK)
- `/access-denied` - Shown to users with non-`@vnlaw.com.vn` email addresses

## Deployment

### Netlify

The project is configured for Netlify deployment with:

- **SPA redirects:** All routes redirect to `index.html` for React Router
- **Security headers:** CSP, HSTS, X-Frame-Options, etc.
- **Deploy contexts:**
  - Production: `vnlaw.app` (real Kinde auth)
  - Staging: `staging.vnlaw.app` (real Kinde auth)
  - Preview: PR previews (Demo Mode enabled)

### Environment Variables in Netlify

Configure the following environment variables in Netlify dashboard:

**Production:**
- `VITE_KINDE_DOMAIN`
- `VITE_KINDE_CLIENT_ID`
- `VITE_KINDE_REDIRECT_URI` = `https://vnlaw.app/callback`
- `VITE_KINDE_LOGOUT_URI` = `https://vnlaw.app`
- `VITE_ALLOWED_DOMAIN` = `vnlaw.com.vn`
- `VITE_API_BASE_URL` = `https://api.vnlaw.app`
- `VITE_DEMO_MODE` = `false`

**Staging:**
- Same as production, but with staging URLs and Kinde tenant

**Preview (PR previews):**
- `VITE_DEMO_MODE` = `true` (uses MSW mocks, no real auth)

## Development Notes

### Phase 1 Scope

This implementation covers **Phase 1: Project Scaffolding** only:

- ✅ Monorepo structure with pnpm workspaces
- ✅ Vite + React + TypeScript app
- ✅ Tailwind CSS configured
- ✅ ESLint + Prettier + TypeScript strict mode
- ✅ Kinde authentication integration
- ✅ Domain restriction (`@vnlaw.com.vn` only)
- ✅ Protected routes
- ✅ Netlify deployment configuration

**Not included in Phase 1:**
- API client (Phase 2)
- Search feature (Phase 3)
- Chat feature (Phase 4)
- Error handling & feedback (Phase 5)
- Testing setup (Phase 7)

### Code Quality

- **TypeScript:** Strict mode enabled
- **ESLint:** Configured with TypeScript and React rules
- **Prettier:** Code formatting
- **Linting:** Run `pnpm lint` before committing

## Troubleshooting

### "Missing required Kinde environment variables"

Ensure all required environment variables are set in `.env.local`:
- `VITE_KINDE_DOMAIN`
- `VITE_KINDE_CLIENT_ID`
- `VITE_KINDE_REDIRECT_URI`
- `VITE_KINDE_LOGOUT_URI`

### Authentication redirects fail

1. Verify callback URLs are configured in Kinde dashboard
2. Check that `VITE_KINDE_REDIRECT_URI` matches exactly (including protocol and port)
3. Ensure allowed origins are configured in Kinde

### Domain restriction not working

- Verify `VITE_ALLOWED_DOMAIN` is set to `vnlaw.com.vn` (without `@`)
- Check browser console for authentication errors

## References

- **SRS Documentation:** `SRS/` directory
- **OpenAPI Spec:** `1. Research/openapi.yaml`
- **Kinde Docs:** https://docs.kinde.com
- **Vite Docs:** https://vitejs.dev
- **React Router Docs:** https://reactrouter.com

## License

Private - VNlaw Internal Use Only

