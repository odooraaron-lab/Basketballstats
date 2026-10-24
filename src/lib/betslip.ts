"use client";
// Multi builder: legs picked from any game, kept in this browser so they survive page changes.
import { useSyncExternalStore } from "react";

export interface SlipLeg {
  id: string; // unique per game + market
  league: string;
  gameId: string;
  game: string; // "OKC @ DEN"
  label: string; // "Jokic 25+ PTS"
  p: number; // our chance (simulation)
  headshot?: string;
  price?: number; // bookmaker decimal odds, entered by the user
  addedAt: number;
}

const KEY = "betslip.v1";
const listeners = new Set<() => void>();
let cache: SlipLeg[] | null = null;
const EMPTY: SlipLeg[] = [];

function read(): SlipLeg[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(cache)) cache = [];
  } catch {
    cache = [];
  }
  return cache!;
}
function write(next: SlipLeg[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((f) => f());
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((f) => f());
    }
  });

export function useSlip(): SlipLeg[] {
  return useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    read,
    () => EMPTY,
  );
}

export const slip = {
  has: (id: string) => read().some((l) => l.id === id),
  add(legs: Omit<SlipLeg, "addedAt">[]) {
    const cur = read();
    const ids = new Set(legs.map((l) => l.id));
    write([...cur.filter((l) => !ids.has(l.id)), ...legs.map((l) => ({ ...l, price: cur.find((c) => c.id === l.id)?.price, addedAt: Date.now() }))]);
    window.dispatchEvent(new CustomEvent("betslip:added", { detail: legs.length }));
  },
  toggle(leg: Omit<SlipLeg, "addedAt">) {
    if (slip.has(leg.id)) slip.remove(leg.id);
    else slip.add([leg]);
  },
  remove: (id: string) => write(read().filter((l) => l.id !== id)),
  setPrice: (id: string, price: number | undefined) => write(read().map((l) => (l.id === id ? { ...l, price } : l))),
  clear: () => write([]),
};
