import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsPaths from "vite-tsconfig-paths";
import chromeManifest from "./public/manifest.json";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: "index.html", button_injection: "button_injection.html" },
      output: { entryFileNames: "[name].js" },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    tsPaths(),
    crx({
      manifest: chromeManifest as ManifestV3Export,
    }),
  ],
});
