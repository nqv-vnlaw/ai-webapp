# Deployment & Delivery Specs

## 11. Mobile & Responsive Requirements
Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px.  
- Touch targets ≥ 44×44px
- Citations panel becomes bottom sheet on mobile
- Reduce results per page on mobile (e.g., 5) if needed

---

## 12. Feature Flags
Feature flags evaluated at app init (from `/v1/flags` endpoint or build-time env).

**MVP Defaults:**
| Flag | MVP Default | Post-MVP | Description |
|------|-------------|----------|-------------|
| `WORKSPACE_SEARCH_ENABLED` | `false` | `true` | Workspace scope in search |
| `CHAT_HISTORY_ENABLED` | `false` | `true` | Persist conversations |
| `STREAMING_ENABLED` | `false` | `true` | SSE streaming for chat |
| `FEEDBACK_ENABLED` | `true` | `true` | Thumbs up/down on answers |
| `EXPORT_ENABLED` | `true` | `true` | Markdown export |
| `INFOBANK_SEARCH_ENABLED` | `false` | `true` | Infobank scope in search |

**Important:** `STREAMING_ENABLED` is `false` for MVP because streaming is deferred to post-MVP. MVP uses the synchronous `/v1/chat` endpoint.

**Disabled feature behavior:**
- Hide UI controls entirely
- If invoked programmatically, show friendly message (no broken state)

---

## 13. Deployment & Environments

### 13.1 Environments

| Environment | URL | Auth | Backend |
|-------------|-----|------|---------|
| Dev (local) | `http://localhost:5173` | Kinde (dev tenant) | Local or Demo Mode |
| Preview (PR) | `*.netlify.app` | **Demo Mode only** | MSW mocks |
| Staging | `staging.vnlaw.app` | Kinde (staging tenant) | `api-staging.vnlaw.app` |
| Production | `vnlaw.app` | Kinde (prod tenant) | `api.vnlaw.app` |

### 13.2 Preview Auth Strategy (Option B — Staging URL)

**Problem:** Kinde OAuth cannot authenticate arbitrary `*.netlify.app` URLs because callback URLs must be pre-registered. Adding dynamic preview URLs is impractical.

**Solution:** Use Demo Mode for all Netlify deploy previews. Real authentication testing occurs only on the staging branch deploy (`staging.vnlaw.app`).

| Deploy Type | URL Pattern | Auth Method | Notes |
|-------------|-------------|-------------|-------|
| PR preview | `deploy-preview-123--vnlaw-app.netlify.app` | Demo Mode | No Kinde; MSW mocks all API responses |
| Staging branch | `staging.vnlaw.app` | Real Kinde | Pre-registered in Kinde staging tenant |
| Production | `vnlaw.app` | Real Kinde | Pre-registered in Kinde prod tenant |

**Kinde Callback URL Configuration:**
- Staging tenant: `https://staging.vnlaw.app/callback`
- Production tenant: `https://vnlaw.app/callback`
- Dev tenant: `http://localhost:5173/callback`

**Workflow:**
1. **PR previews** — Developers/reviewers use Demo Mode; focus on UI/UX, not auth flows
2. **Staging** — QA tests real auth and API integration on `staging.vnlaw.app`
3. **Production** — Release after staging verification

### 13.3 Netlify Config Expectations
- **PR previews:** Auto-deploy with `VITE_DEMO_MODE=true` (no real auth)
- **Branch deploy for staging:** `develop` branch → `staging.vnlaw.app` with real Kinde
- **Production deploy:** `main` branch → `vnlaw.app` with real Kinde
- Environment variables per deploy context (see Section 20.3)

### 13.4 Cloudflare Expectations
- DNS + SSL/TLS for `vnlaw.app` and `api.vnlaw.app`
- WAF + rate limiting policies
- Optional: Access policies for internal-only routes

---

## 14. Migration & Compatibility (V1 Chat Bot → Web App)
- Web app is a separate UI; backend should remain shared or parallelized safely.
- Bot can include a link to the web app for discoverability (post-launch).
- Future: conversation portability (optional) if IDs are unified.
