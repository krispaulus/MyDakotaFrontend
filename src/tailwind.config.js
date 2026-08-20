/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'Agdasima': ['Agdasima', 'sans-serif'],
        'Inter': ['Inter', 'sans-serif'],
        'Poppins': ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}