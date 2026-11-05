import { Card } from "@/components/ui";
import { dbConfigured } from "@/lib/db";
import { SPORT_LABEL, SPORT_ORDER, type SportTag } from "@/lib/news/core";
import { INGEST_MINUTES, lastReport, listPosts } from "@/lib/news/store";
import { SOURCES } from "@/lib/news/sources";
import { addLinkAction, postAction, runNowAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNews({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  if (!dbConfigured()) return <Card title="News">Set DATABASE_URL to save news. Without it the News page reads newsroom feeds directly.</Card>;
  const [report, posts] = await Promise.all([lastReport().catch(() => null), listPosts({ status: "all", limit: 80 }).catch(() => [])]);
  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "–");
  return (
    <div className="space-y-5">
      {msg && (
        <p className={`rounded-md px-3 py-2 text-sm ${msg.startsWith("error") ? "bg-loss/10 text-loss" : "bg-win/10 text-win"}`}>
          {msg === "added" ? "Story added." : msg === "duplicate" ? "That story is already on the page." : msg.replace(/^error:/, "")}
        </p>
      )}
      <Card title="News finder" right={`runs every ${INGEST_MINUTES} min when /news gets visits, plus a daily cron`}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <form action={runNowAction}>
            <button className="rounded-lg bg-court px-4 py-2 font-semibold text-ink-950">Find news now</button>
          </form>
          {report ? (
            <span className="text-ink-400">
              Last run {when(report.at)} ({report.reason}): {report.added} new, {report.skipped} duplicates, {report.pictures} pictures added{report.ms ? `, took ${(report.ms / 1000).toFixed(1)}s` : ""}.
            </span>
          ) : (
            <span className="text-ink-500">Hasn&apos;t run yet.</span>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="stat-table compact">
            <thead>
              <tr>
                <th className="!text-left">Source</th>
                <th className="!text-left">Type</th>
                <th>Found</th>
                <th>Added</th>
                <th className="!text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => {
                const r = report?.sources[s.id];
                return (
                  <tr key={s.id}>
                    <td className="!text-left font-sans">
                      {s.name} <span className="text-ink-500">· {s.id}</span>
                    </td>
                    <td className="!text-left font-sans text-ink-400">{s.type === "rss" ? "Feed" : "News search"}</td>
                    <td>{r?.found ?? "–"}</td>
                    <td>{r?.added ?? "–"}</td>
                    <td className={`!text-left font-sans ${!r ? "text-ink-500" : r.ok ? "!text-win" : "!text-loss"}`}>{!r ? "not run" : r.ok ? "ok" : r.error}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Add a story by link">
        <form action={addLinkAction} className="space-y-3 text-sm">
          <input name="url" required placeholder="https://…" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 outline-none focus:border-court" />
          <div className="flex flex-wrap gap-3 text-xs text-ink-300">
            {SPORT_ORDER.map((s) => (
              <label key={s} className="flex items-center gap-1.5">
                <input type="checkbox" name="sport" value={s} className="accent-court" /> {SPORT_LABEL[s]}
              </label>
            ))}
            <span className="text-ink-500">(leave blank to tag automatically)</span>
          </div>
          <button className="rounded-lg border border-ink-700 px-4 py-2 hover:border-court">Add story</button>
        </form>
      </Card>

      <Card pad={false} title={`Stories (${posts.length})`} right="hidden stories don't show on /news">
        <ul className="divide-y divide-ink-800">
          {posts.map((p) => (
            <li key={String(p.id)} className={`flex items-start gap-3 px-4 py-2.5 text-sm ${p.status === "hidden" ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <a href={p.url} target="_blank" rel="noopener nofollow" className="font-semibold hover:text-court">
                  {p.pinned && "📌 "}
                  {p.title}
                </a>
                <div className="text-xs text-ink-500">
                  {p.source} · {when(p.published_at ?? p.added_at)} · {p.sports.map((s) => SPORT_LABEL[s as SportTag] ?? s).join(", ")} {p.image ? "· 🖼" : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <form action={postAction}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <input type="hidden" name="op" value={p.pinned ? "unpin" : "pin"} />
                  <button className="rounded-md border border-ink-700 px-2 py-0.5 text-xs hover:border-court">{p.pinned ? "Unpin" : "Pin"}</button>
                </form>
                <form action={postAction}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <input type="hidden" name="op" value={p.status === "hidden" ? "show" : "hide"} />
                  <button className="rounded-md border border-ink-700 px-2 py-0.5 text-xs hover:border-loss">{p.status === "hidden" ? "Show" : "Hide"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
