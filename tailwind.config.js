/** @type {import('tailwind-css').Config} */
export default {
  darkMode: 'selector', // This allows the .dark class on <html> to work
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}