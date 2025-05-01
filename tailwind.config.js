/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        primaryHover: '#0056b3',
      },
      borderRadius: {
        message: '15px',
      },
    },
  },
  plugins: [],
} 