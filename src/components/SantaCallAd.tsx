"use client";

/**
 * A small pop-up advert for Santa Call NZ (www.santacall.co.nz), bottom right of the page.
 * Slides in a few seconds after the page loads. The x really closes it, and it stays closed for a day.
 * Drawn only in the browser, so it never changes the server-rendered page or the Google-facing HTML.
 *
 * The picture is not stored on this site. It is loaded from Santa Call, so replacing that one file
 * (public/ad/current.jpg in the santacall repo) changes the advert on every site at once.
 * If Santa Call cannot be reached, the advert simply does not show.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "santa-call-ad-closed-until";
const AD_IMAGE = "https://www.santacall.co.nz/ad/current.jpg";
const DAY = 24 * 60 * 60 * 1000;

type Props = {
  /** Which site this is on, used as the tracking tag on the link (utm_source). */
  site: string;
  /** Path prefixes where the ad never shows, e.g. ["/admin", "/login"]. */
  hideOn?: string[];
  /** Milliseconds before it slides in. */
  delay?: number;
};

export function SantaCallAd({ site, hideOn = [], delay = 4000 }: Props) {
  const pathname = usePathname() || "/";
  const [show, setShow] = useState(false);
  const [broken, setBroken] = useState(false);

  const hidden = hideOn.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/"));

  useEffect(() => {
    if (hidden) return;
    try {
      const until = Number(window.localStorage.getItem(KEY) || 0);
      if (until > Date.now()) return;
    } catch {
      /* storage blocked: show it, it just will not be remembered */
    }
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [hidden, delay]);

  function close() {
    setShow(false);
    try {
      window.localStorage.setItem(KEY, String(Date.now() + DAY));
    } catch {
      /* ignore */
    }
  }

  if (hidden || !show || broken) return null;

  const href = `https://www.santacall.co.nz/?utm_source=${encodeURIComponent(site)}&utm_medium=ad&utm_campaign=santa-ad`;

  return (
    <aside
      aria-label="Advertisement"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 2147483000,
        width: "min(340px, calc(100vw - 24px))",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(0,0,0,.45)",
        background: "#12213f",
      }}
    >
      <a href={href} target="_blank" rel="noopener sponsored" style={{ display: "block", lineHeight: 0 }}>
        <img
          src={AD_IMAGE}
          onError={() => setBroken(true)}
          width={800}
          height={420}
          alt="Advert: Santa Call NZ. Santa phones your kids and says their name. From $1.87."
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </a>
      <button
        type="button"
        onClick={close}
        aria-label="Close advert"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          padding: 0,
          border: 0,
          borderRadius: 2,
          background: "#e6e6e6",
          color: "#555",
          font: "bold 12px/18px Arial, sans-serif",
          cursor: "pointer",
        }}
      >
        x
      </button>
    </aside>
  );
}
