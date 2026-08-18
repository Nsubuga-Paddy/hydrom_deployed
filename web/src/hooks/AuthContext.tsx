import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutSession,
  signup as signupRequest,
  type AuthUser,
  type SignupPayload,
} from '../api/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  requestAccess: (signup: SignupPayload) => Promise<{ email: string; message: string }>
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    try {
      const current = await fetchCurrentUser()
      setUser(current)
      setStatus(current?.verified ? 'authenticated' : 'anonymous')
    } catch {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const requestAccess = useCallback(async (payload: SignupPayload) => {
    const response = await signupRequest(payload)
    return { email: response.email, message: response.message }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const nextUser = await loginWithPassword(email, password)
    setUser(nextUser)
    setStatus(nextUser.verified ? 'authenticated' : 'anonymous')
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutSession()
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 403)) {
        // Still clear local session state if the server session is already gone.
      }
    }
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      requestAccess,
      login,
      logout,
      refresh,
    }),
    [user, status, requestAccess, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
