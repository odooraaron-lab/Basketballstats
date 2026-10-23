export function ScanLoading({ scope }: { scope: "game" | "day" }) {
  return (
    <div id="scan-report" className="card flex items-center gap-4 border-court/40 px-4 py-6">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-court border-t-transparent" />
      <div>
        <div className="display text-base font-bold">Scanning {scope === "day" ? "every game this day" : "both rosters"}…</div>
        <div className="text-xs text-ink-400">Pulling season averages, the last 10 games for each rotation player, and opponent defense. Usually 5–20 seconds.</div>
      </div>
    </div>
  );
}
