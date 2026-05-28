import type { FastifyInstance } from 'fastify';
import type { OrchestratorClient } from '../services/orchestrator-client.js';
import type { SessionService } from '../services/session-service.js';
import type { DbClient } from '../db/client.js';
import { findLabs, findLabById, findLabWithChecks } from '../db/queries/labs.js';
import { updateUserXp } from '../db/queries/users.js';
import { createSubmission, findUserSubmissions } from '../db/queries/submissions.js';
import { createSandboxCreationRateLimiter } from '../middleware/rate-limit.js';
import type { ObservabilityService, LatencyCheckConfig } from '../services/observability-service.js';
import { recordQuizSubmission } from '../observability/telemetry.js';

function resolveLatencyCheck(checks: Array<{ checkType: string; specJson: any }> | undefined): LatencyCheckConfig | null {
  const slaCheck = checks?.find((check) => check.checkType.toUpperCase() === 'SLA');
  if (!slaCheck || !slaCheck.specJson || typeof slaCheck.specJson !== 'object') {
    return null;
  }

  const threshold = Number(slaCheck.specJson.threshold ?? slaCheck.specJson.max_latency_ms ?? 0);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return null;
  }

  const sampleDuration = Number(
    slaCheck.specJson.sample_duration_s ?? slaCheck.specJson.observation_window_seconds ?? 30
  );

  return {
    service: typeof slaCheck.specJson.service === 'string' ? slaCheck.specJson.service : undefined,
    thresholdMs: threshold,
    metricName:
      typeof slaCheck.specJson.metric_name === 'string'
        ? slaCheck.specJson.metric_name
        : undefined,
    sampleDurationSeconds: Number.isFinite(sampleDuration) && sampleDuration > 0 ? sampleDuration : 30,
  };
}

function buildSolutionOutlines(
  checks: Array<{ description: string; specJson: any; points: number }>
) {
  return checks.map((check, index) => {
    const spec = typeof check.specJson === 'object' && check.specJson !== null ? check.specJson : {};
    const keywords = Array.isArray(spec.keywords) ? spec.keywords.join(', ') : null;
    const prompt = typeof spec.question === 'string' ? spec.question : null;
    const lines = [
      `Checkpoint ${index + 1}: ${check.description}`,
      prompt ? `Prompt: ${prompt}` : null,
      keywords ? `Key concepts to cover: ${keywords}` : null,
      `Points: ${check.points}`,
    ].filter(Boolean);

    return lines.join('\n');
  });
}

function normalizeSubmissionPayload(result: {
  passed: boolean;
  score: number;
  maxScore: number;
  checks: Array<{ name: string; passed: boolean; message: string }>;
  feedback: string;
}) {
  return {
    passed: result.passed,
    score: result.score,
    maxScore: result.maxScore,
    feedback: result.feedback,
    checks: result.checks,
  };
}

