import { eq, and, desc } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import { dailyTasks, streaks } from '../schema.js';

export async function findDailyTasks(db: DbClient, userId: string, taskDate: string) {
  return await db.db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.taskDate, taskDate)
      )
    );
}

export async function createDailyTask(
  db: DbClient,
  data: {
    userId: string;
    taskDate: string;
    taskType: string;
    title: string;
    description?: string;
    referenceId?: string;
    durationMin: number;
  }
) {
  const result = await db.db
    .insert(dailyTasks)
    .values(data)
    .onConflictDoNothing()
    .returning();
  
  return result[0] || null;
}

export async function completeDailyTask(db: DbClient, taskId: string) {
  const result = await db.db
    .update(dailyTasks)
    .set({
      isCompleted: true,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(dailyTasks.id, taskId),
        eq(dailyTasks.isCompleted, false),
      )
    )
    .returning();
  
  return result[0];
}

export async function findUserStreak(db: DbClient, userId: string, limit = 30) {
  return await db.db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .orderBy(desc(streaks.streakDate))
    .limit(limit);
}

export async function upsertStreak(
  db: DbClient,
  data: {
    userId: string;
    streakDate: string;
    tasksDone: number;
    totalTasks: number;
  }
) {
  const result = await db.db
    .insert(streaks)
    .values(data)
    .onConflictDoUpdate({
      target: [streaks.userId, streaks.streakDate],
      set: {
        tasksDone: data.tasksDone,
        totalTasks: data.totalTasks,
      },
    })
    .returning();
  
  return result[0];
}
