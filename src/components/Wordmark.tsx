// The Quick Read mark: a scoreboard tile plus the name. Used in every header.
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2 tracking-tight">
      <span className={`grid place-items-center rounded-[3px] bg-court font-black leading-none text-ink-950 ${size === "sm" ? "h-6 w-7 text-[11px]" : "h-7 w-8 text-[13px]"}`}>QR</span>
      <span>Quick Read</span>
    </span>
  );
}
