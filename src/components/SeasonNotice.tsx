import { statusFor } from "@/lib/seasonStatus";

/** Banner shown inside a section when its competition is between seasons. */
export async function SeasonNotice({ id }: { id: string }) {
  const s = await statusFor(id);
  if (!s || s.state !== "off-season") return null;
  return (
    <div className="mb-5 flex gap-3 rounded-xl border border-court-dim bg-court/10 px-4 py-3 text-sm" role="status">
      <span className="text-lg" aria-hidden>🗓</span>
      <div>
        <div className="font-semibold text-court-soft">{s.headline}</div>
        <p className="mt-0.5 text-ink-300">{s.detail}</p>
      </div>
    </div>
  );
}
