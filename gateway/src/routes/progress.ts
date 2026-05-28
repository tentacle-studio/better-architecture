import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { findUserById } from '../db/queries/users.js';
import { findDomainMastery, findUserPathProgress } from '../db/queries/progress.js';
import { findUserStreak } from '../db/queries/daily-tasks.js';

function levelTitleForXp(xp: number) {
  if (xp >= 1000) return 'Expert';
  if (xp >= 500) return 'Advanced';
  if (xp >= 200) return 'Intermediate';
  return 'Beginner';
}

function currentStreakFromHistory(history: Array<{ streakDate: string | Date; tasksDone: number }>) {
  const activeDates = history
    .filter((row) => row.tasksDone > 0)
    .map((row) => new Date(row.streakDate))
    .sort((a, b) => b.getTime() - a.getTime());

  if (activeDates.length === 0) return 0;

  let streak = 0;
  let cursor = new Date(activeDates[0]);
  cursor.setHours(0, 0, 0, 0);

  for (const rawDate of activeDates) {
    const date = new Date(rawDate);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.round((cursor.getTime() - date.getTime()) / 86400000);

    if (streak === 0 && diffDays >= 0 && diffDays <= 1) {
      streak = 1;
      cursor = date;
      continue;
    }

    if (diffDays === 1) {
      streak += 1;
      cursor = date;
      continue;
    }

    if (diffDays > 1) break;
  }

  return streak;
}

export async function progressRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/progress', async (request, reply) => {
    const userId = request.user!.sub;
    const [user, streakHistory, pathProgress, domainProgress, pathRows] = await Promise.all([
      findUserById(opts.db, userId),
      findUserStreak(opts.db, userId, 30),
      findUserPathProgress(opts.db, userId),
      findDomainMastery(opts.db, userId),
      opts.db.pool.query(
        `SELECT lp.id, lp.title, COUNT(pm.id)::int AS total_modules
         FROM learning_paths lp
         LEFT JOIN path_modules pm ON pm.path_id = lp.id
         GROUP BY lp.id, lp.title
         ORDER BY lp.sort_order ASC, lp.created_at ASC`
      ),
    ]);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const progressByPath = new Map(pathProgress.map((row) => [row.pathId, row]));
    const paths = pathRows.rows.map((row: { id: string; title: string; total_modules: number }) => {
      const progress = progressByPath.get(row.id);
      const totalModules = Number(row.total_modules) || 0;
      const progressPct = progress?.progressPct ?? 0;
      const completedModules =
        totalModules > 0 ? Math.round((progressPct / 100) * totalModules) : 0;

      return {
        pathId: row.id,
        pathName: row.title,
        completedModules,
        totalModules,
        progress: progressPct,
      };
    });

    const domains = domainProgress.map((row) => ({
      domain: row.domain,
      level: Math.max(1, Math.ceil(row.masteryPct / 25)),
      labsCompleted: Math.round(row.masteryPct / 20),
      masteryPct: row.masteryPct,
    }));

    const xpForNextLevel = Math.max(user.level * 100, user.xp);
    const nextLevelTitle = levelTitleForXp(xpForNextLevel);

    return reply.send({
      level: user.level,
      xp: user.xp,
      levelTitle: user.levelTitle,
      xpForNextLevel,
      nextLevelTitle,
      streak: currentStreakFromHistory(streakHistory),
      paths,
      domains,
    });
  });

  fastify.get('/progress/streak', async (request, reply) => {
    const userId = request.user!.sub;
    const result = await findUserStreak(opts.db, userId, 7);
    const currentStreak = currentStreakFromHistory(result);
    const byDate = new Map(
      result.map((row) => [
        new Date(row.streakDate).toISOString().slice(0, 10),
        row.tasksDone,
      ])
    );

    const weekActivity = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      return byDate.get(key) ?? 0;
    });

    return reply.send({
      currentStreak,
      weekActivity,
    });
  });
}
