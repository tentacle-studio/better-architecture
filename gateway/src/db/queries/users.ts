import { eq, sql } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { users } from '../schema.js';

export async function findUserById(db: DbClient, userId: string) {
  const result = await db.db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function findUserByEmail(db: DbClient, email: string) {
  const result = await db.db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertUser(
  db: DbClient,
  data: { email: string; displayName: string; role?: 'student' | 'admin'; avatarUrl?: string }
) {
  const result = await db.db
    .insert(users)
    .values({
      email: data.email,
      displayName: data.displayName,
      role: data.role || 'student',
      avatarUrl: data.avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning();
  
  return result[0];
}

export async function createUserWithPassword(
  db: DbClient,
  data: { email: string; displayName: string; passwordHash: string }
) {
  const result = await db.db
    .insert(users)
    .values({
      email: data.email,
      displayName: data.displayName,
      passwordHash: data.passwordHash,
      role: 'student',
    })
    .returning();
  
  return result[0];
}

export async function updateUserXp(db: DbClient, userId: string, xpToAdd: number) {
  const result = await db.db
    .update(users)
    .set({
      xp: sql`${users.xp} + ${xpToAdd}`,
      level: sql`CASE WHEN (${users.xp} + ${xpToAdd}) >= (${users.level} * 100) THEN ${users.level} + 1 ELSE ${users.level} END`,
      levelTitle: sql`CASE 
        WHEN (${users.xp} + ${xpToAdd}) >= 1000 THEN 'Expert'
        WHEN (${users.xp} + ${xpToAdd}) >= 500 THEN 'Advanced'
        WHEN (${users.xp} + ${xpToAdd}) >= 200 THEN 'Intermediate'
        ELSE 'Beginner'
      END`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  
  return result[0];
}

export async function updateUserProfile(
  db: DbClient,
  userId: string,
  patch: {
    displayName?: string;
    avatarUrl?: string | null;
  }
) {
  const nextPatch: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.displayName !== undefined) {
    nextPatch.displayName = patch.displayName;
  }
  if (patch.avatarUrl !== undefined) {
    nextPatch.avatarUrl = patch.avatarUrl;
  }

  const result = await db.db
    .update(users)
    .set(nextPatch)
    .where(eq(users.id, userId))
    .returning();

  return result[0] || null;
}
