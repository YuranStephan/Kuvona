import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type {
  PgDatabase,
  PgQueryResultHKT,
  PgTransaction,
} from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Db = PgDatabase<
  PgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;
export type Tx = PgTransaction<
  PgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;
/** Anything that can run a query: the pool itself or an open transaction. */
export type Executor = Db | Tx;

const migrationsFolder = () => path.join(process.cwd(), "drizzle");

/** In-process PostgreSQL (PGlite). `dataDir` undefined → memory only (tests). */
export async function openPglite(
  dataDir?: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) await mkdir(path.dirname(dataDir), { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: migrationsFolder() });
  return { db: pglite as unknown as Db, close: () => client.close() };
}

/**
 * Hosted PostgreSQL (Supabase or any Postgres 15+), through node-postgres.
 *
 * Why pg + attachDatabasePool: on Vercel, idle functions are frozen between requests. A pooled socket that the
 * server closed while frozen still looks alive, so the next query is written into it and waits for the 300 s
 * function limit (measured on the live site: about 1 in 3 database-backed pages hung, static pages never did).
 * attachDatabasePool releases idle connections before the instance is suspended, and the client-side timeouts
 * below turn any remaining stall into a fast error instead of a hung page.
 *
 * Transaction-mode poolers (Supabase port 6543) need unnamed statements: pg only prepares a statement when the
 * query has a name, and Drizzle never sets one, so nothing else is required. Migrations run separately via
 * `npm run db:migrate`.
 */
export async function openPostgres(
  url: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    keepAlive: true,
    // Encrypts the connection. The pooler certificate is not pinned yet (see docs/DEPLOY.md); the previous
    // driver connected without TLS at all.
    ssl: { rejectUnauthorized: false },
  });
  // A broken idle client must never crash the process; the pool discards it and opens a new one.
  pool.on("error", (error) => console.error("[db] erro numa ligação inativa:", error.message));
  if (process.env.VERCEL) {
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }
  return {
    db: drizzle(pool, { schema }) as unknown as Db,
    close: () => pool.end(),
  };
}

export async function migratePostgres(url: string) {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
  try {
    await migrate(drizzle(pool), { migrationsFolder: migrationsFolder() });
  } finally {
    await pool.end();
  }
}

export function localDataDir() {
  return process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
}

const globalForDb = globalThis as unknown as { __kuvonaDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return (await openPostgres(url)).db;
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL é obrigatório na Vercel: o PostgreSQL embutido só funciona com disco local.",
    );
  }
  const { db } = await openPglite(localDataDir());
  const { seedIfEmpty } = await import("../seed/seed");
  await seedIfEmpty(db);
  return db;
}

/** Shared connection for the running app (survives hot reload in development). */
export function getDb(): Promise<Db> {
  globalForDb.__kuvonaDb ??= connect().catch((error: unknown) => {
    globalForDb.__kuvonaDb = undefined;
    throw error;
  });
  return globalForDb.__kuvonaDb;
}

/** Test hook: replace the shared connection. */
export function setDbForTesting(db: Db | undefined) {
  globalForDb.__kuvonaDb = db ? Promise.resolve(db) : undefined;
}
