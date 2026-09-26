import { createDb, type Db } from '../../src/db/client';

// Each worker opens one connection pool and closes it when the worker finishes.
export async function withDb(use: (db: Db) => Promise<void>) {
  const { db, pool } = createDb(process.env.DATABASE_URL);
  await use(db);
  await pool.end();
}
