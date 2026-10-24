import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

// M458: the service worker is a production concern only — in dev it would cache the module
// graph and make every edit a hard reload. The registration is fire-and-forget: the app works
// without it, and an unsupported browser is not an error.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No SW is not a broken app; the offline shell is a bonus, not a dependency.
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
