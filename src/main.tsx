import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

// M458: the service worker is a production concern only — in dev it would cache the module
// graph and make every edit a hard reload. The registration is fire-and-forget: the app works
// without it, and an unsupported browser is not an error.
// M1193: the worker is registered under the app's own base path. GitHub Pages serves this app
// from /football-os-web/ — a root-absolute "/sw.js" 404s there (the console error users saw) and
// the offline shell never installs. import.meta.env.BASE_URL carries the Pages base in prod
// builds and "/" everywhere else.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js?v=" + __BUILD_ID__).catch(() => {
      // No SW is not a broken app; the offline shell is a bonus, not a dependency.
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
