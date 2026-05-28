import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../services/auth-service.js';
import type { JWTPayload } from '../types/shared.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/health') {
      return;
    }

    try {
      let token: string | undefined;

      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // Fallback for WebSocket connections (browsers can't set custom headers)
      if (!token) {
        const query = request.query as Record<string, unknown>;
        const queryToken = typeof query.token === 'string' ? query.token : undefined;
        if (queryToken) token = queryToken;
      }

      if (!token) {
        // For WebSocket routes, we can't send a response after upgrade
        if (request.headers.upgrade === 'websocket') {
          reply.code(401);
          return reply.send({ error: 'Missing or invalid authorization' });
        }
        return reply.status(401).send({ error: 'Missing or invalid authorization' });
      }

      const payload = await authService.verifyAccessToken(token);

      request.user = payload;
    } catch (error) {
      // For WebSocket routes, we can't send a response after upgrade
      if (request.headers.upgrade === 'websocket') {
        reply.code(401);
        return reply.send({ error: 'Invalid or expired token' });
      }
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({ error: 'Authentication required' });
  }
  return done();
}

export function requireRole(role: 'user' | 'admin') {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    if (request.user.role !== role && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
    
    return done();
  };
}
