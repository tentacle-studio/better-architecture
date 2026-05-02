import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';

export async function terminalWebSocket(
  fastify: FastifyInstance,
  opts: {
    orchestrator: OrchestratorClient;
    sessionService: SessionService;
  }
) {
  fastify.get('/ws/terminal/:sandboxId', { websocket: true }, async (socket: WebSocket, request: any) => {
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

    const grpcStream = opts.orchestrator.execStream();
    
    grpcStream.write({
      sandboxId,
      type: 'start',
    });

    socket.on('message', (message: Buffer) => {
      try {
        if (message[0] === 123) {
          const data = JSON.parse(message.toString());
          if (data.type === 'resize') {
            grpcStream.write({
              sandboxId,
              type: 'resize',
              cols: data.cols,
              rows: data.rows,
            });
          }
        } else {
          grpcStream.write({
            sandboxId,
            type: 'stdin',
            data: message,
          });
        }
      } catch (error) {
        fastify.log.error({ err: error }, 'Terminal WS error');
      }
    });

    grpcStream.on('data', (chunk: any) => {
      if (chunk.type === 'stdout' || chunk.type === 'stderr') {
        socket.send(chunk.data);
      }
    });

    grpcStream.on('error', (error: Error) => {
      fastify.log.error({ err: error }, 'gRPC stream error');
      socket.close(1011, 'Internal error');
    });

    socket.on('close', () => {
      grpcStream.end();
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
