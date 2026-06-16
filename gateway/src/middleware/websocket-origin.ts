import type { FastifyRequest, FastifyReply } from 'fastify';

export function createWebSocketOriginValidator(allowedOrigin: string, nodeEnv: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.headers.upgrade !== 'websocket') {
      return;
    }

    // Skip validation in development
    if (nodeEnv === 'development') {
      return;
    }

    const origin = request.headers.origin;

    if (!origin) {
      return reply.status(403).send({ error: 'Origin header required for WebSocket connections' });
    }

    if (origin !== allowedOrigin) {
      return reply.status(403).send({ error: 'Invalid origin for WebSocket connection' });
    }
  };
}
