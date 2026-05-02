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
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const payload = await authService.verifyAccessToken(token);
      
      request.user = payload;
    } catch (error) {
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
