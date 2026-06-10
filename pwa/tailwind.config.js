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
        'danger': '#F87171',
        'success': '#4ADE80',
        'text-muted': '#AAAAA8',
        'text-dim': '#666664',
      },
      borderRadius: {
        'card': '32px',
      }
    },
  },
  plugins: [],
}
