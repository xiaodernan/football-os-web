import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxy = { "/functions/v1/app": "http://127.0.0.1:8000" };

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // M958: the E2E suite and the dev server meet on one dedicated port. strictPort turns a
  // squatter (another project bound to the same number on this machine) into a loud failure
  // instead of a silent test run against somebody else's app.
  server: { host: "127.0.0.1", port: 5199, strictPort: true, proxy },
  preview: { host: "127.0.0.1", proxy },
  build: { outDir: "dist" },
});
