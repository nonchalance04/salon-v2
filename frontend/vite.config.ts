import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173, strictPort: true,
    allowedHosts: ["riverside-brewery-spore.ngrok-free.dev"],
    proxy: { "/api": { target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000", changeOrigin: false } },
  },
});
