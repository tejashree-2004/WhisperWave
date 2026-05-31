import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { Search, Trash2, Download, FileAudio, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES = {
  done: 'text-signal bg-signal/10 border-signal/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing: 'text-accent bg-accent/10 border-accent/20',
  failed: 'text-warn bg-warn/10 border-warn/20',
}

export default function History() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const PAGE_SIZE = 10

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/history?${params}`)
      setItems(data.transcriptions)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400)
    return () => clearTimeout(t)
  }, [search])

  const handleDelete = async (id) => {
    if (!confirm('Delete this transcription?')) return
    setDeleting(id)
    try {
      await api.delete(`/history/${id}`)
      fetchHistory()
    } catch (err) {
      alert('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-text">History</h1>
        <p className="text-text-dim mt-1">{total} transcription{total !== 1 ? 's' : ''} total</p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            className="input-field pl-9 text-sm"
            placeholder="Search by filename..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="input-field text-sm w-36"
        >
          <option value="">All statuses</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1 items-end h-8">
              {[...Array(7)].map((_, i) => <div key={i} className="wave-bar h-8" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FileAudio size={40} className="text-muted/40 mx-auto mb-4" />
            <p className="font-display font-medium text-text-dim">No transcriptions found</p>
            {search && <p className="text-muted text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(t => (
              <div key={t.id}>
                <div
                  className="flex items-center gap-4 px-6 py-4 hover:bg-void/50 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileAudio size={16} className="text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium text-text text-sm truncate">{t.original_filename}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {new Date(t.created_at).toLocaleString()} · {t.domain} · {t.language?.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {t.confidence_score && (
                      <span className="text-xs font-mono text-muted hidden sm:block">
                        {Math.round(t.confidence_score * 100)}%
                      </span>
                    )}
                    <span className={clsx('text-xs font-display font-medium px-2 py-0.5 rounded-full border capitalize', STATUS_STYLES[t.status])}>
                      {t.status}
                    </span>
                    {t.status === 'done' && (
                      <a href={`/api/transcribe/export/${t.id}?fmt=txt`}
                        onClick={e => e.stopPropagation()}
                        className="text-muted hover:text-accent transition-colors">
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                      disabled={deleting === t.id}
                      className="text-muted hover:text-warn transition-colors"
                    >
                      {deleting === t.id ? <div className="w-4 h-4 border-2 border-warn/40 border-t-warn rounded-full animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded transcript */}
                {expanded === t.id && t.transcribed_text && (
                  <div className="px-6 pb-4 bg-void/50 border-t border-border/50">
                    <div className="mt-3 bg-surface rounded-xl p-4 max-h-40 overflow-y-auto">
                      <p className="text-text-dim text-sm leading-relaxed font-mono whitespace-pre-wrap">
                        {t.transcribed_text}
                      </p>
                    </div>
                    {t.status === 'done' && (
                      <div className="flex gap-2 mt-3">
                        {['txt', 'pdf', 'docx'].map(fmt => (
                          <a key={fmt} href={`/api/transcribe/export/${t.id}?fmt=${fmt}`}
                            className="text-xs btn-ghost py-1.5 px-3 uppercase font-mono">
                            {fmt}
                          </a>
                        ))}
                      </div>
                    )}
                    {t.status === 'failed' && (
                      <div className="flex items-center gap-2 mt-3 text-warn text-xs">
                        <AlertCircle size={14} /> {t.error_message || 'Processing failed'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost py-2 px-3">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost py-2 px-3">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
