"use client";
// First-party page-view beacon for the admin dashboard. No third-party scripts, no
// cross-site cookies; skips prefetches and bots on the server side.
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const body = JSON.stringify({
        path,
        ref: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "",
        utm: params.get("utm_source") || "",
        campaign: params.get("utm_campaign") || "",
        w: window.innerWidth,
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch {
      /* never break the page */
    }
  }, [path]);
  return null;
}
