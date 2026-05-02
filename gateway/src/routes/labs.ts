import type { FastifyInstance } from 'fastify';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';
import type { DbClient } from '../db/client.js';
import { findLabs, findLabById } from '../db/queries/labs.js';
import { updateUserXp } from '../db/queries/users.js';

export async function labsRoutes(
  fastify: FastifyInstance,
  opts: {
    orchestrator: OrchestratorClient;
    sessionService: SessionService;
    db: DbClient;
  }
) {
  fastify.get('/labs', async (request, reply) => {
    const { page, limit, category } = request.query as {
      page?: string;
      limit?: string;
      category?: string;
    };

    const result = await findLabs(opts.db, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
    });

    return reply.send(result);
  });

  fastify.get('/labs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const lab = await findLabById(opts.db, id);
    
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    return reply.send(lab);
  });

  fastify.post('/labs/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;

    const lab = await findLabById(opts.db, id);
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    try {
      const sandbox = await opts.orchestrator.createSandbox({
        userId,
        labId: id,
        templateId: lab.seedManifest,
      });

      const wsProtocol = request.protocol === 'https' ? 'wss' : 'ws';
      const wsBaseUrl = `${wsProtocol}://${request.hostname}`;

      const session = {
        sandboxId: sandbox.sandboxId,
        userId,
        labId: id,
        wsTerminalUrl: `${wsBaseUrl}/ws/terminal/${sandbox.sandboxId}`,
        wsCanvasUrl: `${wsBaseUrl}/ws/canvas/${sandbox.sandboxId}`,
        wsTrafficUrl: `${wsBaseUrl}/ws/traffic/${sandbox.sandboxId}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };

      await opts.sessionService.createSession(session);

      return reply.send({
        sandboxId: sandbox.sandboxId,
        wsTerminalUrl: session.wsTerminalUrl,
        wsCanvasUrl: session.wsCanvasUrl,
        wsTrafficUrl: session.wsTrafficUrl,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create sandbox' });
    }
  });

  fastify.post('/labs/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sandboxId } = request.body as { sandboxId: string };
    const userId = request.user!.sub;

    const lab = await findLabById(opts.db, id);
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      return reply.status(403).send({ error: 'Invalid sandbox session' });
    }

    try {
      const result = await opts.orchestrator.validateQuiz({
        sandboxId,
        labId: id,
        answers: {},
      });

      if (result.passed) {
        await updateUserXp(opts.db, userId, 100);
      }

      return reply.send(result);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to validate quiz' });
    }
  });

  fastify.delete('/labs/:id/session', async (request, reply) => {
    const { sandboxId } = request.body as { sandboxId: string };
    const userId = request.user!.sub;

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      return reply.status(403).send({ error: 'Invalid sandbox session' });
    }

    try {
      await opts.orchestrator.destroySandbox({ sandboxId });
      await opts.sessionService.deleteSession(sandboxId);
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to destroy sandbox' });
    }
  });
}
