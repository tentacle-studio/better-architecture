import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';
import { finishSpan, startSpan, trackWebSocketConnection } from '../observability/telemetry.js';

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
    const releaseConnection = trackWebSocketConnection('terminal');

    // First message must contain sandbox_id per orchestrator proto
    grpcStream.write({
      sandbox_id: sandboxId,
    });

    socket.on('message', (message: Buffer) => {
      const span = startSpan('gateway.ws.message', {
        'ws.type': 'terminal',
        'ws.sandbox_id': sandboxId,
      });

      try {
        const messageStr = message.toString();

        // Handle heartbeat ping/pong
        if (messageStr === 'ping') {
          socket.send('pong');
          finishSpan(span, {
            attributes: {
              'ws.message_kind': 'heartbeat',
            },
          });
          return;
        }

        if (message[0] === 123) {
          const data = JSON.parse(messageStr);
          if (data.type === 'resize') {
            fastify.log.info({ cols: data.cols, rows: data.rows }, 'terminal resize');
            grpcStream.write({
              resize: {
                width: data.cols,
                height: data.rows,
              },
            });
            finishSpan(span, {
              attributes: {
                'ws.message_kind': 'resize',
              },
            });
          }
        } else {
          fastify.log.info({ stdinHex: message.toString('hex'), len: message.length }, 'terminal stdin');
          grpcStream.write({
            stdin: message,
          });
          finishSpan(span, {
            attributes: {
              'ws.message_kind': 'stdin',
              'ws.message_bytes': message.length,
            },
          });
        }
      } catch (error) {
        fastify.log.error({ err: error }, 'Terminal WS error');
        finishSpan(span, { error });
      }
    });

    grpcStream.on('data', (chunk: any) => {
      if (chunk.stdout && chunk.stdout.length > 0) {
        fastify.log.info({ stdoutHex: Buffer.from(chunk.stdout).toString('hex'), len: chunk.stdout.length }, 'grpc stdout');
        socket.send(Buffer.from(chunk.stdout));
      }
      if (chunk.stderr && chunk.stderr.length > 0) {
        socket.send(Buffer.from(chunk.stderr));
      }
    });

    grpcStream.on('error', (error: any) => {
      // Ignore CANCELLED errors (code 1) - these happen during normal shutdown
      if (error.code === 1) {
        fastify.log.debug('gRPC exec stream cancelled');
        return;
      }
      fastify.log.error({ err: error }, 'gRPC stream error');
      if (socket.readyState === 1) {
        socket.close(1011, 'Internal error');
      }
    });

    socket.on('close', () => {
      grpcStream.end();
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
