import 'dotenv/config';
import { createDb } from './client';
import { properties } from './schema';

const demo = [
  { address: '12 Birch Lane, Unit 3', bedrooms: 2, monthlyRent: 1850 },
  { address: '48 Harbour Road, Unit 11', bedrooms: 1, monthlyRent: 1400 },
  { address: '7 Mill Street', bedrooms: 3, monthlyRent: 2300 },
];

// tsx runs this file as CommonJS, which does not allow top-level await, so the work runs in main().
async function main() {
  const { db, pool } = createDb();
  try {
    await db.insert(properties).values(demo);
    console.log(`Seeded ${demo.length} properties`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
