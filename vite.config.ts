import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VERCEL === "1" ? "/" : "/imparacapitalistati/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,html,svg,png,xml,txt}"],
      },
      manifest: {
        name: "Memory Atlas",
        lang: "it",
        short_name: "Memory Atlas",
        description: "Quiz su stati e capitali",
        theme_color: "#f4f5f2",
        background_color: "#f4f5f2",
        display: "standalone",
        id: base,
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
