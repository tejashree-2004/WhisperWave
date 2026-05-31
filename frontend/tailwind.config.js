/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        void: '#0a0a0f',
        surface: '#12121a',
        panel: '#1a1a26',
        border: '#2a2a3d',
        accent: '#6c63ff',
        'accent-glow': '#8b83ff',
        signal: '#00e5a0',
        warn: '#ff6b6b',
        muted: '#5a5a7a',
        text: '#e8e8f0',
        'text-dim': '#8888a8',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
