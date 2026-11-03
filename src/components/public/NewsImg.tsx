"use client";
// Publisher pictures: hide the frame entirely if the image fails to load.
import { useState } from "react";

export function NewsImg({ src, className, eager }: { src: string; className: string; eager?: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} loading={eager ? "eager" : "lazy"} referrerPolicy="no-referrer" onError={() => setOk(false)} />;
}
