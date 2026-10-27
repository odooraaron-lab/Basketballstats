export const inputCls = "w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm outline-none focus:border-court";
export const labelCls = "mb-1 block text-xs font-medium text-ink-400";
export const btnCls = "display w-full rounded-lg bg-court py-2.5 text-base font-bold text-ink-950 transition hover:bg-court-soft";

export function AuthCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7 shadow-2xl shadow-black/30">
        <h1 className="display text-3xl font-extrabold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-400">{sub}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "ok" | "info"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "border-win/40 bg-win/10 text-win" : tone === "info" ? "border-court-dim bg-court/10 text-court-soft" : "border-loss/40 bg-loss/10 text-loss";
  return <p className={`mb-4 rounded-md border px-3 py-2 text-xs ${cls}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
