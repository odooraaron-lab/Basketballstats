import Link from "next/link";
import { Card, Stat } from "@/components/ui";
import { daily, overview, recentEvents, topList } from "@/lib/adminStats";
import { dbConfigured } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { DailyChart } from "./DailyChart";

const EVENT_LABEL: Record<string, string> = {
  signup: "Signed up",
  checkout_started: "Opened checkout",
  subscribed: "Became a member",
  reactivated: "Came back",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  payment: "Paid",
  account_deleted: "Deleted account",
  password_reset_requested: "Asked for password reset",
};
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "–");

export default async function AdminOverview() {
  if (!dbConfigured())
    return (
      <Card title="Connect the database">
        <p className="text-sm text-ink-300">
          Set <code>DATABASE_URL</code> (Neon) in Vercel to switch on accounts, payments and these stats. See <Link href="/admin/setup" className="text-court">Setup</Link>.
        </p>
      </Card>
    );
  const [o, d, events, areas] = await Promise.all([overview(), daily(30), recentEvents(20), topList("areas", 30)]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members (active)" value={o.active} sub={`${o.paying} paying · ${o.trials} trial · ${o.comped} comp`} tone="accent" />
        <Stat label="Monthly revenue" value={`$${o.mrr.toFixed(2)}`} sub={`NZD MRR · $${(o.mrr * 12).toFixed(0)}/yr run-rate`} tone="win" />
        <Stat label="Signups" value={o.signups30} sub={`last 30 days · ${o.signups7} this week · ${o.usersTotal} all time`} />
        <Stat label="Visitors" value={o.visitors30} sub={`last 30 days · ${o.visitors7} this week · ${o.views30} views`} />
      </div>

      <Card title="Last 30 days" right={<span><span className="text-ink-400">■ visitors</span> · <span className="text-court">● signups</span> · <span className="text-win">● new members</span></span>}>
        <DailyChart data={d} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Funnel (30 days)">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Visitors", o.visitors30, ""],
                ["Signed up", o.signups30, pct(o.signups30, o.visitors30)],
                ["Opened checkout", o.checkout30, pct(o.checkout30, o.signups30)],
                ["Became members", o.subscribed30, pct(o.subscribed30, o.signups30)],
              ].map(([k, v, p]) => (
                <tr key={String(k)} className="border-b border-ink-850">
                  <td className="py-1.5 text-ink-300">{k}</td>
                  <td className="num py-1.5 text-right font-semibold">{v}</td>
                  <td className="num w-20 py-1.5 text-right text-ink-500">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-ink-950/60 py-2"><div className="num text-lg font-semibold text-loss">{o.cancelled30}</div>cancelled</div>
            <div className="rounded-md bg-ink-950/60 py-2"><div className="num text-lg font-semibold text-court-soft">{o.cancelling}</div>cancelling</div>
            <div className="rounded-md bg-ink-950/60 py-2"><div className="num text-lg font-semibold text-loss">{o.pastDue}</div>payment issues</div>
          </div>
        </Card>
        <Card title="Recent activity">
          <ul className="space-y-1.5 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-24 shrink-0 text-xs text-ink-500">{fmtDate(e.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                <span className={e.type === "subscribed" ? "text-win" : e.type === "cancelled" || e.type === "payment_failed" ? "text-loss" : "text-ink-200"}>{EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="truncate text-ink-400">{e.email ?? ""}</span>
              </li>
            ))}
            {!events.length && <li className="text-ink-500">Nothing yet.</li>}
          </ul>
        </Card>
      </div>

      <Card title="What members use (30 days)">
        <div className="grid gap-x-6 sm:grid-cols-2">
          {areas.map((a) => (
            <div key={a.k} className="flex justify-between border-b border-ink-850 py-1 text-sm">
              <span className="text-ink-300">/{a.k}</span>
              <span className="num">{a.n} views · {a.v} members</span>
            </div>
          ))}
          {!areas.length && <p className="text-sm text-ink-500">No member activity yet.</p>}
        </div>
      </Card>
    </div>
  );
}
