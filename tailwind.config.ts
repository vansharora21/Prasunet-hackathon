import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#533afd',
        'primary-hover': '#4434d4',
        navy: '#061b31',
        'brand-dark': '#1c1e54',
        border: '#e5edf5',
        text: '#061b31',
        label: '#273951',
        body: '#64748d',
        bg: '#ffffff',
        elevated: '#f8fafc',
        subtext: '#475569',
        muted: '#94a3b8',
        success: '#15be53',
        warning: '#F59E0B',
        danger: '#EF4444',
        card: '#ffffff',
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.12)',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slide-up': 'slideUp 0.2s ease-out both',
        'fade-in': 'fadeIn 0.25s ease-out both',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;