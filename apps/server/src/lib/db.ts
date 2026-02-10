import { Pool, PoolClient, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.pgPool) {
    return global.pgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000
  });

  if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool;
  }

  return pool;
}

let schemaInitPromise: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const pool = getPool();
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          usd_balance_cents INT NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS holdings (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL CHECK (symbol IN ('BTC', 'ETH', 'SOL')),
          amount NUMERIC(32, 12) NOT NULL,
          PRIMARY KEY (user_id, symbol)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
          symbol TEXT NOT NULL CHECK (symbol IN ('BTC', 'ETH', 'SOL')),
          price_usd NUMERIC(20, 8) NOT NULL,
          qty NUMERIC(32, 12) NOT NULL,
          usd_amount NUMERIC(20, 8) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }
  await schemaInitPromise;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export const pool = {
  query: async <T extends QueryResultRow>(text: string, params?: unknown[]) => {
    await ensureSchema();
    return getPool().query<T>(text, params);
  }
};
