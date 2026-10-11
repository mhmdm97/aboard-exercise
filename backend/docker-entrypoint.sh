#!/bin/sh
set -e
node dist/db/migrate.js
if [ "$SEED_ON_START" = "true" ]; then
  node dist/db/seed.js
fi
exec node dist/server.js
