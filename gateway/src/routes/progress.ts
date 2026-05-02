import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';

export async function progressRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/progress', async (request, reply) => {
    const userId = request.user!.sub;

    const userResult = await opts.db.pool.query(
      'SELECT level, xp FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const streakResult = await opts.db.pool.query(
      'SELECT current_streak FROM user_streaks WHERE user_id = $1',
      [userId]
    );

    const streak = streakResult.rows[0]?.current_streak || 0;

    const pathsResult = await opts.db.pool.query(
      `SELECT p.id as path_id, p.name as path_name, 
              COUNT(DISTINCT up.module_id) as completed_modules,
              (SELECT COUNT(*) FROM modules WHERE path_id = p.id) as total_modules
       FROM paths p
       LEFT JOIN user_progress up ON up.path_id = p.id AND up.user_id = $1
       GROUP BY p.id, p.name`,
      [userId]
    );

    const paths = pathsResult.rows.map((row: any) => ({
      pathId: row.path_id,
      pathName: row.path_name,
      completedModules: parseInt(row.completed_modules),
      totalModules: parseInt(row.total_modules),
      progress: row.total_modules > 0 
        ? (parseInt(row.completed_modules) / parseInt(row.total_modules)) * 100 
        : 0,
    }));

    const domainsResult = await opts.db.pool.query(
      `SELECT domain, COUNT(*) as labs_completed
       FROM lab_completions
       WHERE user_id = $1
       GROUP BY domain`,
      [userId]
    );

    const domains = domainsResult.rows.map((row: any) => ({
      domain: row.domain,
      level: Math.floor(parseInt(row.labs_completed) / 5) + 1,
      labsCompleted: parseInt(row.labs_completed),
    }));

    return reply.send({
      level: user.level,
      xp: user.xp,
      streak,
      paths,
      domains,
    });
  });

  fastify.get('/progress/streak', async (request, reply) => {
    const userId = request.user!.sub;

    const result = await opts.db.pool.query(
      `SELECT current_streak, week_activity
       FROM user_streaks
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.send({
        currentStreak: 0,
        weekActivity: [0, 0, 0, 0, 0, 0, 0],
      });
    }

    const row = result.rows[0];
    return reply.send({
      currentStreak: row.current_streak,
      weekActivity: row.week_activity || [0, 0, 0, 0, 0, 0, 0],
    });
  });
}