export async function labsRoutes(
  fastify: FastifyInstance,
  opts: {
    orchestrator: OrchestratorClient;
    sessionService: SessionService;
    db: DbClient;
    observability: ObservabilityService;
  }
) {
  const sandboxRateLimiter = createSandboxCreationRateLimiter(opts.sessionService['redis']);

  fastify.get('/labs', async (request, reply) => {
    const { page, limit, category } = request.query as {
      page?: string;
      limit?: string;
      category?: string;
    };

    const result = await findLabs(opts.db, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
    });

    return reply.send(result);
  });

  fastify.get('/labs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const lab = await findLabById(opts.db, id);

    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    // Decode base64 seed manifest for frontend display
    let decodedManifest = lab.seedManifest;
    try {
      decodedManifest = Buffer.from(lab.seedManifest, 'base64').toString('utf8');
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to decode seed manifest, using as-is');
    }

    return reply.send({
      ...lab,
      seedManifest: decodedManifest,
    });
  });

  fastify.post('/labs/:id/start', { preHandler: [sandboxRateLimiter] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;

    const lab = await findLabById(opts.db, id);
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    try {
      const sandbox = await opts.orchestrator.createSandbox({
        user_id: userId,
        quiz_id: id,
        seed_manifest: lab.seedManifest,
      });

      const wsProtocol = request.protocol === 'https' ? 'wss' : 'ws';
      const wsBaseUrl = `${wsProtocol}://${request.hostname}`;

      const session = {
        sandboxId: sandbox.sandbox_id,
        userId,
        labId: id,
        wsTerminalUrl: `${wsBaseUrl}/ws/terminal/${sandbox.sandbox_id}`,
        wsCanvasUrl: `${wsBaseUrl}/ws/canvas/${sandbox.sandbox_id}`,
        wsTrafficUrl: `${wsBaseUrl}/ws/traffic/${sandbox.sandbox_id}`,
        terminalPodIp: sandbox.terminal_pod_ip,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };

      await opts.sessionService.createSession(session);

      return reply.send({
        sandboxId: sandbox.sandbox_id,
        wsTerminalUrl: session.wsTerminalUrl,
        wsCanvasUrl: session.wsCanvasUrl,
        wsTrafficUrl: session.wsTrafficUrl,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create sandbox' });
    }
  });

  fastify.post('/labs/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sandboxId } = request.body as { sandboxId: string };
    const userId = request.user!.sub;

    const lab = await findLabWithChecks(opts.db, id);
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      return reply.status(403).send({ error: 'Invalid sandbox session' });
    }

    try {
      const supportedChecks = lab.checks.filter((check) =>
        ['STATE', 'LIVENESS', 'SLA'].includes(check.checkType.toUpperCase())
      );
      const maxScore = lab.checks.reduce((sum, check) => sum + check.points, 0);

      let responsePayload: ReturnType<typeof normalizeSubmissionPayload>;
      let xpAwarded = 0;

      if (supportedChecks.length === 0) {
        responsePayload = normalizeSubmissionPayload({
          passed: false,
          score: 0,
          maxScore,
          feedback: 'This lab does not have automated sandbox validation checks configured yet.',
          checks: lab.checks.map((check) => ({
            name: check.description,
            passed: false,
            message: 'Manual or future authored validation required.',
          })),
        });
      } else {
        const result = await opts.orchestrator.validateQuiz({
          sandbox_id: sandboxId,
          quiz_id: id,
          checks: supportedChecks.map((check) => ({
            type: check.checkType.toUpperCase(),
            spec_json: JSON.stringify({
              ...(typeof check.specJson === 'object' && check.specJson !== null ? check.specJson : {}),
              points: check.points,
              name: check.description,
            }),
          })),
        });

        recordQuizSubmission(id, result.passed);

        if (result.passed) {
          xpAwarded = 100;
          await updateUserXp(opts.db, userId, xpAwarded);
        }

        responsePayload = normalizeSubmissionPayload({
          passed: result.passed,
          score: result.score,
          maxScore,
          feedback: result.passed
            ? 'Validation checks passed for the current sandbox state.'
            : 'One or more validation checks still fail against the current sandbox state.',
          checks: result.results.map((check) => ({
            name: check.check_name,
            passed: check.passed,
            message: check.message,
          })),
        });
      }

      await createSubmission(opts.db, {
        userId,
        labId: id,
        sandboxId,
        passed: responsePayload.passed,
        score: responsePayload.score,
        resultsJson: responsePayload,
        xpAwarded,
      });

      return reply.send(responsePayload);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to validate quiz' });
    }
  });

  fastify.delete('/labs/:id/session/:sandboxId', async (request, reply) => {
    const { sandboxId } = request.params as { sandboxId: string };
    const userId = request.user!.sub;

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId) {
      return reply.status(403).send({ error: 'Invalid sandbox session' });
    }

    try {
      await opts.orchestrator.destroySandbox({ sandbox_id: sandboxId });
      await opts.sessionService.deleteSession(sandboxId);
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to destroy sandbox' });
    }
  });

  fastify.get('/labs/:id/observability/:sandboxId', async (request, reply) => {
    const { id, sandboxId } = request.params as { id: string; sandboxId: string };
    const userId = request.user!.sub;

    const session = await opts.sessionService.getSession(sandboxId);
    if (!session || session.userId !== userId || session.labId !== id) {
      return reply.status(403).send({ error: 'Invalid sandbox session' });
    }

    const lab = await findLabWithChecks(opts.db, id);
    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    try {
      const snapshot = await opts.observability.getLatencySnapshot({
        sandboxId,
        sessionStartedAt: session.createdAt,
        latencyCheck: resolveLatencyCheck(lab.checks),
      });

      return reply.send(snapshot);
    } catch (error) {
      fastify.log.error({ err: error, sandboxId, labId: id }, 'Failed to load observability snapshot');
      return reply.status(500).send({ error: 'Failed to load observability snapshot' });
    }
  });

  fastify.get('/labs/:id/solutions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.sub;

    const [lab, submissions] = await Promise.all([
      findLabWithChecks(opts.db, id),
      findUserSubmissions(opts.db, userId, { labId: id, limit: 1 }),
    ]);

    if (!lab) {
      return reply.status(404).send({ error: 'Lab not found' });
    }

    if (submissions.length === 0) {
      return reply.status(403).send({ error: 'Complete a submission to unlock solutions' });
    }

    return reply.send(buildSolutionOutlines(lab.checks));
  });
}
