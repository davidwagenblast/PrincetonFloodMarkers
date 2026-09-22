// SQLite via Node's built-in driver (no native build step needed on any OS).
// Schema changes live in ./migrations as numbered .sql files, applied in order
// and tracked with PRAGMA user_version.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH ?? join(dataDir, 'floodlite.db'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

function migrate() {
  const migrationsDir = join(here, 'migrations');
  const current = db.prepare('PRAGMA user_version').get().user_version;
  const files = readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
      db.exec(`PRAGMA user_version = ${version}`);
      db.exec('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

migrate();

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Database is up to date.');
}
