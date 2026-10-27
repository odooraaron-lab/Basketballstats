"use client";
import { useState } from "react";
import type { Theme } from "@/lib/areas";

const OPTIONS: { id: Theme; label: string; icon: string }[] = [
  { id: "dark", label: "Dark", icon: "☾" },
  { id: "light", label: "Light", icon: "☀" },
  { id: "system", label: "Match device", icon: "◐" },
];

/** Radio group that previews the theme instantly; saved with the settings form. */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [t, setT] = useState<Theme>(initial);
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => (
        <label key={o.id} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm ${t === o.id ? "border-court text-ink-100" : "border-ink-700 text-ink-400"}`}>
          <input
            type="radio"
            name="theme"
            value={o.id}
            checked={t === o.id}
            onChange={() => {
              setT(o.id);
              document.documentElement.dataset.theme = o.id;
            }}
            className="sr-only"
          />
          <span className="text-xl" aria-hidden>{o.icon}</span>
          {o.label}
        </label>
      ))}
    </div>
  );
}
