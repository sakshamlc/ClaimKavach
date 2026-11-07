import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1530",
          50: "#F0F4FC",
          100: "#E1E9F9",
          200: "#C2D2F2",
          800: "#13234F",
          900: "#0B1530",
          950: "#060C1C",
        },
        teal: {
          DEFAULT: "#12A58A",
          50: "#EBF8F5",
          100: "#D7F1EB",
          500: "#12A58A",
          600: "#0E836D",
          700: "#0B6252",
        },
        flag: {
          red: "#E5484D",
          amber: "#F5A524",
          purple: "#8E4EC6",
          green: "#30A46C",
        },
      },
    },
  },
  plugins: [],
};
export default config;
