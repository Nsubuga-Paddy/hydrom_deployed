import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthUser {
  name: string
  email: string
  verified: boolean
  department?: string
  station?: string
  role?: string
  phone?: string
}

interface PendingSignup {
  name: string
  email: string
  department: string
  station: string
  role: string
  phone: string
}

interface AuthContextValue {
  user: AuthUser | null
  pendingSignup: PendingSignup | null
  requestAccess: (signup: PendingSignup) => void
  verifyFromEmailLink: (email: string) => void
  login: (email: string, password: string) => void
  logout: () => void
}

const AUTH_STORAGE_KEY = 'hydro-m-auth-user'
const SIGNUP_STORAGE_KEY = 'hydro-m-pending-signup'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

function readPendingSignup(): PendingSignup | null {
  const stored = window.localStorage.getItem(SIGNUP_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as PendingSignup
  } catch {
    return null
  }
}

function deriveNameFromEmail(email: string) {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Hydro-M User'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(() => readPendingSignup())

  const persistUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser)
    if (nextUser) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  const requestAccess = useCallback((signup: PendingSignup) => {
    setPendingSignup(signup)
    window.localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(signup))
  }, [])

  const verifyFromEmailLink = useCallback((email: string) => {
    const signup = pendingSignup?.email === email ? pendingSignup : null
    const nextUser = {
      name: signup?.name || deriveNameFromEmail(email),
      email,
      verified: true,
      department: signup?.department,
      station: signup?.station,
      role: signup?.role,
      phone: signup?.phone,
    }

    persistUser(nextUser)
    setPendingSignup(null)
    window.localStorage.removeItem(SIGNUP_STORAGE_KEY)
  }, [pendingSignup, persistUser])

  const login = useCallback((email: string) => {
    persistUser({
      name: pendingSignup?.email === email ? pendingSignup.name : deriveNameFromEmail(email),
      email,
      verified: true,
    })
  }, [pendingSignup, persistUser])

  const logout = useCallback(() => {
    persistUser(null)
  }, [persistUser])

  const value = useMemo(
    () => ({
      user,
      pendingSignup,
      requestAccess,
      verifyFromEmailLink,
      login,
      logout,
    }),
    [user, pendingSignup, requestAccess, verifyFromEmailLink, login, logout],
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
