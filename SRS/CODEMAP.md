# VNlaw WebApps SRS Codemap

## Agent Bootstrap (Read This First)

1) Read `SRS/CODEMAP.md` only (do not load the full SRS by default).  
2) For your task, load only the files listed in the table below.  
3) API contracts are governed by `1. Research/openapi.yaml` (source of truth) and sample payloads in `1. Research/samples/`.  
4) Prefer repo-root relative paths in commands and references (paths in this folder are written that way).  
5) If you truly need the monolithic reference, use `1. Research/VNlaw_WebApps_SRS_v1.5.2.md` (content v1.6.1).

## Quick Reference: What to Read for Each Task

| Task | Required Files | Optional Files |
|------|----------------|----------------|
| **Phase 1: Scaffolding** | `00-executive-summary.md`, `01-tech-stack.md`, `09-implementation-phases.md` | `12-environment-config.md` |
| **Phase 2: API Client** | `04-api-contracts.md`, `11-typescript-types.md`, `09-implementation-phases.md` | `05-nfr-security.md` |
| **Phase 3: Search Feature** | `03-functional-requirements.md`, `04-api-contracts.md`, `09-implementation-phases.md` | `06-state-caching.md` |
| **Phase 4: Chat Feature** | `03-functional-requirements.md`, `04-api-contracts.md`, `09-implementation-phases.md` | - |
| **Phase 5: Error Handling** | `04-api-contracts.md` (Section 6.3-6.6), `05-nfr-security.md`, `09-implementation-phases.md` | - |
| **API Integration** | `04-api-contracts.md`, `1. Research/openapi.yaml` | `11-typescript-types.md` |
| **Testing** | `07-testing.md`, `1. Research/samples/` | - |
| **Deployment** | `08-deployment.md`, `12-environment-config.md` | - |

## Document Versions
- SRS Version: 1.6.1
- OpenAPI Version: 1.0.3
- Last Updated: 2025-12-25

## Route → File Reference

| Route | Description | Relevant Files |
|-------|-------------|----------------|
| `/` | Combined search + chat (MVP canonical) | `03-functional-requirements.md`, `04-api-contracts.md` (6.1) |
| `/callback` | Kinde OAuth callback | `00-executive-summary.md` (Critical Notes), `12-environment-config.md` |
| `/access-denied` | Domain rejection page | `03-functional-requirements.md` (FR-AUTH-02), `09-implementation-phases.md` (Phase 1) |
| `/settings` | Workspace connection, user prefs | `03-functional-requirements.md` (FR-WS-*), `04-api-contracts.md` (6.2.6 `/v1/me`) |

## Cross-Reference Index

| Section | Content | File |
|---------|---------|------|
| 0, 0.1, 1 | Executive Summary, AI Build Pack, Introduction | `00-executive-summary.md` |
| 2, 3 | Technology Stack | `01-tech-stack.md` |
| 4 | Architecture | `02-architecture.md` |
| 5 | Functional Requirements | `03-functional-requirements.md` |
| 6 | API Contracts & Interfaces | `04-api-contracts.md` |
| 7 | NFR & Security | `05-nfr-security.md` |
| 8, 9 | State & Caching | `06-state-caching.md` |
| 10 | Testing | `07-testing.md` |
| 11-14 | Mobile, Flags, Deployment, Migration | `08-deployment.md` |
| 16, 17 | Next Artifacts, Implementation Phases | `09-implementation-phases.md` |
| 18 | Project Structure | `10-project-structure.md` |
| 19 | TypeScript Types | `11-typescript-types.md` |
| 20 | Environment Config | `12-environment-config.md` |
| 15, 21 | Acceptance Criteria & Checklists | `13-acceptance-checklists.md` |
| Revision History | Version changes | `14-revision-history.md` |
