export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type LabStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface Lab {
  id: string
  moduleId: string
  title: string
  description: string
  difficulty: DifficultyLevel
  estimatedMin: number
  seedManifest: string
  sortOrder: number
  tags: string[]
  status: LabStatus
  createdAt: string
}

export interface LabsPage {
  labs: Lab[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SandboxSession {
  sandboxId: string
  wsTerminalUrl: string
  wsCanvasUrl: string
  wsTrafficUrl: string
  expiresAt: string
}

export interface LatencySnapshot {
  enabled: boolean
  configured: boolean
  available: boolean
  service?: string
  metricName: string
  targetThresholdMs: number
  quantiles: {
    p50: number | null
    p95: number | null
    p99: number | null
  }
  status: 'pass' | 'fail' | 'pending' | 'disabled'
  series: Array<{
    timestamp: string
    p95: number
  }>
  message?: string
}

export interface QuizCheck {
  passed: boolean
  score: number
  maxScore: number
  feedback: string
  checks: Array<{ name: string; passed: boolean; message: string }>
}
