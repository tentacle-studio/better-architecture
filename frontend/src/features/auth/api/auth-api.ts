import { httpClient } from '@shared/api'
import type { User } from '@entities/user'

export interface LoginPayload {
  provider: 'google' | 'github'
  code: string
  redirectUri: string
}

export interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}

export async function login(payload: LoginPayload): Promise<AuthResult | null> {
  const { data, error } = await httpClient.post<AuthResult>('/auth/login', payload)
  if (error) return null
  return data
}

export async function refreshTokens(
  token: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const { data, error } = await httpClient.post<{
    accessToken: string
    refreshToken: string
  }>('/auth/refresh', { refreshToken: token })
  if (error) return null
  return data
}

export async function logout(): Promise<void> {
  await httpClient.post('/auth/logout')
}
