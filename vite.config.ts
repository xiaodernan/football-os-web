import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { llmProxyMiddleware, serverConfig } from "./scripts/llm-proxy.mjs";

const proxy = { "/functions/v1/app": "http://127.0.0.1:8000" };

export default defineConfig(({ mode }) => {
  // loadEnv with an empty prefix reads EVERY .env var into this (server-side) config process.
  // We hand ONLY the non-VITE_ secret names to the proxy; Vite itself still exposes only the
  // VITE_-prefixed public signals (VITE_LLM_ENABLED / VITE_LLM_MODEL) to the browser bundle.
  // The API key therefore lives exclusively in this Node process and never in dist/assets/*.js.
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "");
  const llmConfig = serverConfig(env);
  // M1078: the same-origin LLM proxy, mounted on BOTH dev and preview so a live witness and a
  // built app served by `vite preview` share ONE implementation. A static host (GH Pages) has no
  // Node middleware, so the browser's POST to /api/llm/chat fails and degrades to the local
  // deterministic briefing — the honest, secret-free default for a public deployment.
  const llmPlugin: Plugin = {
    name: "footballos-llm-proxy",
    configureServer(server) { server.middlewares.use(llmProxyMiddleware(() => llmConfig)); },
    configurePreviewServer(server) { server.middlewares.use(llmProxyMiddleware(() => llmConfig)); },
  };
  return {
    plugins: [react(), llmPlugin],
    base: process.env.BASE_PATH || "/",
    resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
    // M958: the E2E suite and the dev server meet on one dedicated port. strictPort turns a
    // squatter (another project bound to the same number on this machine) into a loud failure
    // instead of a silent test run against somebody else's app.
    server: { host: "127.0.0.1", port: 5199, strictPort: true, proxy },
    preview: { host: "127.0.0.1", proxy },
    build: { outDir: "dist" },
  };
});
