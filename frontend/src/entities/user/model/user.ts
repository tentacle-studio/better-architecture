export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  xp: number
  level: number
  levelTitle: string
  currentStreak: number
}
