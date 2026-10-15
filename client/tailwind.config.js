/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kahoot: {
          red: '#e21b3c',
          blue: '#1368ce',
          yellow: '#d89e00',
          green: '#26890c'
        },
        arena: {
          purple: '#6366f1',
          darkBg: '#0f172a',
          cardDark: '#1e293b',
          borderDark: '#334155'
        }
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 2',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-up': 'scaleUp 0.3s ease-out forwards',
        'confetti': 'confetti 1s ease-in-out forwards'
      },
      keyframes: {
        scaleUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
