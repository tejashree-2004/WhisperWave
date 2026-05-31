import { Link } from 'react-router-dom'
import { Mic, Zap, Shield, Download, ArrowRight, Wand2 } from 'lucide-react'

const features = [
  { icon: Mic, title: 'Fine-tuned Whisper', desc: 'Domain-specific AI trained on your vocabulary for higher accuracy.' },
  { icon: Zap, title: 'Fast Processing', desc: 'Transcriptions delivered in seconds, not minutes.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your audio is encrypted. Never shared or used for training.' },
  { icon: Download, title: 'Export Anywhere', desc: 'Download results as TXT, PDF, or DOCX instantly.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-void text-text font-body overflow-hidden">
      {/* Glow orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-signal/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <Wand2 size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">WhisperTask</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm py-2">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-sm font-display font-medium px-4 py-2 rounded-full mb-8 animate-fade-up">
          <span className="w-2 h-2 bg-signal rounded-full animate-pulse" />
          Fine-tuned Whisper AI
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-tight mb-6 animate-fade-up animate-fade-up-1">
          Speech-to-Text<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-signal">
            Built for Your Domain
          </span>
        </h1>

        <p className="text-text-dim text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animate-fade-up-2">
          Upload audio or record live. Get accurate transcriptions powered by a Whisper model fine-tuned on domain-specific data — medical, technical, legal, and more.
        </p>

        <div className="flex items-center justify-center gap-4 animate-fade-up animate-fade-up-3">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base py-4 px-8">
            Start Transcribing <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn-ghost flex items-center gap-2 text-base py-4">
            Sign In
          </Link>
        </div>

        {/* Waveform visual */}
        <div className="mt-20 flex justify-center items-end gap-1 h-16 animate-fade-up animate-fade-up-4">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                height: `${Math.random() * 60 + 10}%`,
                animationDelay: `${(i * 0.05) % 1.2}s`,
                opacity: i > 5 && i < 35 ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:border-accent/30 transition-colors duration-300 group">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Icon size={20} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-text mb-2">{title}</h3>
              <p className="text-text-dim text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border text-center py-8 text-muted text-sm font-body">
        © 2025 WhisperTask — AI-powered domain-specific transcription
      </footer>
    </div>
  )
}
