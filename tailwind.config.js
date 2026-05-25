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
    },
  },
  plugins: [],
}

