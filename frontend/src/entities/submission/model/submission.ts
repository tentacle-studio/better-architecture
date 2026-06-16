export type SubmissionStatus = 'pending' | 'passed' | 'failed'

export interface CheckResult {
  name: string
  passed: boolean
  message: string
}

export interface Submission {
  id: string
  labId: string
  userId: string
  status: SubmissionStatus
  score: number
  maxScore: number
  checks: CheckResult[]
  createdAt: string
}
