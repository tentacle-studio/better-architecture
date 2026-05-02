export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'
export type LabStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface Lab {
  id: string
  title: string
  description: string
  difficulty: DifficultyLevel
  estimatedMinutes: number
  status: LabStatus
  tags: string[]
  companies: string[]
}

export interface SandboxSession {
  sandboxId: string
  labId: string
  expiresAt: string
}

export interface QuizCheck {
  passed: boolean
  score: number
  maxScore: number
  feedback: string
  checks: Array<{ name: string; passed: boolean; message: string }>
}
