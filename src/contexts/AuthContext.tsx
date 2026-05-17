"use client"

// Local app auth context - WordPress/Access Manager login bridge removed.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  userId: string
  email: string
  username: string
  name: string
  role: string
  plan: 'free' | 'starter' | 'pro' | 'label'
  tier: string
  credits: number
}

interface Session {
  user: User
  token: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loading: boolean
  logout: () => Promise<void>
  login: () => void
}

const LOCAL_TOKEN = 'hrl-local-app-token'
const LOCAL_USER: User = {
  id: 'local-admin',
  userId: 'local-admin',
  email: 'local@hardbanrecordslab.online',
  username: 'local-admin',
  name: 'Local Admin',
  role: 'admin',
  plan: 'label',
  tier: 'label',
  credits: 999999,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function clearLegacySsoState() {
  localStorage.removeItem('hrl_jwt_token')
  document.cookie = 'jwt_token=; Max-Age=0; path=/;'
  document.cookie = 'jwt_token=; Max-Age=0; path=/; domain=.hardbanrecordslab.online;'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(LOCAL_USER)
  const [token, setToken] = useState<string | null>(LOCAL_TOKEN)
  const [isLoading, setIsLoading] = useState(true)

  const login = () => {
    clearLegacySsoState()
    localStorage.setItem('hrl_local_app_auth', LOCAL_TOKEN)
    setUser(LOCAL_USER)
    setToken(LOCAL_TOKEN)
  }

  useEffect(() => {
    login()
    setIsLoading(false)
  }, [])

  const logout = async (): Promise<void> => {
    clearLegacySsoState()
    localStorage.removeItem('hrl_local_app_auth')
    setUser(LOCAL_USER)
    setToken(LOCAL_TOKEN)
  }

  const session = user && token ? { user, token } : null
  const isAuthenticated = Boolean(session)

  return (
    <AuthContext.Provider value={{ user, session, token, isAuthenticated, isLoading, loading: isLoading, login, logout }}>
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