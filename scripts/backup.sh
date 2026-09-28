#!/usr/bin/env bash
# Safe online backup of the SQLite database (a plain `cp` of a live WAL database can be corrupt)
# plus a copy of uploaded photos. Keeps the newest $KEEP database snapshots.
#
# Usage: scripts/backup.sh /path/to/backup-dir      (e.g. nightly from cron)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:?usage: scripts/backup.sh BACKUP_DIR}"
KEEP="${KEEP:-30}"
export PATH="$ROOT/.node/bin:$PATH"

# Pick up DB_PATH / UPLOADS_DIR from .env, falling back to the app's defaults.
set -a; [ -f "$ROOT/.env" ] && . "$ROOT/.env"; set +a
DB_PATH="${DB_PATH:-$ROOT/server/data/floodlite.db}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT/server/uploads}"

mkdir -p "$DEST/db" "$DEST/uploads"
snapshot="$DEST/db/floodlite-$(date +%Y%m%d-%H%M%S).db"
node -e '
  const { DatabaseSync, backup } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1], { readOnly: true });
  backup(db, process.argv[2]).then(() => db.close());
' "$DB_PATH" "$snapshot"
gzip "$snapshot"

# Photos never change once written, so a plain additive copy is enough.
cp -rpn "$UPLOADS_DIR"/. "$DEST/uploads/" 2>/dev/null || true

ls -1t "$DEST"/db/floodlite-*.db.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "Backup written: $snapshot.gz"
