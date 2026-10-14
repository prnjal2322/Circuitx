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
        circuit: {
          bg: '#0A0E17',
          surface: '#111827',
          card: '#161F30',
          hover: '#1E293B',
          border: '#1E293B',
          cyan: '#00F0FF',
          blue: '#38BDF8',
          accent: '#0EA5E9',
          amber: '#F59E0B',
          emerald: '#10B981',
          rose: '#F43F5E',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',
        'glow-blue': '0 0 15px rgba(56, 189, 248, 0.35)',
        'glow-sm': '0 0 8px rgba(0, 240, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
