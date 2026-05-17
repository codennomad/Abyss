import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'

interface AuthCtx {
  token: string | null
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (u: User) => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('abyss_token'))
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login({ username, password })
    localStorage.setItem('abyss_token', res.access_token)
    setToken(res.access_token)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('abyss_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
