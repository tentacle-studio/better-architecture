import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from './config.js';
import { createDbClient } from './db/client.js';
import { OrchestratorClient } from './services/orchestrator-client.js';
import { NatsClient } from './services/nats-client.js';
import { AuthService } from './services/auth-service.js';
import { SessionService } from './services/session-service.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createTracingMiddleware, createTracingResponseHook } from './middleware/tracing.js';
import { createWebSocketOriginValidator } from './middleware/websocket-origin.js';
import { authRoutes } from './routes/auth.js';
import { labsRoutes } from './routes/labs.js';
import { usersRoutes } from './routes/users.js';
import { progressRoutes } from './routes/progress.js';
import { dailyTasksRoutes } from './routes/daily-tasks.js';
import { submissionsRoutes } from './routes/submissions.js';
import { terminalWebSocket } from './ws/terminal.js';
import { canvasSyncWebSocket } from './ws/canvas-sync.js';
import { trafficWebSocket } from './ws/traffic.js';
import { resourcesWebSocket } from './ws/resources.js';
import { ObservabilityService } from './services/observability-service.js';
import { initTelemetry, shutdownTelemetry } from './observability/sdk.js';
import { getMetricsContentType, renderMetrics } from './observability/telemetry.js';

async function start() {
  const config = await loadConfig();
  await initTelemetry(config);

  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport: config.nodeEnv === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  await fastify.register(cors, {
    origin: config.nodeEnv === 'production' ? config.corsOrigin : true,
    credentials: true,
  });

  await fastify.register(websocket);

  const db = createDbClient(config);
  const orchestrator = new OrchestratorClient(config);
  const natsClient = new NatsClient(config);
  const authService = new AuthService(config);
  const sessionService = new SessionService(config);
  const observability = new ObservabilityService(config);

  await natsClient.connect();

  const authMiddleware = createAuthMiddleware(authService);
  const rateLimiter = createRateLimiter(sessionService['redis'], {
    max: 100,
    windowMs: 60000,
  });
  const tracingMiddleware = createTracingMiddleware();
  const tracingResponseHook = createTracingResponseHook();
  const wsOriginValidator = createWebSocketOriginValidator(config.corsOrigin, config.nodeEnv);

  fastify.addHook('onRequest', tracingMiddleware);
  fastify.addHook('onResponse', tracingResponseHook);

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', getMetricsContentType());
    return reply.send(await renderMetrics());
  });

  await fastify.register(authRoutes, {
    prefix: '',
    authService,
    sessionService,
    db,
  });

  await fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', authMiddleware);
    protectedRoutes.addHook('onRequest', rateLimiter);

    await protectedRoutes.register(labsRoutes, {
      prefix: '',
      orchestrator,
      sessionService,
      db,
      observability,
    });

    await protectedRoutes.register(usersRoutes, {
      prefix: '',
      db,
    });

    await protectedRoutes.register(progressRoutes, {
      prefix: '',
      db,
    });

    await protectedRoutes.register(submissionsRoutes, {
      prefix: '',
      db,
    });

    await protectedRoutes.register(dailyTasksRoutes, {
      prefix: '',
      db,
    });
  });

  await fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', authMiddleware);
    protectedRoutes.addHook('onRequest', rateLimiter);
    protectedRoutes.addHook('onRequest', wsOriginValidator);

    await protectedRoutes.register(terminalWebSocket, {
      orchestrator,
      sessionService,
    });

    await protectedRoutes.register(canvasSyncWebSocket, {
      orchestrator,
      sessionService,
      natsClient,
    });

    await protectedRoutes.register(trafficWebSocket, {
      sessionService,
      natsClient,
    });

    await protectedRoutes.register(resourcesWebSocket, {
      orchestrator,
      sessionService,
    });
  });

  const shutdown = async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    await db.close();
    await natsClient.close();
    await sessionService.close();
    await shutdownTelemetry();
    orchestrator.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await fastify.listen({
      host: config.host,
      port: config.port,
    });
    fastify.log.info(`Gateway listening on ${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
