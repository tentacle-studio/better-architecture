import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../services/auth-service.js';
import type { SessionService } from '../services/session-service.js';
import type { DbClient } from '../db/client.js';
import { upsertUser, createUserWithPassword, findUserByEmail } from '../db/queries/users.js';

export async function authRoutes(
  fastify: FastifyInstance,
  opts: {
    authService: AuthService;
    sessionService: SessionService;
    db: DbClient;
  }
) {
  fastify.post('/auth/register', async (request, reply) => {
    const { email, password, displayName } = request.body as {
      email: string;
      password: string;
      displayName: string;
    };

    if (!email || !password || !displayName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    try {
      const existingUser = await findUserByEmail(opts.db, email);
      if (existingUser) {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      const passwordHash = await opts.authService.hashPassword(password);
      const user = await createUserWithPassword(opts.db, {
        email,
        displayName,
        passwordHash,
      });

      const accessToken = await opts.authService.createAccessToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      const refreshToken = await opts.authService.createRefreshToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      await opts.sessionService.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

      return reply.send({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? undefined,
          xp: user.xp,
          level: user.level,
          levelTitle: user.levelTitle,
          currentStreak: 0,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  fastify.post('/auth/login/password', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing email or password' });
    }

    try {
      const user = await findUserByEmail(opts.db, email);
      if (!user || !user.passwordHash) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await opts.authService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const accessToken = await opts.authService.createAccessToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      const refreshToken = await opts.authService.createRefreshToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      await opts.sessionService.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

      return reply.send({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? undefined,
          xp: user.xp,
          level: user.level,
          levelTitle: user.levelTitle,
          currentStreak: 0,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  fastify.post('/auth/login', async (request, reply) => {
    const { provider, token } = request.body as { provider: string; token: string };

    if (provider !== 'oidc') {
      return reply.status(400).send({ error: 'Unsupported provider' });
    }

    try {
      const oidcData = await opts.authService.verifyOidcToken(token);
      
      const user = await upsertUser(opts.db, {
        email: oidcData.email,
        displayName: oidcData.name,
      });

      const accessToken = await opts.authService.createAccessToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      const refreshToken = await opts.authService.createRefreshToken({
        sub: user.id,
        email: user.email!,
        role: user.role as 'user' | 'admin',
      });

      await opts.sessionService.storeRefreshToken(user.id, refreshToken, 7 * 24 * 60 * 60);

      return reply.send({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? undefined,
          xp: user.xp,
          level: user.level,
          levelTitle: user.levelTitle,
          currentStreak: 0,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(401).send({ error: 'Invalid OIDC token' });
    }
  });

  fastify.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const payload = await opts.authService.verifyRefreshToken(refreshToken);
      
      const isValid = await opts.sessionService.isRefreshTokenValid(payload.sub, refreshToken);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      await opts.sessionService.revokeRefreshToken(payload.sub, refreshToken);

      const newAccessToken = await opts.authService.createAccessToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      const newRefreshToken = await opts.authService.createRefreshToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      await opts.sessionService.storeRefreshToken(payload.sub, newRefreshToken, 7 * 24 * 60 * 60);

      return reply.send({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  fastify.post('/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const payload = await opts.authService.verifyRefreshToken(refreshToken);
      await opts.sessionService.revokeRefreshToken(payload.sub, refreshToken);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(204).send();
    }
  });
}
