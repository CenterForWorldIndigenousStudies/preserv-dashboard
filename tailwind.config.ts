import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14281d",
        moss: "#355834",
        sand: "#efe5d5",
        clay: "#b85c38",
        sky: "#d7ecf4",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(20, 40, 29, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
