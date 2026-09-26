import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('Missing environment variable DATABASE_URL');
  const pool = new Pool({ connectionString: url });
  return { db: drizzle(pool, { schema }), pool };
}

export type Db = ReturnType<typeof createDb>['db'];

// One pool per server process, reused across hot reloads in development.
const globalForDb = globalThis as unknown as { viewingsDb?: ReturnType<typeof createDb> };
export const db: Db = (globalForDb.viewingsDb ??= createDb()).db;
