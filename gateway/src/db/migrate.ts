import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  console.log('Running migrations...');
  
  await migrate(db, {
    migrationsFolder: join(__dirname, '../../migrations'),
  });

  console.log('Migrations completed successfully');
  
  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
