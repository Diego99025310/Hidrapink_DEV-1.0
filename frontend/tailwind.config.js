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
          DEFAULT: "#E4447A",
          dark: "#B73568",
          medium: "#F07999",
          light: "#FBD3DB",
        },
        ink: "#431022",
      },
      fontFamily: {
        display: ["'Agency FB'", "'Bebas Neue'", "'Oswald'", "'Inter'", "sans-serif"],
        body: ["'Qurova Light'", "'Inter'", "'Hind'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        brand: "0 30px 80px -25px rgba(228, 68, 122, 0.35)",
        "brand-soft": "0 18px 45px -20px rgba(240, 121, 153, 0.4)",
      },
    },
  },
  plugins: [],
};
