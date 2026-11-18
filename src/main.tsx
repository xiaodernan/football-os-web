import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

// M458+M1193: production-only, and registered under the app's base — GitHub Pages serves this app
// from /football-os-web/, where a root-absolute /sw.js 404s and the offline shell never installed.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js?v=" + __BUILD_ID__).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
