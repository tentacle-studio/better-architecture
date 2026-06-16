import type { Config } from '../config.js';

const DEFAULT_HISTOGRAM_METRIC = 'http_request_duration_ms_bucket';
const DEFAULT_RATE_WINDOW_SECONDS = 30;

export interface LatencyCheckConfig {
  service?: string;
  thresholdMs: number;
  metricName?: string;
  sampleDurationSeconds?: number;
}

export interface LatencySeriesPoint {
  timestamp: string;
  p95: number;
}

export interface LatencySnapshot {
  enabled: boolean;
  configured: boolean;
  available: boolean;
  service?: string;
  metricName: string;
  targetThresholdMs: number;
  quantiles: {
    p50: number | null;
    p95: number | null;
    p99: number | null;
  };
  status: 'pass' | 'fail' | 'pending' | 'disabled';
  series: LatencySeriesPoint[];
  message?: string;
}

interface PrometheusInstantResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface PrometheusMatrixResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

interface PrometheusResponse<T> {
  status: string;
  data: {
    resultType: string;
    result: T[];
  };
}

export class ObservabilityService {
  constructor(private readonly config: Config) {}

  async getLatencySnapshot(args: {
    sandboxId: string;
    sessionStartedAt: Date;
    latencyCheck: LatencyCheckConfig | null;
  }): Promise<LatencySnapshot> {
    const { sandboxId, sessionStartedAt, latencyCheck } = args;

    if (!latencyCheck) {
      return {
        enabled: false,
        configured: false,
        available: false,
        metricName: DEFAULT_HISTOGRAM_METRIC,
        targetThresholdMs: 0,
        quantiles: { p50: null, p95: null, p99: null },
        status: 'disabled',
        series: [],
        message: 'No SLA latency check is configured for this lab.',
      };
    }

    if (!this.config.prometheusUrl) {
      return {
        enabled: true,
        configured: false,
        available: false,
        service: latencyCheck.service,
        metricName: latencyCheck.metricName ?? DEFAULT_HISTOGRAM_METRIC,
        targetThresholdMs: latencyCheck.thresholdMs,
        quantiles: { p50: null, p95: null, p99: null },
        status: 'disabled',
        series: [],
        message: 'Prometheus is not configured for live latency queries.',
      };
    }

    const namespace = `sandbox-${sandboxId}`;
    const histogramMetric = latencyCheck.metricName ?? DEFAULT_HISTOGRAM_METRIC;
    const rateWindowSeconds = latencyCheck.sampleDurationSeconds ?? DEFAULT_RATE_WINDOW_SECONDS;
    const selector = this.buildSelector(namespace, latencyCheck.service);
    const baseExpr = `sum(rate(${histogramMetric}{${selector}}[${rateWindowSeconds}s])) by (le)`;

    const [p50, p95, p99, series] = await Promise.all([
      this.queryScalar(`histogram_quantile(0.50, ${baseExpr})`),
      this.queryScalar(`histogram_quantile(0.95, ${baseExpr})`),
      this.queryScalar(`histogram_quantile(0.99, ${baseExpr})`),
      this.queryRange(
        `histogram_quantile(0.95, ${baseExpr})`,
        sessionStartedAt,
        new Date(),
      ),
    ]);

    const available = p95 !== null || series.length > 0;
    const currentP95 = p95 ?? (series.length > 0 ? series[series.length - 1]!.p95 : null);
    const status =
      currentP95 == null ? 'pending' : currentP95 <= latencyCheck.thresholdMs ? 'pass' : 'fail';

    return {
      enabled: true,
      configured: true,
      available,
      service: latencyCheck.service,
      metricName: histogramMetric,
      targetThresholdMs: latencyCheck.thresholdMs,
      quantiles: { p50, p95, p99 },
      status,
      series,
      message: available ? undefined : 'Waiting for latency samples from the traffic generator.',
    };
  }

  private buildSelector(namespace: string, service?: string) {
    const labels = [`namespace="${namespace}"`];
    if (service) {
      labels.push(`service="${service}"`);
    }
    return labels.join(',');
  }

  private async queryScalar(query: string): Promise<number | null> {
    const payload = await this.fetchPrometheus<PrometheusInstantResult>('query', { query });
    const result = payload.data.result[0];
    if (!result) return null;

    const raw = result.value?.[1];
    return this.parsePrometheusValue(raw);
  }

  private async queryRange(query: string, start: Date, end: Date): Promise<LatencySeriesPoint[]> {
    if (start >= end) return [];

    const durationSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000));
    const stepSeconds = Math.max(15, Math.floor(durationSeconds / 120));

    const payload = await this.fetchPrometheus<PrometheusMatrixResult>('query_range', {
      query,
      start: String(Math.floor(start.getTime() / 1000)),
      end: String(Math.floor(end.getTime() / 1000)),
      step: `${stepSeconds}s`,
    });

    const result = payload.data.result[0];
    if (!result) return [];

    return result.values
      .map(([timestamp, raw]) => {
        const value = this.parsePrometheusValue(raw);
        if (value === null) return null;

        return {
          timestamp: new Date(timestamp * 1000).toISOString(),
          p95: value,
        };
      })
      .filter((point): point is LatencySeriesPoint => point !== null);
  }

  private parsePrometheusValue(raw: string | undefined): number | null {
    if (!raw) return null;
    if (raw === 'NaN' || raw === '+Inf' || raw === '-Inf') return null;

    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  }

  private async fetchPrometheus<T>(
    path: 'query' | 'query_range',
    params: Record<string, string>
  ): Promise<PrometheusResponse<T>> {
    const url = new URL(`/api/v1/${path}`, this.config.prometheusUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Prometheus query failed with ${response.status}`);
    }

    const payload = (await response.json()) as PrometheusResponse<T>;
    if (payload.status !== 'success') {
      throw new Error(`Prometheus query returned ${payload.status}`);
    }

    return payload;
  }
}
