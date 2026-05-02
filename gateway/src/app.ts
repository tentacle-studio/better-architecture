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
import { createTracingMiddleware } from './middleware/tracing.js';
import { authRoutes } from './routes/auth.js';
import { labsRoutes } from './routes/labs.js';
import { usersRoutes } from './routes/users.js';
import { progressRoutes } from './routes/progress.js';
import { dailyTasksRoutes } from './routes/daily-tasks.js';
import { terminalWebSocket } from './ws/terminal.js';
import { canvasSyncWebSocket } from './ws/canvas-sync.js';
import { trafficWebSocket } from './ws/traffic.js';

async function start() {
  const config = await loadConfig();

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
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);

  const db = createDbClient(config);
  const orchestrator = new OrchestratorClient(config);
  const natsClient = new NatsClient(config);
  const authService = new AuthService(config);
  const sessionService = new SessionService(config);

  await natsClient.connect();

  const authMiddleware = createAuthMiddleware(authService);
  const rateLimiter = createRateLimiter(sessionService['redis'], {
    max: 100,
    windowMs: 60000,
  });
  const tracingMiddleware = createTracingMiddleware();

  fastify.addHook('onRequest', tracingMiddleware);

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(authRoutes, {
    prefix: '',
    authService,
    sessionService,
    db,
  });

  fastify.addHook('onRequest', authMiddleware);
  fastify.addHook('onRequest', rateLimiter);

  await fastify.register(labsRoutes, {
    prefix: '',
    orchestrator,
    sessionService,
    db,
  });

  await fastify.register(usersRoutes, {
    prefix: '',
    db,
  });

  await fastify.register(progressRoutes, {
    prefix: '',
    db,
  });

  await fastify.register(dailyTasksRoutes, {
    prefix: '',
    db,
  });

  await fastify.register(terminalWebSocket, {
    orchestrator,
    sessionService,
  });

  await fastify.register(canvasSyncWebSocket, {
    orchestrator,
    sessionService,
    natsClient,
  });

  await fastify.register(trafficWebSocket, {
    sessionService,
    natsClient,
  });

  const shutdown = async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    await db.close();
    await natsClient.close();
    await sessionService.close();
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
