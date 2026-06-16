import { eq, and, desc } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { submissions } from '../schema.js';

export async function createSubmission(
  db: DbClient,
  data: {
    userId: string;
    labId: string;
    sandboxId: string;
    passed: boolean;
    score: number;
    resultsJson: any;
    xpAwarded: number;
  }
) {
  const result = await db.db
    .insert(submissions)
    .values(data)
    .returning();
  
  return result[0];
}

export async function findUserSubmissions(
  db: DbClient,
  userId: string,
  options?: { labId?: string; limit?: number }
) {
  const whereClause = options?.labId
    ? and(eq(submissions.userId, userId), eq(submissions.labId, options.labId))
    : eq(submissions.userId, userId);

  const baseQuery = db.db
    .select()
    .from(submissions)
    .where(whereClause)
    .orderBy(desc(submissions.submittedAt));

  return await (options?.limit ? baseQuery.limit(options.limit) : baseQuery);
}

export async function findLabSubmissions(db: DbClient, labId: string, limit = 50) {
  return await db.db
    .select()
    .from(submissions)
    .where(eq(submissions.labId, labId))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit);
}

export async function findBestSubmission(db: DbClient, userId: string, labId: string) {
  const result = await db.db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, userId),
        eq(submissions.labId, labId),
        eq(submissions.passed, true)
      )
    )
    .orderBy(desc(submissions.score))
    .limit(1);
  
  return result[0] || null;
}
