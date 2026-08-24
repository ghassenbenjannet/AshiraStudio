import type { Config } from "tailwindcss";

// Design tokens §7.1 du CDC.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#15140f",
        panel: "#1c1a14",
        panel2: "#211f18",
        sable: "#c9a876",
        olive: "#5c6146",
        off: "#f2ede1",
        dim: "#8f8776",
        line: "#2c2a22",
        danger: { bg: "#3a221c", fg: "#e2a394" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        arabic: ["Inter", "Segoe UI", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        field: "8px",
        card: "10px",
        sheet: "16px",
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
