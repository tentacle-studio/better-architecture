import { eq, and, lt } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { sandboxSessions } from '../schema.js';

export async function createSandboxSession(
  db: DbClient,
  data: {
    userId: string;
    labId: string;
    sandboxId: string;
    expiresAt: Date;
  }
) {
  const result = await db.db
    .insert(sandboxSessions)
    .values({
      userId: data.userId,
      labId: data.labId,
      sandboxId: data.sandboxId,
      expiresAt: data.expiresAt,
      status: 'PROVISIONING',
    })
    .returning();
  
  return result[0];
}

export async function findSandboxSessionById(db: DbClient, sessionId: string) {
  const result = await db.db
    .select()
    .from(sandboxSessions)
    .where(eq(sandboxSessions.id, sessionId))
    .limit(1);
  
  return result[0] || null;
}

export async function findSandboxSessionBySandboxId(db: DbClient, sandboxId: string) {
  const result = await db.db
    .select()
    .from(sandboxSessions)
    .where(eq(sandboxSessions.sandboxId, sandboxId))
    .limit(1);
  
  return result[0] || null;
}

export async function findActiveSandboxSession(db: DbClient, userId: string, labId: string) {
  const result = await db.db
    .select()
    .from(sandboxSessions)
    .where(
      and(
        eq(sandboxSessions.userId, userId),
        eq(sandboxSessions.labId, labId),
        eq(sandboxSessions.status, 'READY')
      )
    )
    .limit(1);
  
  return result[0] || null;
}

export async function updateSandboxSessionStatus(
  db: DbClient,
  sessionId: string,
  status: string,
  updates?: {
    kubeconfig?: string;
    vclusterEp?: string;
    completedAt?: Date;
  }
) {
  const result = await db.db
    .update(sandboxSessions)
    .set({
      status,
      ...updates,
    })
    .where(eq(sandboxSessions.id, sessionId))
    .returning();
  
  return result[0];
}

export async function findExpiredSessions(db: DbClient) {
  return await db.db
    .select()
    .from(sandboxSessions)
    .where(
      and(
        eq(sandboxSessions.status, 'READY'),
        lt(sandboxSessions.expiresAt, new Date())
      )
    );
}
