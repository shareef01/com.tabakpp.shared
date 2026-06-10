/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#020202',
        'bg-panel': '#0D0D0E',
        'bg-card': '#121214',
        'accent': '#D4FF5C',
        'accent-fg': '#0C0C00',
        'danger': '#F87171',
        'success': '#4ADE80',
        'text-main': '#FFFFFF',
        'text-muted': '#AAAAA8',
        'text-dim': '#666664',
        'border-subtle': 'rgba(255,255,255,0.1)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '32px',
        'card-lg': '42px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
