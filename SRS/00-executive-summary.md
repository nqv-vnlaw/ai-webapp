# Executive Summary & Introduction

## 0. Executive Summary
VNlaw Web Apps is a **multi-application web frontend platform** deployed on **Netlify** and protected by **Cloudflare**, using **Kinde** for user authentication. The platform is **restricted to VNlaw Google Workspace users** (`@vnlaw.com.vn`). Business logic and sensitive credential handling remain in **GCP** using **Cloud Run (Python BFF)** and **Cloud Functions**, with optional persistence in **Firestore** (MVP) and **PostgreSQL** (Supabase or Neon) for longer-term product features.

A critical requirement is **dual-authentication** for Workspace-connected features:
- **Kinde token = identity & app access**
- **Google OAuth token(s) = access to Google Workspace data**  
The backend (Cloud Run BFF) is responsible for **mapping Kinde identity → stored Google tokens** (from Firestore `UserTokens`) and handling the OAuth “connect” flow as needed.

---

## 0.1 AI Build Pack (Quick Reference)

> **For AI coding agents:** This section provides authoritative references and blockers before implementation.

### Authoritative Contracts
| Artifact | Status | Location |
|----------|--------|----------|
| OpenAPI Spec (`openapi.yaml`) | ✅ Ready | `1. Research/openapi.yaml` |
| Wireframes/Mockups | 🟡 Recommended | Figma link TBD |
| This SRS | ✅ Ready | Current document |

**⚠️ OpenAPI Governance Rule:** Agents MUST use `openapi.yaml` as the single source of truth for API contracts. Any discrepancies between this SRS and the OpenAPI spec should be resolved by updating BOTH documents. See `SRS/04-api-contracts.md` Section 6.0 for contract governance rules.

### MVP Scope Matrix
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

### Open Questions (Resolve Before Phase 2)
1. ~~OpenAPI spec location~~ → Resolved: `1. Research/openapi.yaml` exists and governs Section 6.2
2. ~~Wireframes/mockups~~ → Minimal set required for error states, empty states
3. Backend readiness: Confirm `/v1/search`, `/v1/chat`, `/v1/feedback` endpoints are deployed

### Critical Implementation Notes
- **SSE Streaming (Post-MVP):** Streaming is deferred to post-MVP. When implemented, cannot use `EventSource` (no Authorization header support). Must use `fetch()` + `ReadableStream`. See `SRS/04-api-contracts.md` Section 6.2.4.
- **Demo Mode:** Frontend MUST work fully with MSW mocks before backend exists. Enable via `VITE_DEMO_MODE=true`. See `SRS/07-testing.md` Section 10.2.
- **Kinde Callback:** Provide a `/callback` route that renders a minimal "Signing you in..." page. The Kinde SDK processes the OAuth callback on this route. Do NOT leave `/callback` unhandled or it will render a 404.
- **Token Storage:** Kinde SDK stores tokens in memory; use silent refresh for session persistence across reloads. See `SRS/06-state-caching.md` Section 8.1.

---

## 1. Introduction

### 1.1 Purpose
This SRS specifies requirements for:
1) A **separate frontend repo** that can host multiple VNlaw web apps.
2) The first web app: **Precedent Search Bot (Web)** (search + chat + citations).
3) Integration patterns with existing and new backend components on GCP.

### 1.2 Scope
**In-scope**
- Multi-app frontend architecture (monorepo) hosted on Netlify.
- Authentication via Kinde with **domain restriction** to `@vnlaw.com.vn`.
- API integration with a GCP **Cloud Run Python BFF** (Pattern A, mandatory).
- Search + chat UX for the Precedent Search Bot (Web).
- Optional Workspace search UX (feature-flagged) including Google OAuth “connect” flow.
- Observability, error handling, testing, performance budgets, and deployment requirements.

**Out-of-scope**
- Rebuilding the underlying search engine, datastores, connectors, or model orchestration already running on GCP.
- Any end-user support processes and content governance policies (can be added later).

### 1.3 Definitions
- **BFF:** Backend-for-Frontend service that provides frontend-specific APIs (Cloud Run).
- **Kinde Token:** OIDC/JWT used to verify identity and authorize app access.
- **Google Token:** Google OAuth access/refresh tokens required for certain Google APIs (e.g., Cloud Search).
- **Workspace Connect:** User action to grant Google OAuth permissions for Workspace search features.
- **Scope:** Search corpus selection (precedent / infobank / both / workspace).
- **SSE:** Server-Sent Events for streaming chat responses.
