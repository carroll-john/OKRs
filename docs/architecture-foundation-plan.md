# Foundation Plan & File Structure

## Checklist (pre-roadmap)

- [x] Ensure laptop repo tracks remote and can sync with web client.
- [x] Centralize API authentication + workspace membership checks.
- [x] Extract shared dashboard summary logic from route handlers.
- [x] Extract shared CSV escaping utility.
- [x] Keep route files thin and orchestration-focused.
- [x] Re-run unit tests after refactor.
- [x] Pick roadmap path: platform/ops first, so direct-to-main work has automated verification.

## Roadmap path

Platform/ops is the next path. The immediate goal is to make direct `main` work low-friction without relying on manual GitHub PR approval, while keeping automated checks visible and repeatable.

## Suggested project structure

This structure keeps concerns isolated so you can iterate on one surface area with minimal cross-file churn.

- `app/`
  - Route handlers and pages only (transport/UI layer).
- `lib/server/`
  - Server-only domain services and authz helpers.
  - Example: membership checks, dashboard aggregations, export builders.
- `lib/validation/`
  - Zod schemas and shared request validation.
- `lib/`
  - Shared pure utilities usable by both server and client (e.g. progress math).
- `tests/unit/`
  - Pure logic and route-level behavior tests.
- `tests/e2e/`
  - User journey and integration checks.
- `docs/`
  - Execution plans, architecture notes, and operational runbooks.

## Near-term incremental refactors

1. Move dashboard/export data-fetch logic into `lib/server/dashboard-service.ts`. (done)
2. Add API route tests for `app/api/dashboard/*` handlers. (done)
3. Add CI for `npm test`, `npm run build`, and linting. (done)
4. Add typed DTOs for API responses in `lib/server/types.ts`. (done)
