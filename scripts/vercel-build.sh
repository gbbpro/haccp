#!/usr/bin/env bash
# Vercel runs `npm run vercel-build` instead of `build` when it exists.
# Apply pending migrations to this environment's database, then build.
set -euo pipefail

if [ -n "${DATABASE_URL_UNPOOLED:-}${DATABASE_URL:-}" ]; then
  echo "Applying database migrations…"
  npx drizzle-kit migrate
else
  echo "No DATABASE_URL for this environment — skipping migrations."
fi

next build
