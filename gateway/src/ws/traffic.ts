import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { SessionService } from '../services/session-service.js';
import type { NatsClient } from '../services/nats-client.js';
import type { RawTrafficEvent, TrafficEvent } from '../types/shared.js';
import { finishSpan, recordTrafficEvents, startSpan, trackWebSocketConnection } from '../observability/telemetry.js';

const BATCH_WINDOW_MS = 100;

function transformEvent(raw: RawTrafficEvent): TrafficEvent {
  return {
    src: raw.src_pod,
    dst: raw.dst_pod,
    protocol: raw.protocol,
    latency_ms: raw.latency_ns / 1_000_000,
    bytes: raw.bytes,
  };
}

export async function trafficWebSocket(
  fastify: FastifyInstance,
  opts: {
    sessionService: SessionService;
    natsClient: NatsClient;
  }
) {
  fastify.get('/ws/traffic/:sandboxId', { websocket: true }, async (socket: WebSocket, request: any) => {
    const { sandboxId } = request.params as { sandboxId: string };
    const userId = request.user?.sub as string | undefined;

    if (!userId) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      socket.close(1008, 'Invalid session');
      return;
    }

    let batch: TrafficEvent[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const releaseConnection = trackWebSocketConnection('traffic');

    const flush = () => {
      if (batch.length === 0) return;
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'traffic', events: batch }));
      }
      batch = [];
      flushTimer = null;
    };

    let stopTraffic: (() => void) | null = null;
    try {
      stopTraffic = await opts.natsClient.subscribeTraffic(userId, sandboxId, (raw) => {
        const span = startSpan('gateway.ws.message', {
          'ws.type': 'traffic',
          'ws.sandbox_id': sandboxId,
        });

        batch.push(transformEvent(raw));
        recordTrafficEvents(sandboxId, 1);
        if (!flushTimer) flushTimer = setTimeout(flush, BATCH_WINDOW_MS);
        finishSpan(span, {
          attributes: {
            'ws.message_kind': 'traffic_event',
          },
        });
      });
    } catch (err) {
      fastify.log.error({ err, sandboxId }, 'Failed to subscribe to NATS traffic');
      socket.close(1011, 'Internal error');
      return;
    }

    const pingInterval = setInterval(() => {
      if (socket.readyState === 1) socket.ping();
    }, 30_000);

    socket.on('close', () => {
      clearInterval(pingInterval);
      if (flushTimer) clearTimeout(flushTimer);
      if (stopTraffic) stopTraffic();
      releaseConnection();
    });
  });
}
