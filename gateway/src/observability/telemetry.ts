import { metrics, SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
  register,
} from 'prom-client';

const tracer = trace.getTracer('gateway');
const meter = metrics.getMeter('gateway');
const prometheusRegistry = new Registry();

collectDefaultMetrics({ register: prometheusRegistry });

const wsConnectionsActive = meter.createUpDownCounter('ws_connections_active', {
  description: 'Current active WebSocket connections',
});

const quizSubmissionTotal = meter.createCounter('quiz_submission_total', {
  description: 'Total quiz submissions by quiz and pass result',
});

const trafficEventsTotal = meter.createCounter('traffic_events_per_second', {
  description: 'Traffic events observed for a sandbox stream',
});

const gatewayHttpRequestsTotal = new Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests handled by the gateway',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [prometheusRegistry],
});

const gatewayHttpRequestDurationSeconds = new Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'HTTP request duration in seconds for the gateway',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [prometheusRegistry],
});

const gatewayWsConnectionsActive = new Gauge({
  name: 'gateway_ws_connections_active',
  help: 'Current active WebSocket connections on the gateway',
  labelNames: ['type'] as const,
  registers: [prometheusRegistry],
});

const gatewayQuizSubmissionsTotal = new Counter({
  name: 'gateway_quiz_submissions_total',
  help: 'Total quiz submissions handled by the gateway',
  labelNames: ['passed'] as const,
  registers: [prometheusRegistry],
});

const gatewayTrafficEventsTotal = new Counter({
  name: 'gateway_traffic_events_total',
  help: 'Total traffic stream events observed by the gateway',
  registers: [prometheusRegistry],
});

export function startSpan(name: string, attributes?: Attributes): Span {
  return tracer.startSpan(name, {
    attributes,
  });
}

export function finishSpan(
  span: Span | undefined,
  options?: {
    attributes?: Attributes;
    error?: unknown;
  }
) {
  if (!span) return;

  if (options?.attributes) {
    span.setAttributes(options.attributes);
  }

  if (options?.error) {
    const message = options.error instanceof Error ? options.error.message : String(options.error);
    span.recordException(options.error instanceof Error ? options.error : new Error(message));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export function recordHttpRequestMetrics(method: string, route: string, statusCode: number, durationSeconds: number) {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };

  gatewayHttpRequestsTotal.inc(labels);
  gatewayHttpRequestDurationSeconds.observe(labels, durationSeconds);
}

export function trackWebSocketConnection(type: 'terminal' | 'canvas' | 'traffic' | 'resources') {
  wsConnectionsActive.add(1, { type });
  gatewayWsConnectionsActive.inc({ type });

  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    wsConnectionsActive.add(-1, { type });
    gatewayWsConnectionsActive.dec({ type });
  };
}

export function recordQuizSubmission(quizId: string, passed: boolean) {
  const labels = {
    quiz_id: quizId,
    passed: String(passed),
  };

  quizSubmissionTotal.add(1, labels);
  gatewayQuizSubmissionsTotal.inc({ passed: String(passed) });
}

export function recordTrafficEvents(sandboxId: string, count: number) {
  trafficEventsTotal.add(count, {
    sandbox_id: sandboxId,
  });
  gatewayTrafficEventsTotal.inc(count);
}

export function getMetricsContentType() {
  return prometheusRegistry.contentType;
}

export async function renderMetrics() {
  return prometheusRegistry.metrics();
}

export { prometheusRegistry, register };
