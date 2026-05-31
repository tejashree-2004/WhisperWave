import { useState, useRef, useCallback, useEffect } from 'react'
import api from '../utils/api'
import { Upload, Mic, Square, Play, Pause, Download, Copy, CheckCheck, Loader2, AlertCircle, FileAudio } from 'lucide-react'
import clsx from 'clsx'

const DOMAINS = ['general', 'medical', 'legal', 'technical', 'financial', 'education', 'customer-support']
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }, { code: 'auto', name: 'Auto Detect' },
]

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export default function Transcribe() {
  const [tab, setTab] = useState('upload') // 'upload' | 'record'
  const [file, setFile] = useState(null)
  const [domain, setDomain] = useState('general')
  const [language, setLanguage] = useState('en')
  const [transcription, setTranscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [polling, setPolling] = useState(null)

  // Recording state
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const pollStatus = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/transcribe/status/${id}`)
      if (data.status === 'done' || data.status === 'failed') {
        setTranscription(data)
        setLoading(false)
        return true
      }
    } catch {
      setLoading(false)
      return true
    }
    return false
  }, [])

  const handleSubmit = async () => {
    const audioFile = tab === 'upload' ? file : recordedBlob ? new File([recordedBlob], 'recording.webm', { type: 'audio/webm' }) : null
    if (!audioFile) { setError('Please select or record audio first.'); return }

    setError('')
    setLoading(true)
    setTranscription(null)

    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('language', language)
    formData.append('domain', domain)

    try {
      const { data } = await api.post('/transcribe/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setTranscription(data)

      if (data.status === 'pending' || data.status === 'processing') {
        const interval = setInterval(async () => {
          const done = await pollStatus(data.id)
          if (done) clearInterval(interval)
        }, 2000)
        setPolling(interval)
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.')
      setLoading(false)
    }
  }

  useEffect(() => () => { if (polling) clearInterval(polling) }, [polling])

  const copyText = () => {
    navigator.clipboard.writeText(transcription?.transcribed_text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadExport = (fmt) => {
    window.open(`/api/transcribe/export/${transcription.id}?fmt=${fmt}`, '_blank')
  }

  const isProcessing = transcription && (transcription.status === 'pending' || transcription.status === 'processing')
  const isDone = transcription?.status === 'done'
  const isFailed = transcription?.status === 'failed'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-3xl text-text">New Transcription</h1>
        <p className="text-text-dim mt-1">Upload a file or record audio to get started</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex bg-surface border border-border rounded-xl p-1">
            {['upload', 'record'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('flex-1 py-2 rounded-lg text-sm font-display font-medium capitalize transition-colors',
                  tab === t ? 'bg-accent text-white' : 'text-text-dim hover:text-text')}>
                {t === 'upload' ? '📁 Upload' : '🎙️ Record'}
              </button>
            ))}
          </div>

          {/* Upload area */}
          {tab === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('file-input').click()}
              className={clsx(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
                file ? 'border-signal/40 bg-signal/5' : 'border-border hover:border-accent/40 hover:bg-accent/5'
              )}
            >
              <input id="file-input" type="file" className="hidden"
                accept=".mp3,.wav,.m4a,.flac,.ogg,.webm"
                onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]) }} />
              {file ? (
                <div>
                  <FileAudio size={32} className="text-signal mx-auto mb-3" />
                  <p className="font-display font-semibold text-text">{file.name}</p>
                  <p className="text-muted text-sm mt-1">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="text-muted mx-auto mb-3" />
                  <p className="font-display font-medium text-text">Drop audio here or click to browse</p>
                  <p className="text-muted text-sm mt-1">MP3, WAV, M4A, FLAC, OGG supported</p>
                </div>
              )}
            </div>
          )}

          {/* Record area */}
          {tab === 'record' && (
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
              {recording ? (
                <div>
                  <div className="flex justify-center gap-1 items-end h-12 mb-4">
                    {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" style={{ height: '100%', animationDelay: `${i * 0.1}s` }} />)}
                  </div>
                  <p className="font-display font-bold text-warn text-2xl mb-4">{formatTime(recordTime)}</p>
                  <button onClick={stopRecording}
                    className="flex items-center gap-2 mx-auto bg-warn/10 border border-warn/30 text-warn font-display font-semibold px-6 py-3 rounded-xl hover:bg-warn/20 transition-colors">
                    <Square size={16} fill="currentColor" /> Stop Recording
                  </button>
                </div>
              ) : recordedBlob ? (
                <div>
                  <CheckCheck size={32} className="text-signal mx-auto mb-3" />
                  <p className="font-display font-medium text-text">Recording ready ({formatTime(recordTime)})</p>
                  <audio src={URL.createObjectURL(recordedBlob)} controls className="mt-3 w-full" />
                  <button onClick={() => { setRecordedBlob(null); setRecordTime(0) }}
                    className="text-muted text-sm mt-2 hover:text-text underline">
                    Record again
                  </button>
                </div>
              ) : (
                <div>
                  <Mic size={32} className="text-muted mx-auto mb-3" />
                  <p className="font-display font-medium text-text mb-4">Click to start recording</p>
                  <button onClick={startRecording}
                    className="flex items-center gap-2 mx-auto btn-primary">
                    <Mic size={16} /> Start Recording
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display font-medium text-text-dim mb-1.5">Domain</label>
              <select value={domain} onChange={e => setDomain(e.target.value)} className="input-field text-sm capitalize">
                {DOMAINS.map(d => <option key={d} value={d}>{d.replace('-', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-display font-medium text-text-dim mb-1.5">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field text-sm">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-warn/10 border border-warn/20 text-warn text-sm p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Mic size={16} /> Transcribe</>}
          </button>
        </div>

        {/* Right: Results */}
        <div>
          {(loading || isProcessing) && !isDone && (
            <div className="card h-full flex flex-col items-center justify-center text-center py-16">
              <div className="flex gap-1 items-end h-12 mb-6">
                {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" style={{ height: '100%', animationDelay: `${i * 0.1}s` }} />)}
              </div>
              <p className="font-display font-semibold text-text">Transcribing audio...</p>
              <p className="text-text-dim text-sm mt-1">This may take a few seconds</p>
            </div>
          )}

          {isFailed && (
            <div className="card h-full flex flex-col items-center justify-center text-center py-16">
              <AlertCircle size={32} className="text-warn mb-4" />
              <p className="font-display font-semibold text-warn">Transcription failed</p>
              <p className="text-muted text-sm mt-1">{transcription.error_message || 'Unknown error'}</p>
            </div>
          )}

          {isDone && (
            <div className="card space-y-4 animate-fade-up">
              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs bg-signal/10 border border-signal/20 text-signal font-display font-medium px-2.5 py-1 rounded-full">
                  ✓ Done
                </span>
                <span className="text-xs text-muted font-mono">
                  {Math.round((transcription.confidence_score || 0) * 100)}% confidence
                </span>
                <span className="text-xs text-muted font-mono">
                  {transcription.processing_time}s
                </span>
                {transcription.audio_duration && (
                  <span className="text-xs text-muted font-mono">
                    {formatTime(Math.round(transcription.audio_duration))} audio
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="bg-void border border-border rounded-xl p-4 max-h-60 overflow-y-auto">
                <p className="text-text font-body text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription.transcribed_text || 'No text detected.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={copyText} className="btn-ghost text-sm py-2 px-4 flex items-center gap-2">
                  {copied ? <><CheckCheck size={14} className="text-signal" /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
                <button onClick={() => downloadExport('txt')} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                  <Download size={14} /> TXT
                </button>
                <button onClick={() => downloadExport('pdf')} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                  <Download size={14} /> PDF
                </button>
                <button onClick={() => downloadExport('docx')} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                  <Download size={14} /> DOCX
                </button>
              </div>
            </div>
          )}

          {!loading && !transcription && (
            <div className="card h-full flex flex-col items-center justify-center text-center py-16 min-h-64">
              <Mic size={40} className="text-muted/40 mb-4" />
              <p className="font-display font-medium text-text-dim">Your transcription will appear here</p>
              <p className="text-muted text-sm mt-1">Upload or record audio to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
