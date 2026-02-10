import { Pool, PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const pool =
  global.pgPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
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
