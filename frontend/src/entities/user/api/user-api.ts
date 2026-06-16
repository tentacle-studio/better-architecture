import { httpClient } from '@shared/api'
import type { User } from '../model/user'

export async function getMe(): Promise<User | null> {
  const { data, error } = await httpClient.get<User>('/users/me')
  if (error) return null
  return data
}

export async function updateMe(
  patch: Partial<Pick<User, 'displayName' | 'avatarUrl'>>,
): Promise<User | null> {
  const { data, error } = await httpClient.patch<User>('/users/me', patch)
  if (error) return null
  return data
}
