import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';
import type { NatsClient } from '../services/nats-client.js';
import { finishSpan, startSpan, trackWebSocketConnection } from '../observability/telemetry.js';

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
    const releaseConnection = trackWebSocketConnection('canvas');
    
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
      const span = startSpan('gateway.ws.message', {
        'ws.type': 'canvas',
        'ws.sandbox_id': sandboxId,
        'resource.kind': event.kind,
      });

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

      finishSpan(span, {
        attributes: {
          'ws.message_kind': 'resource_event',
        },
      });
    });

    grpcStream.on('error', (error: any) => {
      // Ignore CANCELLED errors (code 1) - these happen during normal shutdown
      if (error.code === 1) {
        fastify.log.debug('gRPC watch stream cancelled');
        return;
      }
      fastify.log.error({ err: error }, 'gRPC watch stream error');
      if (socket.readyState === 1) {
        socket.close(1011, 'Internal error');
      }
    });

    socket.on('close', () => {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
      grpcStream.cancel();
      grpcStream.removeAllListeners();
      releaseConnection();
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
