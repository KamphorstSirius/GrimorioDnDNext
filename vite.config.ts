import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "D&D Grimório De Magias",
        short_name: "D&D Grimório",
        description: "Seu grimório de magias acessível offline com todas as magias do D&D 5.0",
        theme_color: "#d4af37",
        background_color: "#0a0906",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/grimoire-bg.jpg",  // ícone do app
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any maskable"
          },
          {
            src: "/grimoire-bg.jpg",  // ícone maior para telas grandes
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
