import { z } from 'zod';
import { VaultClient } from './services/vault-client.js';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),

  databaseUrl: z.string().url(),
  redisUrl: z.string().url(),
  natsUrl: z.string().url(),

  orchestratorGrpcUrl: z.string(),

  jwtSecret: z.string().min(32),
  jwtAccessExpiry: z.string().default('15m'),
  jwtRefreshExpiry: z.string().default('7d'),

  oidcIssuer: z.string().url(),
  oidcAudience: z.string(),

  otelExporterEndpoint: z.string().url().optional(),
  otelServiceName: z.string().default('gateway'),
});

export type Config = z.infer<typeof configSchema>;

export async function loadConfig(): Promise<Config> {
  const vault = new VaultClient();
  const secrets = await vault.fetchSecrets();

  const raw = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    host: process.env.HOST,

    databaseUrl: secrets.DATABASE_URL,
    redisUrl: secrets.REDIS_URL,
    natsUrl: process.env.NATS_URL,

    orchestratorGrpcUrl: process.env.ORCHESTRATOR_GRPC_URL,

    jwtSecret: secrets.JWT_SECRET,
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,

    oidcIssuer: process.env.OIDC_ISSUER,
    oidcAudience: process.env.OIDC_AUDIENCE,

    otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelServiceName: process.env.OTEL_SERVICE_NAME,
  };

  return configSchema.parse(raw);
}
