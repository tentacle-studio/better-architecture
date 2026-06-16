import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Config } from '../config.js';
import * as schema from './schema.js';

const { Pool } = pg;

export function createDbClient(config: Config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    close: async () => {
      await pool.end();
    },
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
