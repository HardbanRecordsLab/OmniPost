"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  username: string
}

interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored tokens on mount
    const storedTokens = localStorage.getItem('auth_tokens')
    const storedUser = localStorage.getItem('auth_user')
    
    if (storedTokens && storedUser) {
      try {
        setTokens(JSON.parse(storedTokens))
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored auth data:', error)
        localStorage.removeItem('auth_tokens')
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      setTokens(data.tokens)
      setUser(data.user)
      
      localStorage.setItem('auth_tokens', JSON.stringify(data.tokens))
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (email: string, username: string, password: string, confirmPassword: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
        },
        body: JSON.stringify({ email, username, password, confirmPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  const logout = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
  }

  const refreshToken = async (): Promise<boolean> => {
    if (!tokens?.refresh_token) return false

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.refresh_token}`,
          ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
        }
      })

      if (!response.ok) return false

      const data = await response.json()
      const newTokens = { ...tokens, ...data }
      
      setTokens(newTokens)
      localStorage.setItem('auth_tokens', JSON.stringify(newTokens))
      
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      isLoading,
      login,
      register,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
