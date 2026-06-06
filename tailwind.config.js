/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { 50: "#FDFBF7", 100: "#F5F0E8", 200: "#EDE5D8" },
        amber: { 400: "#F5B942", 500: "#E8A830" },
        charcoal: { 400: "#8A8A8A", 600: "#4A4A4A", 900: "#1A1A1A" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
