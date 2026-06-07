/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New indigo design system
        brand: { DEFAULT: "#5B53C6", deep: "#4A43B0", soft: "#ECEAFA", ondark: "#9C94F7" },
        ink: { DEFAULT: "#141220", surface: "#1F1C2B", border: "#2E2A3D", muted: "#A8A2BC" },
        page: "#F1EFF9",
        line: "#E7E5EF",
         tone: { DEFAULT: "#1D1B26", muted: "#5A5666", faint: "#9794A4" },
        ok: "#3FB27F",
        warn: "#E0556B",
        // Legacy (kept during transition)
        cream: { 50: "#FDFBF7", 100: "#F5F0E8", 200: "#EDE5D8" },
        amber: { 400: "#F5B942", 500: "#E8A830" },
        charcoal: { 400: "#8A8A8A", 600: "#4A4A4A", 900: "#1A1A1A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 2px 14px rgba(40,34,80,0.06)",
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
