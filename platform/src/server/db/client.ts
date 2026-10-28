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

/** Hosted PostgreSQL (Supabase or any Postgres 15+). Migrations run separately via `npm run db:migrate`. */
export async function openPostgres(
  url: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Transaction-mode poolers (Supabase port 6543) need two things from the client:
  //  - prepare:false  → no named prepared statements;
  //  - max_pipeline:1 → one query in flight per connection. postgres.js pipelines up to 100 by default, and the
  //    pooler can then split a pipeline across server connections, leaving the session stuck in ClientRead until
  //    "statement timeout" (measured: bursts of concurrent queries hung for minutes; with 1 they take <1 s).
  // `max_pipeline` is read by postgres.js (src/connection.js) but missing from its TypeScript definitions.
  const sql = postgres(url, {
    prepare: false,
    max_pipeline: 1,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    connect_timeout: 15,
    idle_timeout: 30,
  } as Parameters<typeof postgres>[1]);
  return {
    db: drizzle(sql, { schema }) as unknown as Db,
    close: () => sql.end(),
  };
}

export async function migratePostgres(url: string) {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: migrationsFolder() });
  } finally {
    await sql.end();
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
