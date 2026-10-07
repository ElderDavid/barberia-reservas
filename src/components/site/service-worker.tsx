"use client";

import { useEffect } from "react";

/** Registers `public/sw.js`, which only adds the offline screen for the installed app. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Without it the app still works online; it just has no offline screen.
      });
    }
  }, []);
  return null;
}
