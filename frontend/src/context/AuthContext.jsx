import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('wt_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('wt_token'); delete api.defaults.headers.common['Authorization'] })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('wt_token', data.access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUser(data.user)
    return data
  }

  const register = async (email, username, password) => {
    const { data } = await api.post('/auth/register', { email, username, password })
    localStorage.setItem('wt_token', data.access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('wt_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
