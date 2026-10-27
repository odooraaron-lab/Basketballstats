import { NextResponse } from "next/server";

/** Only same-site relative paths. */
export function safeNext(n: FormDataEntryValue | string | null | undefined, fallback = "/app"): string {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/api/") ? s : fallback;
}

export const back = (req: Request, path: string, params: Record<string, string | undefined> = {}) => {
  const url = new URL(path, req.url);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
};

export const slow = () => new Promise((r) => setTimeout(r, 500));
