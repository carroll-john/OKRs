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

## Deploying on Vercel
Yes — this project can be deployed on Vercel.

Required environment variables:
- `DATABASE_URL` (hosted Postgres connection string)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your Vercel production URL)

Recommended deploy setup:
1. Push this repository to GitHub.
2. Import the repo in Vercel as a Next.js project.
3. Add the environment variables above in Vercel Project Settings.
4. Run Prisma migrations against your production database (for example: `npx prisma migrate deploy`).
5. Deploy.

Notes:
- Do not use local SQLite for Vercel production; use a managed Postgres database.
- Keep Prisma Client generation in the build (`postinstall` already runs `prisma generate`).
