#!/bin/sh
set -e

echo "[Worker] Running database migrations..."
tsx src/db/migrate.ts

echo "[Worker] Migrations complete. Starting workers..."
exec tsx src/jobs/workers/index.ts
