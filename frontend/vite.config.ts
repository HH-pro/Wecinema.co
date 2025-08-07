import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: './', // ✅ Set base path for CPanel or relative hosting
  plugins: [react()],
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: true,
  },
});
