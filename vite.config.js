import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { entryFileNames: "assets/app-26.47c.js", chunkFileNames: "assets/chunk-26.47c.js", assetFileNames: "assets/style-26.47c[extname]" } } },
  preview: { host: "0.0.0.0", port: process.env.PORT || 4173, allowedHosts: [".up.railway.app"] }
});
