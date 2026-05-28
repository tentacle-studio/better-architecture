import { SpanStatusCode, type Span } from '@opentelemetry/api';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { recordHttpRequestMetrics, startSpan } from '../observability/telemetry.js';

const requestSpanKey = Symbol('gateway-request-span');
const requestStartedAtKey = Symbol('gateway-request-started-at');

type TracedRequest = FastifyRequest & {
  [requestSpanKey]?: Span;
  [requestStartedAtKey]?: bigint;
};

export function createTracingMiddleware() {
  return async (request: FastifyRequest) => {
    const tracedRequest = request as TracedRequest;
    tracedRequest[requestStartedAtKey] = process.hrtime.bigint();
    tracedRequest[requestSpanKey] = startSpan('gateway.http.request', {
      'http.method': request.method,
      'http.target': request.url,
    });
  };
}

export function createTracingResponseHook() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tracedRequest = request as TracedRequest;
    const span = tracedRequest[requestSpanKey];
    if (!span) return;

    const route = request.routeOptions.url || 'unknown';
    const startedAt = tracedRequest[requestStartedAtKey];
    if (startedAt) {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      recordHttpRequestMetrics(request.method, route, reply.statusCode, durationSeconds);
    }

    span.setAttributes({
      'http.route': route,
      'http.status_code': reply.statusCode,
      'user.id': request.user?.sub ?? 'anonymous',
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
    delete tracedRequest[requestSpanKey];
    delete tracedRequest[requestStartedAtKey];
  };
}
