"use client";

import { useEffect, useRef, useState } from "react";

/** onError can fire before hydration; re-check the image once mounted. */
function useBroken() {
  const ref = useRef<HTMLImageElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setErr(true);
  }, []);
  return { ref, err, setErr };
}

/* eslint-disable @next/next/no-img-element */

export function TeamLogo({ src, alt, size = 28, className = "" }: { src: string; alt: string; size?: number; className?: string }) {
  const { ref, err, setErr } = useBroken();
  if (!src || err)
    return (
      <span
        className={`display inline-flex items-center justify-center rounded-full bg-ink-800 text-[10px] font-bold text-ink-300 ${className}`}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 3)}
      </span>
    );
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Headshot({
  src,
  name,
  size = 40,
  ring,
  className = "",
  fallback,
}: {
  src: string;
  fallback?: string;
  name: string;
  size?: number;
  ring?: string;
  className?: string;
}) {
  const { ref, err, setErr } = useBroken();
  const [useFallback, setUseFallback] = useState(false);
  const current = useFallback && fallback ? fallback : src;
  const onErr = () => (fallback && !useFallback ? setUseFallback(true) : setErr(true));
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={`relative inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-ink-800 ${className}`}
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {!current || err ? (
        <span className="display self-center text-xs font-bold text-ink-400" style={{ fontSize: size * 0.34 }}>
          {initials}
        </span>
      ) : (
        <img
          ref={ref}
          src={current}
          alt={name}
          loading="lazy"
          onError={onErr}
          className="h-full w-full object-cover object-top"
          style={{ transform: "scale(1.25) translateY(8%)" }}
        />
      )}
    </span>
  );
}
