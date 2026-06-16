import { eq } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { learningPaths, pathModules, labs } from '../schema.js';

export async function findAllLearningPaths(db: DbClient) {
  return await db.db
    .select()
    .from(learningPaths)
    .orderBy(learningPaths.sortOrder);
}

export async function findLearningPathById(db: DbClient, pathId: string) {
  const result = await db.db
    .select()
    .from(learningPaths)
    .where(eq(learningPaths.id, pathId))
    .limit(1);
  
  return result[0] || null;
}

export async function findPathModules(db: DbClient, pathId: string) {
  return await db.db
    .select()
    .from(pathModules)
    .where(eq(pathModules.pathId, pathId))
    .orderBy(pathModules.sortOrder);
}

export async function findModuleLabs(db: DbClient, moduleId: string) {
  return await db.db
    .select()
    .from(labs)
    .where(eq(labs.moduleId, moduleId))
    .orderBy(labs.sortOrder);
}
