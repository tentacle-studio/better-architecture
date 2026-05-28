import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { Config } from '../config.js';

let sdk: NodeSDK | null = null;

export async function initTelemetry(config: Config) {
  if (!config.otelExporterEndpoint || sdk) {
    return;
  }

  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??= config.otelExporterEndpoint;
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= 'http/protobuf';
  process.env.OTEL_TRACES_EXPORTER ??= 'otlp';
  process.env.OTEL_SERVICE_NAME ??= config.otelServiceName;

  if (config.nodeEnv !== 'production') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  }

  sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}

export async function shutdownTelemetry() {
  if (!sdk) return;

  await sdk.shutdown();
  sdk = null;
}
