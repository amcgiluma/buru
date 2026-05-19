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
        ink: "#16181d",
        bone: "#f4ead5",
        felt: "#0f5b57",
        petrol: "#18383e",
        gold: "#d6ad4f",
        ember: "#b63f35",
        mint: "#79d695",
        signal: "#f6d95f",
      },
      boxShadow: {
        pixel: "0 8px 0 rgba(8, 12, 16, 0.45)",
        card: "0 6px 0 rgba(22, 24, 29, 0.18)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
