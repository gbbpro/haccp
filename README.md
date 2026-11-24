# HACCP

HACCP plans and daily food-safety logs for small food businesses. Multi-tenant
from day one: each business is a Clerk Organization, and every row in the
database is scoped by `org_id`.

**Stack:** Next.js 16 (App Router) · Clerk (auth + organizations) · Neon Postgres · Drizzle ORM · Tailwind · Vercel · Stripe (later)

## What's here

- **Roles** — Clerk's org roles: `org:admin` = Admin (plan, team, reports), `org:member` = Staff (record logs and corrective actions).
- **Onboarding** — sign up → create your business → admin sets up the store, which loads a starter HACCP plan (7 process steps, 5 CCPs, 10 monitoring tasks, FDA Food Code limits) as a **draft** to review.
- **Today** (everyone) — monitoring tasks with due status, tablet-friendly reading entry, automatic critical-limit check.
- **Deviations** — an out-of-limit reading sends staff straight to a required corrective-action form; unresolved ones stay pinned at the top of Today.
- **Admin** — overview stats, the full plan (steps, hazards, CCPs, procedures), and team invites.
- **Append-only records** — a Postgres trigger blocks `UPDATE`/`DELETE` on `log_entries`, `corrective_actions` and `verifications`. Corrections are new rows linked by `supersedes_id`.

## Setup

1. **Neon:** create a project and copy the pooled connection string.
2. **Clerk:** create an application and turn on **Organizations** (Configure → Organizations). Copy the API keys.
3. Copy `.env.example` to `.env.local` and fill it in.
4. Install and migrate:
   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```
5. Sign up at http://localhost:3000, create your business, and click **Create store with starter plan**.

Optional sample data with a day of readings (use your Clerk org id, e.g. from the Clerk dashboard):

```bash
npm run db:seed -- --org org_XXXXXXXX --name "Main Street Café"
```

## Deploying to Vercel

Import the repo in Vercel and connect the Neon and Clerk integrations. Make sure both integrations' variables are set for **Production** (and Preview, if you want working previews). Each deploy runs `npm run vercel-build`, which applies pending migrations to that environment's database before building.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed a sample store |
| `npm run db:studio` | Browse the database |

## Project layout

```
src/
  proxy.ts                 Clerk auth on every non-public route
  db/schema.ts             All tables (multi-tenant, org_id everywhere)
  lib/auth.ts              requireSession / requireAdmin / ensureOrganization
  lib/queries.ts           Org-scoped reads
  lib/limits.ts            Critical-limit evaluation
  lib/templates/           Starter plan template + applyTemplate()
  app/app/                 Signed-in app (Today, log, deviations, admin)
  app/app/actions.ts       Server actions (setup, record reading, corrective action)
drizzle/                   SQL migrations (0001 = append-only triggers)
scripts/seed.ts            Sample store seeder
```

## Roadmap

1. ~~Foundation: auth, orgs, roles, schema, starter plan, logging, corrective actions~~
2. Plan editor (edit steps/hazards/CCPs, approve → active, versioning)
3. Verification sign-offs and reading corrections (supersede) UI
4. Reports: date-range PDF/CSV export for inspectors
5. Missed-check alerts (email/SMS) via Vercel Cron
6. Stripe subscriptions per organization
7. Multi-location, sensors, offline mode

> The starter plan is a template based on the FDA Food Code. Each business is responsible for reviewing it against its own menu, equipment and local regulations.
