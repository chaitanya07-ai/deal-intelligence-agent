/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050508',
        obsidian: '#0d0d14',
        ink: '#12121c',
        surface: '#1a1a28',
        elevated: '#22223a',
        border: '#2a2a45',
        muted: '#3a3a5c',
        frost: '#c8d6f0',
        ghost: '#8892a4',
        signal: '#00d4ff',
        pulse: '#7c3aed',
        ember: '#f97316',
        danger: '#ef4444',
        caution: '#eab308',
        safe: '#22c55e',
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,255,0.6)' },
        }
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
