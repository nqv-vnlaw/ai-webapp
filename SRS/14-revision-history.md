# Revision History

This file preserves the Revision History section from the monolithic SRS: `1. Research/VNlaw_WebApps_SRS_v1.5.2.md`.

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial draft |
| 1.1.0 | 2025-12-21 | Added implementation phases |
| 1.2.0 | 2025-12-22 | Added TypeScript interfaces, environment config |
| 1.3.0 | 2025-12-22 | AI-Agent ready optimizations |
| 1.4.0 | 2025-12-23 | Contract governance, Demo Mode, non-streaming MVP, security clarifications |
| 1.5.0 | 2025-12-24 | Critical contract fixes: added `messageId` to chat response, fixed `retryAfterSeconds` type, completed ErrorCode union, removed SEARCH_PARTIAL_FAILURE from error codes (partial is success), clarified `/v1/health` auth exception, corrected feature flag defaults, unified URL routing to `/`, defined `requestId` as UUID v4, documented `_meta` field policy, standardized scope format, added security requirements (XSS, external links, Demo Mode guard), added toolchain specification, clarified auth/connect pattern, added CORS requirements |
| 1.5.1 | 2025-12-24 | Consistency fixes: fixed section numbering (6.4/6.5), fixed Phase 3 URL pattern, made `/settings` consistently Required, clarified Netlify publish dir for monorepo, removed invalid JSON comments, added `INFOBANK_SEARCH_ENABLED` to FeatureFlags type, completed retry matrix with 502, expanded canonical result model, added CSP/HSTS to netlify.toml, aligned recent searches with privacy guidance, clarified requestId vs X-Request-Id, picked pnpm + Vitest, marked Section 19 types as stub |
| 1.5.2 | 2025-12-24 | Design decisions implemented: (1) Generated `openapi.yaml` from Section 6.2 — now ✅ Ready; (2) Multi-turn chat uses stateless `messages[]` array with `contextLimitWarning` field; (3) SSE streaming marked as POST-MVP deferred with hook for future; (4) Added dynamic CORS origin validation pattern for `*.netlify.app` previews; (5) Preview auth strategy: PR previews use Demo Mode, `staging.vnlaw.app` uses real Kinde auth; (6) Referenced authoritative sample JSON files by path; (7) Corrected OpenAPI/tooling notes for the now-present spec |
