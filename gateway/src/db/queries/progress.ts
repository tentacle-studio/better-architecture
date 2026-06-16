import { eq } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { userPathProgress, domainMastery } from '../schema.js';

export async function findUserPathProgress(db: DbClient, userId: string) {
  return await db.db
    .select()
    .from(userPathProgress)
    .where(eq(userPathProgress.userId, userId));
}

export async function upsertUserPathProgress(
  db: DbClient,
  data: {
    userId: string;
    pathId: string;
    progressPct: number;
    completedAt?: Date;
  }
) {
  const result = await db.db
    .insert(userPathProgress)
    .values(data)
    .onConflictDoUpdate({
      target: [userPathProgress.userId, userPathProgress.pathId],
      set: {
        progressPct: data.progressPct,
        completedAt: data.completedAt,
      },
    })
    .returning();
  
  return result[0];
}

export async function findDomainMastery(db: DbClient, userId: string) {
  return await db.db
    .select()
    .from(domainMastery)
    .where(eq(domainMastery.userId, userId));
}

export async function upsertDomainMastery(
  db: DbClient,
  data: {
    userId: string;
    domain: string;
    masteryPct: number;
  }
) {
  const result = await db.db
    .insert(domainMastery)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [domainMastery.userId, domainMastery.domain],
      set: {
        masteryPct: data.masteryPct,
        updatedAt: new Date(),
      },
    })
    .returning();
  
  return result[0];
}
