import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { updateUserXp } from '../db/queries/users.js';
import { completeDailyTask, findDailyTasks } from '../db/queries/daily-tasks.js';

function toTaskType(taskType: string): 'Technical Lab' | 'Documentation' | 'Assessment' | 'Social' {
  switch (taskType) {
    case 'lab':
      return 'Technical Lab';
    case 'reading':
      return 'Documentation';
    case 'quiz':
      return 'Assessment';
    default:
      return 'Social';
  }
}

export async function dailyTasksRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/daily-tasks', async (request, reply) => {
    const userId = request.user!.sub;
    const today = new Date().toISOString().split('T')[0];
    const tasks = await findDailyTasks(opts.db, userId, today);

    return reply.send(
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? '',
        type: toTaskType(task.taskType),
        duration: `${task.durationMin} min`,
        isCompleted: task.isCompleted,
      }))
    );
  });

  fastify.patch('/daily-tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { isCompleted } = request.body as { isCompleted: boolean };
    const userId = request.user!.sub;
    const task = await opts.db.db.query.dailyTasks.findFirst({
      where: (dailyTasks, { and, eq }) =>
        and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)),
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (isCompleted) {
      const completed = await completeDailyTask(opts.db, taskId);
      if (completed) {
        const xpAward = completed.taskType === 'lab' ? 50 : completed.taskType === 'quiz' ? 25 : 10;
        await updateUserXp(opts.db, userId, xpAward);
      }
    }

    return reply.send({ success: true });
  });
}
