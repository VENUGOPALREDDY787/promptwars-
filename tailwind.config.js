/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          dark: '#0a0f1d',
          card: '#111827',
          cardHover: '#1f293d',
          border: '#1f2937',
          accent: '#38bdf8',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981',
          radar: '#0284c7'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
