import { createContext, useMemo, useState, useEffect } from 'react'
import client from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const permissions = useMemo(() => user?.permissions ?? [], [user])
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  function hasPermission(code) {
    return permissionSet.has(code)
  }

  function hasAnyPermission(codes) {
    return codes.some((code) => permissionSet.has(code))
  }

  async function logout() {
    try {
      await client.post('/auth/logout')
    } catch {
      // ignore network errors — clear local state regardless
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, permissions, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
