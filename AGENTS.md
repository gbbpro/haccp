<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- **Tenancy:** every query on tenant data must filter by `org_id` from `requireSession()`/`requireAdmin()` (`src/lib/auth.ts`). Never trust an org id from the client.
- **Records are append-only:** never `UPDATE`/`DELETE` `log_entries`, `corrective_actions` or `verifications` (a DB trigger enforces it). Corrections are new rows with `supersedes_id`.
- **Roles:** `org:admin` = Admin, `org:member` = Staff. Admin-only pages and actions call `requireAdmin()`.
- **Schema changes:** edit `src/db/schema.ts`, then `npm run db:generate`. Don't hand-edit generated migrations.
- **Cache Components is on.** Session-gated segments use `export const instant = false`; client components that read the URL go inside `<Suspense>`.
- Before pushing: `npm run typecheck && npm run lint && npm run build`.
