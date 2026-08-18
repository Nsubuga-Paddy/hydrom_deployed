import { apiGet, apiPost } from './client'

export interface AuthUser {
  name: string
  email: string
  verified: boolean
  department?: string
  station?: string
  role?: string
  phone?: string
}

export interface SignupPayload {
  name: string
  email: string
  phone: string
  department: string
  station: string
  role: string
  password: string
}

interface UserResponse {
  user: AuthUser
}

interface SignupResponse {
  message: string
  email: string
  status?: string
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await apiGet<UserResponse>('/api/auth/me/')
    return data.user
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
      return null
    }
    throw err
  }
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiPost<SignupResponse>('/api/auth/signup/', payload)
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const data = await apiPost<UserResponse>('/api/auth/login/', { email, password })
  return data.user
}

export async function logoutSession(): Promise<void> {
  await apiPost<{ message: string }>('/api/auth/logout/', {})
}
