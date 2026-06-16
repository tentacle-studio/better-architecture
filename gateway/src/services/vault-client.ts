import { readFile } from 'node:fs/promises';

const K8S_SA_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';

export interface VaultSecrets {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
}

interface VaultKvV2Response {
  data: {
    data: Record<string, string>;
  };
}

interface VaultLoginResponse {
  auth: {
    client_token: string;
  };
}

export class VaultClient {
  private readonly addr: string;
  private readonly secretPath: string;

  constructor() {
    this.addr = process.env.VAULT_ADDR ?? 'http://127.0.0.1:8200';
    this.secretPath = process.env.VAULT_SECRET_PATH ?? 'secret/data/gateway';
  }

  async fetchSecrets(): Promise<VaultSecrets> {
    const token = await this.resolveToken();

    const res = await fetch(`${this.addr}/v1/${this.secretPath}`, {
      headers: { 'X-Vault-Token': token },
    });

    if (!res.ok) {
      throw new Error(
        `Vault: failed to read secrets at "${this.secretPath}" (${res.status} ${res.statusText})`
      );
    }

    const body = (await res.json()) as VaultKvV2Response;
    const data = body.data.data;

    const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'] as const;
    for (const key of required) {
      if (!data[key]) {
        throw new Error(`Vault: missing required secret key "${key}" at "${this.secretPath}"`);
      }
    }

    return {
      DATABASE_URL: data['DATABASE_URL'] as string,
      REDIS_URL: data['REDIS_URL'] as string,
      JWT_SECRET: data['JWT_SECRET'] as string,
    };
  }

  private async resolveToken(): Promise<string> {
    const token = process.env.VAULT_TOKEN;
    if (token) return token;

    const role = process.env.VAULT_ROLE;
    if (!role) {
      throw new Error(
        'Vault: set VAULT_TOKEN (token auth / dev) or VAULT_ROLE (Kubernetes auth / prod)'
      );
    }

    return this.loginKubernetes(role);
  }

  private async loginKubernetes(role: string): Promise<string> {
    const jwt = await readFile(K8S_SA_TOKEN_PATH, 'utf8');

    const res = await fetch(`${this.addr}/v1/auth/kubernetes/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, jwt }),
    });

    if (!res.ok) {
      throw new Error(`Vault: Kubernetes auth failed (${res.status} ${res.statusText})`);
    }

    const body = (await res.json()) as VaultLoginResponse;
    return body.auth.client_token;
  }
}
