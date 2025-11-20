/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FFF6FA',
        card: '#FFF1F6',
        primary: '#FFABC9',
        accent: '#FF6FA3',
        muted: '#8E6A7F',
        'orb-start': '#FFE1EE',
        'orb-end': '#FFD1E6',
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '18px',
      },
      boxShadow: {
        'gurlz': '0 20px 50px rgba(255,111,153,0.12)',
      },
    },
  },
  plugins: [],
}

