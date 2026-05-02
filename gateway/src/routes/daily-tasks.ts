import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { updateUserXp } from '../db/queries/users.js';

export async function dailyTasksRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/daily-tasks', async (request, reply) => {
    const userId = request.user!.sub;
    const today = new Date().toISOString().split('T')[0];

    const result = await opts.db.pool.query(
      `SELECT id, day, week, topic, tasks
       FROM daily_tasks
       WHERE user_id = $1 AND day = $2`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      return reply.send({
        day: today,
        week: Math.ceil(new Date().getDate() / 7),
        topic: 'General',
        tasks: [],
      });
    }

    const row = result.rows[0];
    return reply.send({
      day: row.day,
      week: row.week,
      topic: row.topic,
      tasks: row.tasks,
    });
  });

  fastify.patch('/daily-tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { isCompleted } = request.body as { isCompleted: boolean };
    const userId = request.user!.sub;

    const result = await opts.db.pool.query(
      `UPDATE daily_tasks
       SET tasks = jsonb_set(
         tasks,
         (
           SELECT jsonb_path_query_array(tasks, '$[*] ? (@.id == $id)', jsonb_build_object('id', $2))
         )::text::int[],
         jsonb_build_object('isCompleted', $3)
       ),
       updated_at = NOW()
       WHERE user_id = $1 AND tasks @> jsonb_build_array(jsonb_build_object('id', $2))
       RETURNING tasks`,
      [userId, taskId, isCompleted]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (isCompleted) {
      const tasks = result.rows[0].tasks;
      const task = tasks.find((t: any) => t.id === taskId);
      
      if (task && task.xp) {
        await updateUserXp(opts.db, userId, task.xp);
      }
    }

    return reply.send({ success: true });
  });
}
