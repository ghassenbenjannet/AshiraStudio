import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PWA (manifest + service worker) : configurée en Phase ⑦ Transverses, avec les icônes réelles.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
