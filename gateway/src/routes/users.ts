import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { findUserById } from '../db/queries/users.js';

export async function usersRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/users/me', async (request, reply) => {
    const userId = request.user!.sub;
    
    const user = await findUserById(opts.db, userId);
    
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(user);
  });

  fastify.patch('/users/me', async (request, reply) => {
    const userId = request.user!.sub;
    const { name } = request.body as { name?: string };

    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const result = await opts.db.pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const row = result.rows[0];
    return reply.send({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      level: row.level,
      xp: row.xp,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  });
}
