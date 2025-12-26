# Acceptance Checklists

## 15. MVP Acceptance Criteria (App #1: Precedent Search Bot Web)
MVP is accepted when:
1) Only `@vnlaw.com.vn` users can access after login.
2) Search works for Precedent scope: results show title/snippet/link.
3) Chat answers display with citations (when available).
4) Errors show user-friendly messages; retry works for transient failures.
5) `vnlaw.app` is served via Cloudflare → Netlify, and API calls go to Cloud Run BFF.

---

## 21. Acceptance Checklists

### 21.1 MVP Feature Checklist

| # | Feature | Requirements | Status |
|---|---------|--------------|--------|
| 1 | Domain-restricted login | FR-AUTH-01, FR-AUTH-02 | ✅ |
| 2 | Session persistence | FR-AUTH-03 | ✅ |
| 3 | Token-based API auth | FR-AUTH-04 | ☐ |
| 4 | Search with precedent scope | FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03 | ☐ |
| 5 | Search results display | FR-SEARCH-04 | ☐ |
| 6 | Search pagination | FR-SEARCH-05 | ☐ |
| 7 | Empty state handling | FR-SEARCH-06 | ☐ |
| 8 | Query validation | FR-SEARCH-07 | ☐ |
| 9 | Chat question input | FR-CHAT-01 | ☐ |
| 10 | Chat answer display | FR-CHAT-02 | ☐ |
| 11 | Citations display | FR-CHAT-03 | ☐ |
| 12 | Conversation state | FR-CHAT-04 | ☐ |
| 13 | Regenerate answer | FR-CHAT-05 | ☐ |
| 14 | Copy/export | FR-CHAT-06 | ☐ |
| 15 | Automatic retry | FR-ERR-01 | ☐ |
| 16 | Retry UI | FR-ERR-02 | ☐ |
| 17 | Manual retry | FR-ERR-03 | ☐ |
| 18 | Feedback buttons | FR-FB-01 | ☐ |
| 19 | PII protection | FR-FB-02 | ☐ |

### 21.2 Non-Functional Checklist

| # | Requirement | Target | Status |
|---|-------------|--------|--------|
| 1 | TTI (4G throttling) | < 3.5s | ☐ |
| 2 | LCP | < 2.5s | ☐ |
| 3 | CLS | < 0.1 | ☐ |
| 4 | Initial JS bundle | < 200KB gzip | ☐ |
| 5 | Lighthouse performance | ≥ 80 | ☐ |
| 6 | Lighthouse accessibility | ≥ 90 | ☐ |
| 7 | Unit test coverage (packages) | 80% | ☐ |
| 8 | Unit test coverage (app) | 70% | ☐ |
| 9 | Unit test coverage (UI) | 60% | ☐ |
| 10 | E2E P0 scenarios passing | 100% | ☐ |
| 11 | WCAG 2.1 AA compliance | Core flows | ☐ |
| 12 | Mobile responsive | All pages | ☐ |

### 21.3 Security Compliance Checklist (Critical for Production Release)

> ⚠️ **All items MUST pass before production deployment**

#### OAuth Security
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 1 | State tokens validated (one-time use, TTL enforced, session binding) | Section 5.1 FR-AUTH-05 | ☐ |
| 2 | PKCE implemented and validated | Section 5.1 FR-AUTH-05 | ☐ |
| 3 | Redirect URLs validated against strict allowlist | Section 5.1 FR-AUTH-05 | ☐ |
| 4 | Identity mismatch prevented (Google email === Kinde email) | Section 5.1 FR-AUTH-05 | ☐ |
| 5 | Open redirect tests pass | Section 16.1.1 | ☐ |
| 6 | OAuth endpoints in OpenAPI spec | Section 16.1.1 | ☐ |

#### Token Storage
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 7 | Tokens encrypted with Cloud KMS before storage | Section 3.4.1, 16.1.2 | ☐ |
| 8 | Firestore security rules deny client access to UserTokens | Section 3.4.1 | ☐ |
| 9 | Audit logging enabled and verified | Section 3.4.1 | ☐ |
| 10 | Revocation endpoint working and tested | Section 16.1.1 | ☐ |
| 11 | No plaintext tokens in logs (verified via log inspection) | Section 7.5.3 | ☐ |

#### CORS & API Security
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 12 | Production CORS locked down (no wildcards) | Section 3.3.1 | ☐ |
| 13 | Preflight handling working for all endpoints | Section 6.2.0 | ☐ |
| 14 | Origin validation tested (allowed and forbidden origins) | Section 3.3.1 | ☐ |
| 15 | Input validation enforced (maxLength, required fields) | Section 6.2.2, 6.2.3 | ☐ |
| 16 | Rate limiting working (tested with 429 responses) | Section 6.5 | ☐ |

#### Logging & Privacy
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 17 | No sensitive data in production logs (queries, tokens, PII) | Section 7.5.3 | ☐ |
| 18 | Security events logged (auth failures, CORS violations, rate limits) | Section 7.5.3 | ☐ |
| 19 | RequestId in all responses (verified) | Section 6.2.1.1, 7.5.4 | ☐ |
| 20 | Session ID hashed in logs (not plaintext) | Section 7.5.1 | ☐ |

#### Demo Mode
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 21 | Runtime guard prevents production deployment | Section 10.2.1 | ☐ |
| 22 | Build fails if PROD + DEMO_MODE | Section 10.2.1 | ☐ |
| 23 | Banner always visible in demo mode | Section 10.2.1 | ☐ |

#### Edge Cases & Resilience
| # | Requirement | References | Status |
|---|-------------|------------|--------|
| 24 | Token refresh failure handled gracefully | FR-AUTH-06 | ☐ |
| 25 | Browser crash/restore tested (auth state recovery) | Section 8.1 | ☐ |
| 26 | Long idle period tested (token expiry UX) | FR-AUTH-06 | ☐ |
| 27 | Partial success (207) displays warning banner | Section 6.0.3 | ☐ |
