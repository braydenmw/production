import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;
let schemaReadyPromise: Promise<boolean> | null = null;

function getDatabaseConfig(): { connectionString?: string; host?: string; port?: number; database?: string; user?: string; password?: string; ssl?: { rejectUnauthorized: boolean } } | null {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    };
  }

  if (!process.env.PGHOST) {
    return null;
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'bw_nexus_ai',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

export function isPostgresConfigured(): boolean {
  return getDatabaseConfig() !== null;
}

export function getPostgresPool(): Pool | null {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();
  if (!config) {
    return null;
  }

  pool = new Pool({
    ...config,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (error) => {
    console.error('[Postgres] Pool error:', error);
  });

  return pool;
}

async function createSchema(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_learnings (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_preferences (
      preference_scope TEXT PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_vectors (
      id TEXT PRIMARY KEY,
      text_content TEXT NOT NULL,
      source TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      embedding JSONB NOT NULL,
      embedding_model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_memory_sessions_updated_at ON memory_sessions (updated_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_memory_learnings_created_at ON memory_learnings (created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_memory_vectors_updated_at ON memory_vectors (updated_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_memory_vectors_source ON memory_vectors (source)');
}

export async function ensurePostgresSchema(): Promise<boolean> {
  const activePool = getPostgresPool();
  if (!activePool) {
    return false;
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = await activePool.connect();
      try {
        await createSchema(client);
        return true;
      } finally {
        client.release();
      }
    })().catch((error) => {
      console.error('[Postgres] Schema initialization failed:', error);
      schemaReadyPromise = null;
      return false;
    });
  }

  return schemaReadyPromise;
}

export async function withPostgres<T>(callback: (client: PoolClient) => Promise<T>): Promise<T | null> {
  const ready = await ensurePostgresSchema();
  if (!ready) {
    return null;
  }

  const activePool = getPostgresPool();
  if (!activePool) {
    return null;
  }

  const client = await activePool.connect();
  try {
    return await callback(client);
  } catch (error) {
    console.error('[Postgres] Query failed:', error);
    return null;
  } finally {
    client.release();
  }
}