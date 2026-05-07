# OKR Tracker MVP

Lightweight web OKR tracker for small product/technology teams, optimized for weekly check-ins.

## Implemented MVP scope
- Auth with NextAuth credentials
- Workspace/role/cycle/objective/key result/weekly update schema (Prisma + Postgres)
- Seeded demo data
- Weekly dashboard for manager meeting with blockers + stale update signal
- API endpoint for weekly updates
- Vitest + Playwright starter tests

## Not included
No task management, performance review workflows, weighted scoring, Jira/Linear, Slack bot, AI generation, or cascading complexity.

## Quick start
1. `npm install`
2. Set `DATABASE_URL`
3. `npx prisma migrate dev`
4. `npm run prisma:seed`
5. `npm run dev`

Demo login: `manager@demo.com` / `password123`

## Supabase instead of Prisma?
Short answer: **use Supabase instead of self-hosted Postgres, not instead of Prisma**.

- If you meant “Prima,” this project uses **Prisma**.
- Supabase is the Postgres provider.
- Prisma is the ORM used by the app code.

So the supported swap is:
- ✅ Postgres provider: local/hosted Postgres → Supabase Postgres
- ❌ ORM in this repo today: Prisma → Supabase JS client (not implemented)

## Using Supabase with the current codebase
1. Create a Supabase project.
2. In Supabase, copy the Postgres connection string from **Project Settings → Database**.
3. Set `DATABASE_URL` in your `.env`.
4. Run migrations and seed normally:
   - `npx prisma migrate dev`
   - `npm run prisma:seed`

If you want a full Prisma-to-Supabase-client rewrite, that is possible, but it requires replacing all `prisma.*` queries in auth, API routes, seed scripts, and dashboard data loading.
