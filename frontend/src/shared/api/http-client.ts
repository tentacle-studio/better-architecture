import type { ApiResponse } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const json = (await res.json()) as { accessToken: string; refreshToken: string }
    setTokens(json.accessToken, json.refreshToken)
    return json.accessToken
  } catch {
    clearTokens()
    return null
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  let token = getAccessToken()

  const makeRequest = (tkn: string | null) => {
    const existingHeaders = (init.headers as Record<string, string> | undefined) ?? {}
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...existingHeaders,
    }
    if (tkn) headers['Authorization'] = `Bearer ${tkn}`
    return fetch(`${BASE_URL}${path}`, { ...init, headers })
  }

  let res = await makeRequest(token)

  if (res.status === 401) {
    token = await refreshAccessToken()
    if (token) res = await makeRequest(token)
  }

  if (!res.ok) {
    const text = await res.text()
    return { data: null as unknown as T, error: text || res.statusText }
  }

  return { data: (await res.json()) as T }
}

export const httpClient = {
  get:    <T>(path: string)                 => request<T>(path),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST',   body: body != null ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH',  body: body != null ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT',    body: body != null ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                 => request<T>(path, { method: 'DELETE' }),
  setTokens,
  clearTokens,
  getAccessToken,
}
