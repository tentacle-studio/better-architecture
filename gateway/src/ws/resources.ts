import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';

export async function resourcesWebSocket(
  fastify: FastifyInstance,
  opts: {
    orchestrator: OrchestratorClient;
    sessionService: SessionService;
  }
) {
  fastify.get('/ws/resources/:sandboxId', { websocket: true }, async (socket: WebSocket, request: any) => {
    const { sandboxId } = request.params;
    const userId = request.user?.sub;

    fastify.log.info({ sandboxId, userId, hasToken: !!request.query?.token }, 'Resource WebSocket connection attempt');

    if (!userId) {
      fastify.log.warn({ sandboxId, hasUser: !!request.user, query: Object.keys(request.query || {}) }, 'Unauthorized: no user ID');
      socket.close(1008, 'Unauthorized');
      return;
    }

    try {
      const session = await opts.sessionService.getSession(sandboxId);
      if (!session) {
        fastify.log.warn({ sandboxId, userId }, 'Session not found');
        socket.close(1008, 'Session not found');
        return;
      }

      if (session.userId !== userId) {
        fastify.log.warn({ sandboxId, userId, sessionUserId: session.userId }, 'User ID mismatch');
        socket.close(1008, 'Unauthorized');
        return;
      }

      fastify.log.info({ sandboxId, userId }, 'Resource WebSocket connected');

      const grpcStream = opts.orchestrator.watchResources(sandboxId);

    grpcStream.on('data', (event: any) => {
      // Send Resource format that frontend expects
      const resource = {
        kind: event.kind,
        name: event.name,
        namespace: event.namespace,
        status: event.status,
        eventType: event.event_type || 'Initial',
        readyContainers: event.readyContainers,
        totalContainers: event.totalContainers,
        restartCount: event.restartCount,
      };

      socket.send(JSON.stringify(resource));
    });

      grpcStream.on('error', (error: any) => {
        // Ignore CANCELLED errors (code 1) - these happen during normal shutdown
        if (error.code === 1) {
          fastify.log.debug({ sandboxId }, 'gRPC stream cancelled');
          return;
        }
        fastify.log.error({ error, sandboxId }, 'gRPC resource watch error');
        if (socket.readyState === 1) {
          // WebSocket close reason must be <= 123 bytes
          const reason = 'Internal error';
          socket.close(1011, reason);
        }
      });

      grpcStream.on('end', () => {
        fastify.log.info({ sandboxId }, 'Resource watch stream ended');
        if (socket.readyState === 1) {
          socket.close(1000);
        }
      });

      socket.on('close', () => {
        fastify.log.info({ sandboxId }, 'Resource WebSocket disconnected');
        // Cancel the gRPC stream when socket closes
        grpcStream.cancel();
        grpcStream.removeAllListeners();
      });

      const pingInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.ping();
        }
      }, 30000);

      socket.on('close', () => {
        clearInterval(pingInterval);
      });
    } catch (error) {
      fastify.log.error({ error, sandboxId, userId }, 'Error in resource WebSocket handler');
      socket.close(1011, 'Internal server error');
    }
  });
}