import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';
import type { NatsClient } from '../services/nats-client.js';

export async function canvasSyncWebSocket(
  fastify: FastifyInstance,
  opts: {
    orchestrator: OrchestratorClient;
    sessionService: SessionService;
    natsClient: NatsClient;
  }
) {
  fastify.get('/ws/canvas/:sandboxId', { websocket: true }, async (socket: WebSocket, request: any) => {
    const { sandboxId } = request.params;
    const userId = request.user?.sub;

    if (!userId) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      socket.close(1008, 'Invalid session');
      return;
    }

    const grpcStream = opts.orchestrator.watchResources(sandboxId);
    
    let eventBuffer: any[] = [];
    let batchTimeout: NodeJS.Timeout | null = null;

    const flushEvents = () => {
      if (eventBuffer.length > 0 && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'batch',
          events: eventBuffer,
        }));
        eventBuffer = [];
      }
      batchTimeout = null;
    };

    grpcStream.on('data', (event: any) => {
      eventBuffer.push({
        type: 'resource_event',
        data: {
          kind: event.kind,
          name: event.name,
          status: event.status,
          connections: event.connections || [],
        },
      });

      if (!batchTimeout) {
        batchTimeout = setTimeout(flushEvents, 100);
      }
    });

    grpcStream.on('error', (error: Error) => {
      fastify.log.error({ err: error }, 'gRPC watch stream error');
      socket.close(1011, 'Internal error');
    });

    socket.on('close', () => {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
      grpcStream.cancel();
    });

    const pingInterval = setInterval(() => {
      if (socket.readyState === 1) {
        socket.ping();
      }
    }, 30000);

    socket.on('close', () => {
      clearInterval(pingInterval);
    });
  });
}
