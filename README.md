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
