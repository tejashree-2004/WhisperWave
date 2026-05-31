import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { Mic, CheckCircle2, XCircle, Clock, TrendingUp, ArrowRight, FileAudio } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

const STATUS_COLORS = {
  done: 'text-signal bg-signal/10 border-signal/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing: 'text-accent bg-accent/10 border-accent/20',
  failed: 'text-warn bg-warn/10 border-warn/20',
}

function StatCard({ icon: Icon, label, value, color = 'accent', sub }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/10`}>
        <Icon size={20} className={`text-${color}`} />
      </div>
      <div>
        <p className="text-text-dim text-sm font-body">{label}</p>
        <p className="font-display font-bold text-2xl text-text">{value}</p>
        {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const chartData = stats?.recent_activity?.map(t => ({
    name: t.original_filename.slice(0, 12),
    confidence: Math.round((t.confidence_score || 0) * 100),
    time: t.processing_time || 0,
  })) || []

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-text">Dashboard</h1>
          <p className="text-text-dim mt-1">Welcome back, <span className="text-accent">{user?.username}</span></p>
        </div>
        <Link to="/app/transcribe" className="btn-primary flex items-center gap-2">
          <Mic size={16} /> New Transcription
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1 items-end h-8">
            {[...Array(7)].map((_, i) => <div key={i} className="wave-bar h-8" style={{ animationDelay: `${i * 0.1}s` }} />)}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FileAudio} label="Total Files" value={stats?.total_transcriptions ?? 0} color="accent" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats?.completed_transcriptions ?? 0} color="signal" />
            <StatCard icon={Clock} label="Avg. Process Time" value={`${stats?.avg_processing_time ?? 0}s`} color="accent" sub="per file" />
            <StatCard icon={TrendingUp} label="Avg. Confidence" value={`${Math.round((stats?.avg_confidence_score ?? 0) * 100)}%`} color="accent-glow" />
          </div>

          {/* Chart + Recent */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Confidence chart */}
            <div className="card">
              <h2 className="font-display font-semibold text-text mb-4">Recent Confidence Scores</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={20}>
                    <XAxis dataKey="name" tick={{ fill: '#5a5a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#5a5a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: '12px', color: '#e8e8f0' }}
                      formatter={(v) => [`${v}%`, 'Confidence']}
                    />
                    <Bar dataKey="confidence" fill="#6c63ff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted text-sm">No data yet</div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-text">Recent Activity</h2>
                <Link to="/app/history" className="text-accent text-sm flex items-center gap-1 hover:text-accent-glow">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {stats?.recent_activity?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_activity.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                        <FileAudio size={14} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-medium text-text truncate">{t.original_filename}</p>
                        <p className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={clsx('text-xs font-display font-medium px-2 py-1 rounded-full border capitalize', STATUS_COLORS[t.status])}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted text-sm">No transcriptions yet.</p>
                  <Link to="/app/transcribe" className="text-accent text-sm mt-2 inline-block hover:text-accent-glow">
                    Start your first one →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
