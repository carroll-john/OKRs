# Foundation Plan & File Structure

## Checklist (pre-roadmap)

- [x] Ensure laptop repo tracks remote and can sync with web client.
- [x] Centralize API authentication + workspace membership checks.
- [x] Extract shared dashboard summary logic from route handlers.
- [x] Extract shared CSV escaping utility.
- [x] Keep route files thin and orchestration-focused.
- [x] Re-run unit tests after refactor.
- [ ] Pick roadmap path (product depth vs platform/ops vs data layer rewrite).

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

1. Move dashboard/export data-fetch logic into `lib/server/dashboard-service.ts`.
2. Add API route tests for `app/api/dashboard/*` handlers.
3. Add CI for `npm test`, `npm run build`, and linting.
4. Add typed DTOs for API responses in `lib/server/types.ts`.
