"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  username: string
  role?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
}

const ACCESS_MANAGER_URL = process.env.NEXT_PUBLIC_ACCESS_MANAGER_URL as string
const WP_LOGIN_URL = process.env.NEXT_PUBLIC_WP_LOGIN_URL as string

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const verifyToken = async (): Promise<void> => {
    try {
      const res = await fetch(`${ACCESS_MANAGER_URL}/api/auth/verify`, {
        method: 'POST',
        credentials: 'include',
      })

      if (res.status === 401) {
        const returnUrl = encodeURIComponent(window.location.href)
        window.location.href = `${WP_LOGIN_URL}?redirect_to=${returnUrl}`
        return
      }

      if (res.ok) {
        setUser(await res.json())
        return
      }
    } catch (error) {
      console.error('Auth verification failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      const res = await fetch(`${ACCESS_MANAGER_URL}/api/auth/refresh`, {
        credentials: 'include',
      })

      if (res.status === 401) {
        setUser(null)
        const returnUrl = encodeURIComponent(window.location.href)
        window.location.href = `${WP_LOGIN_URL}?redirect_to=${returnUrl}`
        return
      }

      if (res.ok) {
        setUser(await res.json())
      }
    } catch (error) {
      console.error('Session refresh failed:', error)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${ACCESS_MANAGER_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
      window.location.href = WP_LOGIN_URL
    }
  }

  useEffect(() => {
    verifyToken()
    const interval = setInterval(refreshSession, 60_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAuthenticated = Boolean(user)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, logout }}>
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
