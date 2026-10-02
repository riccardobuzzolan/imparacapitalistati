import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VERCEL === "1" ? "/" : "/imparacapitalistati/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Memory Atlas",
        short_name: "Memory Atlas",
        description: "Quiz su stati e capitali",
        theme_color: "#f4f5f2",
        background_color: "#f4f5f2",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
