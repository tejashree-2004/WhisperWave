import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Mic, History, LogOut, Wand2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/transcribe', icon: Mic, label: 'Transcribe' },
  { to: '/app/history', icon: History, label: 'History' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen bg-void flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <Wand2 size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-text">WhisperTask</span>
          <button className="ml-auto lg:hidden text-muted" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-display font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent/15 text-accent-glow border border-accent/20'
                  : 'text-text-dim hover:text-text hover:bg-panel'
              )}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold font-display">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-medium text-text truncate">{user?.username}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted hover:text-warn rounded-xl hover:bg-warn/5 transition-colors font-display">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-muted hover:text-text">
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-text">WhisperTask</span>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
