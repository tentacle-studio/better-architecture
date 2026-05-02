import type { FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';

export function createRateLimiter(redis: Redis, options: { max: number; windowMs: number }) {
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
