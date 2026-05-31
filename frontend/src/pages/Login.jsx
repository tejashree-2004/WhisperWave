import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wand2, Eye, EyeOff } from 'lucide-react'

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <Wand2 size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-text">WhisperTask</span>
          </Link>
          <h1 className="font-display font-bold text-3xl text-text mb-2">{title}</h1>
          <p className="text-text-dim">{subtitle}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-warn/10 border border-warn/20 text-warn text-sm p-3 rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-display font-medium text-text-dim mb-1.5">Email</label>
          <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-display font-medium text-text-dim mb-1.5">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-text-dim text-sm mt-5">
        Don't have an account? <Link to="/register" className="text-accent hover:text-accent-glow font-medium">Register</Link>
      </p>
    </AuthLayout>
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Start transcribing in seconds">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-warn/10 border border-warn/20 text-warn text-sm p-3 rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-display font-medium text-text-dim mb-1.5">Email</label>
          <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-display font-medium text-text-dim mb-1.5">Username</label>
          <input type="text" className="input-field" placeholder="johndoe" value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-display font-medium text-text-dim mb-1.5">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input-field pr-10" placeholder="Min 8 characters"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-text-dim text-sm mt-5">
        Already have an account? <Link to="/login" className="text-accent hover:text-accent-glow font-medium">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default Login