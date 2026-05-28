import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { findUserById, updateUserProfile } from '../db/queries/users.js';
import { findUserStreak } from '../db/queries/daily-tasks.js';

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

export async function usersRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/users/me', async (request, reply) => {
    const userId = request.user!.sub;
    
    const [user, streakHistory] = await Promise.all([
      findUserById(opts.db, userId),
      findUserStreak(opts.db, userId, 30),
    ]);
    
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      xp: user.xp,
      level: user.level,
      levelTitle: user.levelTitle,
      currentStreak: currentStreakFromHistory(streakHistory),
    });
  });

  fastify.patch('/users/me', async (request, reply) => {
    const userId = request.user!.sub;
    const { displayName, avatarUrl } = request.body as {
      displayName?: string;
      avatarUrl?: string | null;
    };

    if (!displayName && avatarUrl === undefined) {
      return reply.status(400).send({ error: 'At least one profile field is required' });
    }

    const user = await updateUserProfile(opts.db, userId, {
      displayName,
      avatarUrl,
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      xp: user.xp,
      level: user.level,
      levelTitle: user.levelTitle,
      currentStreak: 0,
    });
  });
}
