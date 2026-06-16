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

  // Transform snake_case to camelCase for frontend
  const transformedLabs = results.map(lab => ({
    id: lab.id,
    moduleId: lab.moduleId,
    title: lab.title,
    description: lab.description,
    difficulty: lab.difficulty,
    estimatedMin: lab.estimatedMin,
    seedManifest: lab.seedManifest, // Keep as base64
    seedLevel: lab.seedLevel,
    sortOrder: lab.sortOrder,
    tags: lab.tags,
    status: lab.status,
    createdAt: lab.createdAt.toISOString(),
  }));

  return {
    labs: transformedLabs,
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

  const lab = result[0];
  if (!lab) return null;

  // Keep seed_manifest as base64 for orchestrator compatibility
  // Transform snake_case to camelCase for frontend
  return {
    id: lab.id,
    moduleId: lab.moduleId,
    title: lab.title,
    description: lab.description,
    difficulty: lab.difficulty,
    estimatedMin: lab.estimatedMin,
    seedManifest: lab.seedManifest, // Keep as base64
    seedLevel: lab.seedLevel,
    sortOrder: lab.sortOrder,
    tags: lab.tags,
    status: lab.status,
    createdAt: lab.createdAt.toISOString(),
  };
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
