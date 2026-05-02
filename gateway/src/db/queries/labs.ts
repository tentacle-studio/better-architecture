import { eq, desc, count } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { labs, quizChecks } from '../schema.js';

export async function findLabs(
  db: DbClient,
  options?: {
    page?: number;
    limit?: number;
    category?: string;
  }
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  const results = await db.db
    .select()
    .from(labs)
    .orderBy(desc(labs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db.db
    .select({ count: count() })
    .from(labs);

  return {
    labs: results,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  };
}

export async function findLabById(db: DbClient, labId: string) {
  const result = await db.db
    .select()
    .from(labs)
    .where(eq(labs.id, labId))
    .limit(1);
  
  return result[0] || null;
}

export async function findLabWithChecks(db: DbClient, labId: string) {
  const lab = await findLabById(db, labId);
  
  if (!lab) return null;
  
  const checks = await db.db
    .select()
    .from(quizChecks)
    .where(eq(quizChecks.labId, labId))
    .orderBy(quizChecks.sortOrder);
  
  return {
    ...lab,
    checks,
  };
}
