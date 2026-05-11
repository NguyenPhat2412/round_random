/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 20px 60px rgba(15, 23, 42, 0.35)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(59,130,246,.22), transparent 34%), radial-gradient(circle at top right, rgba(168,85,247,.18), transparent 32%), linear-gradient(135deg, #09111f 0%, #111827 50%, #1f2937 100%)",
      },
    },
  },
  plugins: [],
};
