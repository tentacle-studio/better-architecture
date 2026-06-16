import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@shared/ui/button'
import { Input } from '@shared/ui/input'
import { Label } from '@shared/ui/label'
import { useAuthStore } from '../model/auth-store'
import { loginWithPassword, register } from '../api/auth-api'
import { httpClient } from '@shared/api'

export function LoginForm() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = isRegister
        ? await register(email, password, displayName)
        : await loginWithPassword(email, password)

      if (result) {
        setTokens(result.accessToken, result.refreshToken)
        httpClient.setTokens(result.accessToken, result.refreshToken)
        setUser(result.user)
        void navigate('/')
      } else {
        setError(isRegister ? 'Registration failed' : 'Invalid credentials')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
          {isRegister && (
            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister)
            setError('')
          }}
          className="text-sm text-gray-600 hover:text-gray-900"
          disabled={loading}
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  )
}
