import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/imparacapitalistati/",
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
      },
    }),
  ],
});
