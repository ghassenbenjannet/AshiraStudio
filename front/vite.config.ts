import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA (§8.1) : app shell + icônes précachés pour un chargement rapide et l'installation ; les
// requêtes /api/* restent toujours NetworkOnly — jamais de données métier servies depuis un cache
// (RG-PROV : jamais de donnée obsolète présentée comme actuelle).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Achirah HQ",
        short_name: "Achirah HQ",
        description: "Plateforme d'opérations Achirah — عشيرة",
        lang: "fr",
        theme_color: "#15140f",
        background_color: "#15140f",
        display: "standalone",
        start_url: "/aujourdhui",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
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
