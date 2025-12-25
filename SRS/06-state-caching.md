# State & Caching

## 8. State Management & Caching

### 8.1 State categories

| State | Storage | Persistence | Notes |
|---|---|---|---|
| Auth tokens | **Memory only** | Session (via silent refresh) | Kinde SDK manages; never use localStorage |
| Session ID | sessionStorage | Tab session | Generated on app load |
| UI prefs | localStorage | Long-lived | Theme, results per page, etc. |
| Search state | URL params + memory | Navigation | Enables shareable URLs |
| Chat thread | Memory | Session | Optionally persist via backend |
| Response cache | TanStack Query | Session | Stale-while-revalidate |
| Recent searches | localStorage | Per user | Max 10 entries; store preview only (first 50 chars) |

**Auth Clarification:** Access tokens are stored in memory by Kinde SDK. Session persistence across page reloads is achieved via Kinde's silent refresh mechanism (uses secure cookies internally). Do NOT store tokens in localStorage.

### 8.2 URL state (required)

**MVP URL Pattern:** Since `/` is the canonical MVP page (combined search + chat), query parameters are on the root URL:
- `/?q=<query>&scope=precedent` — search with query
- `/?q=<query>&scope=precedent&cid=<conversationId>` — chat in context

**Rules:**
- Search query reflected in URL parameters
- Back/forward navigation must work correctly
- URLs are shareable internally (subject to auth)
- Do NOT use `/search?q=...` for MVP — that route is post-MVP

### 8.3 Caching rules
- Search responses: TTL 5 minutes; stale-while-revalidate 5 minutes.
- Never cache error responses.
- Show “cached results from …” warning when serving stale cache due to backend failure.

---

## 9. Chat Persistence (MVP vs Post-MVP)

### 9.1 MVP recommendation
- Persist conversation summaries or full messages in **Firestore** (optional toggle).
- Benefits: lowest operational overhead and matches existing GCP setup.

### 9.2 Post-MVP
- Introduce PostgreSQL (Supabase/Neon) when:
  - cross-app reporting is needed
  - complex queries/auditing required
  - long-term retention policies mature
