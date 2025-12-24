# Functional Requirements

## 5. Functional Requirements

### 5.1 Authentication & Authorization
**FR-AUTH-01 Login:** The app shall require users to authenticate via Kinde (Google login).
**FR-AUTH-02 Domain restriction:** The app shall only allow users with email domain `vnlaw.com.vn`.
**FR-AUTH-03 Session persistence:** The app shall maintain a session across page reloads using Kinde SDK's silent refresh mechanism. Access tokens remain in memory (not localStorage); session persistence is achieved via secure session cookie managed by Kinde SDK.
**FR-AUTH-04 API auth:** The app shall send Kinde access tokens to the backend in `Authorization: Bearer <token>`.
**FR-AUTH-05 Google token linking (Workspace):** For Workspace features, the app shall detect if the backend indicates missing Google OAuth credentials and shall redirect the user to the backend-provided `connectUrl` to complete Google OAuth and link the credential to the current Kinde session.
**FR-AUTH-06 Session timeout:** The app shall attempt silent token refresh before expiry; on failure, prompt re-login and return to the previous route after successful re-authentication.

**Implementation Note:** Do NOT store access tokens in localStorage. Rely on Kinde SDK's built-in session management for security. See `SRS/06-state-caching.md` Section 8.1 for state storage details.

### 5.2 Precedent Search (App #1 Core)
**FR-SEARCH-01 Query input:** Provide a query input supporting free-text legal queries.  
**FR-SEARCH-02 Scope selection:** Provide a scope selector. **MVP:** Only `precedent` scope enabled. **Post-MVP (feature-flagged):** `infobank`, `both`, `workspace`. Default is `precedent`. UI should hide disabled scopes or show them as "coming soon".  
**FR-SEARCH-03 Search execution:** Submit query + scope to the backend and display results.  
**FR-SEARCH-04 Results display:** Each result displays title, snippet, source indicator, and link.  
**FR-SEARCH-05 Pagination:** Support “Load more” using opaque cursors/tokens returned by backend.  
**FR-SEARCH-06 Empty state:** If no results, show guidance and alternative suggestions.  
**FR-SEARCH-07 Query validation:** Reject empty queries; enforce max query length (500 chars).

### 5.3 Chat (Answer + Citations)
**FR-CHAT-01 Ask question:** Provide a chat UI for question-answering and follow-ups.
**FR-CHAT-02 Answer display:** Render answers with loading state. MVP uses non-streaming `/v1/chat` endpoint.
**FR-CHAT-03 Citations:** Display citations/sources returned by backend (title + URL + optional snippet).
**FR-CHAT-04 Conversation state:** Maintain conversation history in-session; optionally persist via backend.
**FR-CHAT-05 Regenerate answer:** Allow "Regenerate" for the latest assistant message (backend flag `regenerate: true`).
**FR-CHAT-06 Copy/export:** Allow copying answer text and exporting conversation (Markdown for MVP; PDF optional later).

#### 5.3.1 Citation Rendering Rules (FR-CHAT-03 Details)

**Deduplication:** Citations with identical URLs SHALL be deduplicated; display only the first occurrence.

**Ordering:** Citations appear in order of first mention/return from the API (preserve API order).

**Accumulation:** Citations are displayed in a sidebar/panel. On mobile, citations panel becomes a collapsible bottom sheet.

**Display per citation:**
- Title (required)
- Source badge (precedent/infobank/workspace)
- Snippet preview if available (truncated to ~100 chars)
- Clickable URL (opens in new tab)

**Empty state:** If no citations returned, hide citations panel or show "No sources cited" message.

### 5.4 Workspace Search (Feature-flagged)
**FR-WS-01 Connect flow:** If Workspace scope is selected and backend returns `AUTH_GOOGLE_DISCONNECTED`, the app shall present a "Connect Google Workspace" prompt and redirect to `connectUrl`.
**FR-WS-02 Status display:** Show Workspace connection status (connected/disconnected) and connected Google account email if provided.
**FR-WS-03 OAuth error handling:** Gracefully handle cancel/denial and return user to the app with a message.
**FR-WS-04 Disconnect (optional):** Provide a disconnect action if backend supports revoking tokens.
**FR-WS-05 Post-connect verification:** After Google OAuth callback returns to the app, the frontend SHALL call `/v1/me` to verify `workspace.connected === true` before updating the UI to show "Connected" status. If verification fails, show error message with retry option.

**OAuth Return Handling:**
- Backend redirects to `/settings?workspace_connected=1` (or configured return URL) after successful OAuth.
- Frontend detects query parameter and calls `/v1/me` to confirm connection status.
- On confirmation failure, show "Connection verification failed. Please try again." with retry button.

### 5.5 Feedback
**FR-FB-01 Feedback:** Provide thumbs up/down on answers with optional comment and send to backend.  
**FR-FB-02 No PII leakage:** Feedback payload must not include full tokens or sensitive headers.
