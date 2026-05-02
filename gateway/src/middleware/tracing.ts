import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { FastifyRequest, FastifyReply } from 'fastify';

const tracer = trace.getTracer('gateway');

export function createTracingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const span = tracer.startSpan(`${request.method} ${request.url}`, {
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'http.route': request.routerPath,
        'user.id': request.user?.sub,
      },
    });

    const ctx = trace.setSpan(context.active(), span);

    reply.raw.on('finish', () => {
      span.setAttributes({
        'http.status_code': reply.statusCode,
      });

      if (reply.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${reply.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
    });

    await context.with(ctx, async () => {});
  };
}
