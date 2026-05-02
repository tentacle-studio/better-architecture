import * as jose from 'jose';
import type { Config } from '../config.js';
import type { JWTPayload } from '../types/shared.js';

export class AuthService {
  private jwtSecret: Uint8Array;
  private oidcIssuer: string;
  private oidcAudience: string;
  constructor(private config: Config) {
    this.jwtSecret = new TextEncoder().encode(config.jwtSecret);
    this.oidcIssuer = config.oidcIssuer;
    this.oidcAudience = config.oidcAudience;
  }

  async verifyOidcToken(token: string): Promise<{ sub: string; email: string; name: string }> {
    const JWKS = jose.createRemoteJWKSet(new URL(`${this.oidcIssuer}/.well-known/jwks.json`));

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: this.oidcIssuer,
      audience: this.oidcAudience,
    });

    return {
      sub: payload.sub!,
      email: payload.email as string,
      name: payload.name as string,
    };
  }

  async createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const token = await new jose.SignJWT(payload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.jwtAccessExpiry)
      .sign(this.jwtSecret);

    return token;
  }

  async createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const token = await new jose.SignJWT(payload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.jwtRefreshExpiry)
      .sign(this.jwtSecret);

    return token;
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jose.jwtVerify(token, this.jwtSecret);
    return payload as unknown as JWTPayload;
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    const { payload } = await jose.jwtVerify(token, this.jwtSecret);
    return payload as unknown as JWTPayload;
  }
}
