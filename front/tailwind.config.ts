import type { Config } from "tailwindcss";

// Design tokens §7.1 du CDC.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#FBF8F3",
        panel: "#FFFFFF",
        panel2: "#F8F5EF",
        sable: "#D9531E",
        olive: "#0F7A66",
        off: "#191713",
        dim: "#7A7266",
        line: "#EBE3D6",
        danger: { bg: "#FDEAE5", fg: "#A43118" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Instrument Sans", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        arabic: ["Instrument Sans", "Segoe UI", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        field: "11px",
        card: "16px",
        sheet: "22px",
      },
      spacing: {
        "4.5": "18px",
      },
      maxWidth: {
        content: "1080px",
      },
      minHeight: {
        tap: "44px",
      },
      minWidth: {
        tap: "44px",
      },
    },
  },
  plugins: [],
} satisfies Config;
