import { NextResponse } from "next/server";
import { readScreenshot } from "@/lib/slip";

export const maxDuration = 60;

// Reads a betting screenshot with Claude vision. Returns 501 when no API key is set,
// in which case the browser falls back to on-device OCR.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No image" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 413 });
  try {
    const type = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) ? file.type : "image/jpeg";
    const out = await readScreenshot(new Uint8Array(await file.arrayBuffer()), type);
    return NextResponse.json(out);
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "NO_KEY") return NextResponse.json({ error: "no_key" }, { status: 501 });
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
