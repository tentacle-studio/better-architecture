import Redis from 'ioredis';
import type { Config } from '../config.js';
import type { SandboxSession } from '../types/shared.js';

export class SessionService {
  private redis: Redis;

  constructor(config: Config) {
    this.redis = new Redis(config.redisUrl);
  }

  async createSession(session: SandboxSession): Promise<void> {
    const key = `session:${session.sandboxId}`;
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    
    await this.redis.setex(
      key,
      ttl,
      JSON.stringify(session)
    );
  }

  async getSession(sandboxId: string): Promise<SandboxSession | null> {
    const key = `session:${sandboxId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    const session = JSON.parse(data);
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
    };
  }

  async deleteSession(sandboxId: string): Promise<void> {
    const key = `session:${sandboxId}`;
    await this.redis.del(key);
  }

  async storeRefreshToken(userId: string, token: string, expirySeconds: number): Promise<void> {
    const key = `refresh:${userId}:${token}`;
    await this.redis.setex(key, expirySeconds, '1');
  }

  async revokeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh:${userId}:${token}`;
    await this.redis.del(key);
  }

  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const key = `refresh:${userId}:${token}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async close() {
    await this.redis.quit();
  }
}
