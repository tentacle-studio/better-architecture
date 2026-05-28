import { httpClient } from '@shared/api'
import type { Lab, SandboxSession, QuizCheck, LabsPage, LatencySnapshot } from '../model/lab'

export async function getLabs(): Promise<Lab[]> {
  const { data, error } = await httpClient.get<LabsPage>('/labs')
  if (error) return []
  return data.labs
}

export async function getLab(id: string): Promise<Lab | null> {
  const { data, error } = await httpClient.get<Lab>(`/labs/${id}`)
  if (error) return null
  return data
}

export async function startLab(id: string): Promise<SandboxSession | null> {
  const { data, error } = await httpClient.post<SandboxSession>(`/labs/${id}/start`)
  if (error) return null
  return data
}

export async function submitLab(id: string, sandboxId: string): Promise<QuizCheck | null> {
  const { data, error } = await httpClient.post<QuizCheck>(`/labs/${id}/submit`, { sandboxId })
  if (error) return null
  return data
}

export async function getLabSolutions(id: string): Promise<string[]> {
  const { data, error } = await httpClient.get<string[]>(`/labs/${id}/solutions`)
  if (error) return []
  return data
}

export async function getLatencySnapshot(
  labId: string,
  sandboxId: string,
): Promise<LatencySnapshot | null> {
  const { data, error } = await httpClient.get<LatencySnapshot>(`/labs/${labId}/observability/${sandboxId}`)
  if (error) return null
  return data
}
