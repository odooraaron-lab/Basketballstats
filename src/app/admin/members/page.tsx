import Link from "next/link";
import { Card } from "@/components/ui";
import { MEMBER_FILTERS } from "@/lib/adminStats";
import { dbConfigured, q } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { accessLabel, type User } from "@/lib/users";
import { memberAction } from "../actions";

const LABELS: Record<string, string> = { all: "All", active: "Active", paying: "Paying", trial: "Trial", none: "Not subscribed", cancelled: "Cancelled", past_due: "Payment issues", comp: "Complimentary" };

export default async function Members({ searchParams }: { searchParams: Promise<{ f?: string; s?: string; id?: string }> }) {
  if (!dbConfigured()) return <p className="text-sm text-ink-400">Connect the database first.</p>;
  const sp = await searchParams;
  const f = sp.f && MEMBER_FILTERS[sp.f] ? sp.f : "all";
  const s = (sp.s ?? "").trim().toLowerCase();
  const rows = await q<User>(`SELECT * FROM users WHERE (${MEMBER_FILTERS[f]}) AND ($1 = '' OR email ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%') ORDER BY created_at DESC LIMIT 300`, [s]);
  const counts = Object.fromEntries(
    await Promise.all(Object.entries(MEMBER_FILTERS).map(async ([k, w]) => [k, Number((await q<{ n: string }>(`SELECT count(*) n FROM users WHERE ${w}`))[0].n)])),
  );
  const open = sp.id ? rows.find((r) => String(r.id) === sp.id) : null;
  const statusCls = (u: User) => (["Active", "Trial", "Complimentary", "Admin"].includes(accessLabel(u)) ? "text-win" : accessLabel(u) === "Payment failed" ? "text-loss" : "text-ink-400");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(MEMBER_FILTERS).map((k) => (
          <Link key={k} href={`/admin/members?f=${k}${s ? `&s=${encodeURIComponent(s)}` : ""}`} className={`chip ${k === f ? "!border-court !text-court" : ""}`}>
            {LABELS[k]} {counts[k]}
          </Link>
        ))}
      </div>
      <form className="flex gap-2">
        <input type="hidden" name="f" value={f} />
        <input name="s" defaultValue={s} placeholder="Search email or name" className="w-full max-w-sm rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm" />
        <button className="rounded-lg border border-ink-700 px-3 text-sm">Search</button>
      </form>

      {open && (
        <Card title={open.email} right={<Link href={`/admin/members?f=${f}`}>close ✕</Link>}>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>Status: <b className={statusCls(open)}>{accessLabel(open)}</b></div>
            <div>Joined: {fmtDate(open.created_at, { day: "numeric", month: "short", year: "numeric" })}</div>
            <div>Last login: {open.last_login_at ? fmtDate(open.last_login_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never"}</div>
            <div>Renews/ends: {open.current_period_end ? fmtDate(open.current_period_end, { day: "numeric", month: "short", year: "numeric" }) : "–"}</div>
            <div>Comp until: {open.comp_until ? fmtDate(open.comp_until, { day: "numeric", month: "short", year: "numeric" }) : "–"}</div>
            <div>Source: {[open.signup_meta?.utm, open.signup_meta?.ref, open.signup_meta?.landing].filter(Boolean).join(" · ") || "direct"}</div>
            {open.stripe_customer_id && (
              <div className="sm:col-span-2">
                Stripe:{" "}
                <a className="text-court underline" href={`https://dashboard.stripe.com/customers/${open.stripe_customer_id}`} target="_blank" rel="noreferrer">
                  {open.stripe_customer_id}
                </a>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["comp30", "Give 30 days free"],
              ["comp365", "Give a year free"],
              ["uncomp", "Remove free access"],
              [open.role === "admin" ? "member" : "admin", open.role === "admin" ? "Remove admin" : "Make admin"],
              ["signout", "Sign out everywhere"],
            ].map(([act, label]) => (
              <form key={act} action={memberAction}>
                <input type="hidden" name="id" value={open.id} />
                <input type="hidden" name="act" value={act} />
                <button className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs hover:border-court">{label}</button>
              </form>
            ))}
          </div>
        </Card>
      )}

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                <th className="!text-left">Member</th>
                <th className="!text-left">Status</th>
                <th>Joined</th>
                <th>Last login</th>
                <th className="!text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-sans">
                    <Link href={`/admin/members?f=${f}&id=${u.id}${s ? `&s=${encodeURIComponent(s)}` : ""}`} className="hover:text-court">
                      {u.email}
                    </Link>
                    {u.name && <span className="ml-1 text-[11px] text-ink-500">{u.name}</span>}
                  </td>
                  <td className={`!text-left font-sans text-xs ${statusCls(u)}`}>{accessLabel(u)}</td>
                  <td className="text-xs">{fmtDate(u.created_at, { day: "numeric", month: "short", year: "2-digit" })}</td>
                  <td className="text-xs">{u.last_login_at ? fmtDate(u.last_login_at, { day: "numeric", month: "short" }) : "–"}</td>
                  <td className="!text-left font-sans text-xs text-ink-400">{String(u.signup_meta?.utm || u.signup_meta?.ref || "direct").slice(0, 30)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-4 text-sm text-ink-500">No members here yet.</p>}
        </div>
      </Card>
    </div>
  );
}
