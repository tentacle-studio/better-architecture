import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.js';
import { findUserSubmissions } from '../db/queries/submissions.js';

function mapSubmission(submission: {
  id: string;
  labId: string;
  userId: string;
  passed: boolean;
  score: number;
  resultsJson: unknown;
  submittedAt: Date;
}) {
  const results = submission.resultsJson as
    | {
        maxScore?: number;
        checks?: Array<{ name: string; passed: boolean; message: string }>;
      }
    | undefined;

  return {
    id: submission.id,
    labId: submission.labId,
    userId: submission.userId,
    status: submission.passed ? 'passed' : 'failed',
    score: submission.score,
    maxScore: results?.maxScore ?? submission.score,
    checks: Array.isArray(results?.checks) ? results.checks : [],
    createdAt: submission.submittedAt.toISOString(),
  };
}

export async function submissionsRoutes(
  fastify: FastifyInstance,
  opts: { db: DbClient }
) {
  fastify.get('/submissions', async (request, reply) => {
    const userId = request.user!.sub;
    const { labId, limit } = request.query as { labId?: string; limit?: string };

    const submissions = await findUserSubmissions(opts.db, userId, {
      labId,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return reply.send(submissions.map(mapSubmission));
  });
}
