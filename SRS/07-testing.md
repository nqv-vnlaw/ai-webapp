# Testing

## 10. Testing Requirements

### 10.1 Unit testing
- Tooling: **Vitest** + Testing Library (Vitest integrates natively with Vite)
- Coverage targets:
  - shared packages: 80%
  - app logic: 70%
  - UI components: 60%

### 10.2 Integration Testing & Demo Mode

#### 10.2.1 Demo Mode (Mandatory for Standalone Development)

The frontend MUST work fully with MSW mocks before any backend is available. This enables parallel development and comprehensive UI testing.

**Configuration:**
- Enable via `VITE_DEMO_MODE=true` environment variable
- **Visual indicator:** Display "Demo Mode" banner in header when active
- In Demo Mode, all API calls are intercepted by MSW; no real backend required

**Mock Coverage Required:**

| Scenario | Endpoint | Mock Response |
|----------|----------|---------------|
| Search success | `POST /v1/search` | 2-5 results with metadata |
| Search empty | `POST /v1/search` | Empty results array |
| Search partial failure | `POST /v1/search` | `status: "partial"` with warnings |
| Chat response | `POST /v1/chat` | Full answer with 2-3 citations |
| User profile | `GET /v1/me` | Mock user with workspace status |
| Feature flags | `GET /v1/flags` | MVP-appropriate flags |
| Error: 401 | Any | `AUTH_INVALID_TOKEN` |
| Error: 403 domain | Any | `AUTH_DOMAIN_REJECTED` |
| Error: 403 workspace | `/v1/search` (workspace) | `AUTH_GOOGLE_DISCONNECTED` with `connectUrl` |
| Error: 429 | Any | `RATE_LIMITED` with `retryAfterSeconds: 30` |
| Error: 500 | Any | `INTERNAL_ERROR` |
| Error: 503 | Any | `SERVICE_UNAVAILABLE` |

**Latency Simulation:**
- Add random delay (200-800ms) to all mock responses
- Simulates real network conditions for UX testing

**Mock Identity:**
- In Demo Mode, use a mock authenticated user (do not skip auth plumbing)
- Mock user: `demo@vnlaw.com.vn`, name: "Demo User"
- This ensures auth UI components are tested even without real Kinde

#### 10.2.2 Integration Testing (with MSW)

- Use MSW for API mocking in all integration tests
- Validate: auth flows, all scopes, chat multi-turn, error scenarios
- Test all error codes from Section 6.3 with appropriate UI responses

### 10.3 E2E testing
- Tool: Playwright (recommended)
- P0 scenarios: login, domain rejection, basic search, chat with citations, logout
- Run smoke tests on every PR; nightly full suite

### 10.4 Performance & accessibility testing
- Lighthouse CI on PRs (target score ≥ 80 perf, ≥ 90 accessibility)
- axe-core checks for key pages/components
