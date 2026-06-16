import type { FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

export function createRateLimiter(redis: Redis, options: RateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.sub || request.ip;
    const key = `ratelimit:${userId}:${Math.floor(Date.now() / options.windowMs)}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.ceil(options.windowMs / 1000));
    }

    if (current > options.max) {
      return reply.status(429).send({
        error: 'Too many requests',
        retryAfter: options.windowMs / 1000,
      });
    }

    reply.header('X-RateLimit-Limit', options.max);
    reply.header('X-RateLimit-Remaining', Math.max(0, options.max - current));
  };
}

export function createSandboxCreationRateLimiter(redis: Redis) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.sub) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const userId = request.user.sub;
    const hourKey = `sandbox:create:${userId}:${Math.floor(Date.now() / 3600000)}`;

    const current = await redis.incr(hourKey);

    if (current === 1) {
      await redis.expire(hourKey, 3600);
    }

    if (current > 10) {
      return reply.status(429).send({
        error: 'Sandbox creation limit exceeded',
        message: 'Maximum 10 sandboxes per hour',
        retryAfter: 3600,
      });
    }

    reply.header('X-Sandbox-Limit', '10');
    reply.header('X-Sandbox-Remaining', Math.max(0, 10 - current));
  };
}
