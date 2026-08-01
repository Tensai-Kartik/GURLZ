import { PrismaClient } from '@prisma/client';

/**
 * Ensures Prisma database URL disables prepared statement caching (statement_cache_size=0)
 * to prevent PostgreSQL errors 42P05 ("prepared statement already exists")
 * and 26000 ("prepared statement does not exist") when routing through Supabase PgBouncer.
 */
function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  const urlObj = new URL(url);
  urlObj.searchParams.set('pgbouncer', 'true');
  urlObj.searchParams.set('statement_cache_size', '0');
  return urlObj.toString();
}

const dbUrl = getDatabaseUrl();

const prisma = new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
