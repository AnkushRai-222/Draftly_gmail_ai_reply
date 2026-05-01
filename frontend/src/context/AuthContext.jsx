import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('draftly_token')
    if (!token) { setLoading(false); return }

    authAPI.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('draftly_token'))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('draftly_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
