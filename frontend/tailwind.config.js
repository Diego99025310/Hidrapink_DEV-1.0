/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ff5fa2",
          dark: "#d34481",
          light: "#ffd4e8",
        },
      },
    },
  },
  plugins: [],
};
