/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx,mdx}"],
  // Preflight ENABLED — matches the Vite version (no preflight:false)
  corePlugins: {
    // Disable Tailwind's built-in .container — we use our own in index.css
    // (width:95%, max-width:1440px, margin:auto) which matches the live site.
    container: false,
  },
  theme: {
    extend: {
      colors: {
        primary:        '#1565C0',
        'primary-dark': '#0D47A1',
        'primary-light':'#2196F3',
        'badge-red':    '#E53935',
        'success-green':'#00A651',
      },
      backgroundColor: {
        primary: '#1565C0',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
