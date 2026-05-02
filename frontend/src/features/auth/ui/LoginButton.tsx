import { Button } from '@shared/ui/button'
import { useAuthStore } from '../model/auth-store'
import { logout } from '../api/auth-api'
import { httpClient } from '@shared/api'

export function LoginButton() {
  const { isAuthenticated, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    httpClient.clearTokens()
    clearAuth()
  }

  if (isAuthenticated) {
    return (
      <Button variant="ghost" size="sm" onClick={() => { void handleLogout() }}>
        Sign Out
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => { window.location.href = '/login' }}
    >
      Sign In
    </Button>
  )
}
