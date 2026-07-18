/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        'primary-light': '#FFF3EE',
        secondary: '#4CAF50',
        'secondary-light': '#F0FFF0',
      },
      fontFamily: {
        thai: ['Sarabun', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%':  { transform: 'translateX(-4px)' },
          '40%, 80%':  { transform: 'translateX(4px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}

