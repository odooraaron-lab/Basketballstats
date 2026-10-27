import "server-only";
import { q, q1 } from "./db";
import { site } from "@/site.config";

const ACTIVE_SQL = `(role = 'admin' OR (comp_until IS NOT NULL AND comp_until > now()) OR (sub_status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now() - interval '1 day')))`;
const PAYING_SQL = `(sub_status = 'active' AND (current_period_end IS NULL OR current_period_end > now() - interval '1 day') AND role <> 'admin')`;

export async function overview() {
  const n = async (sql: string, params: unknown[] = []) => Number((await q1<{ n: string }>(sql, params))?.n ?? 0);
  const [visitors7, visitors30, views30, signups7, signups30, usersTotal, active, paying, trials, pastDue, cancelling, comped, subscribed30, cancelled30, checkout30, failed30] = await Promise.all([
    n(`SELECT count(DISTINCT visitor) n FROM page_views WHERE at > now() - interval '7 days'`),
    n(`SELECT count(DISTINCT visitor) n FROM page_views WHERE at > now() - interval '30 days'`),
    n(`SELECT count(*) n FROM page_views WHERE at > now() - interval '30 days'`),
    n(`SELECT count(*) n FROM users WHERE created_at > now() - interval '7 days'`),
    n(`SELECT count(*) n FROM users WHERE created_at > now() - interval '30 days'`),
    n(`SELECT count(*) n FROM users`),
    n(`SELECT count(*) n FROM users WHERE ${ACTIVE_SQL}`),
    n(`SELECT count(*) n FROM users WHERE ${PAYING_SQL}`),
    n(`SELECT count(*) n FROM users WHERE sub_status = 'trialing'`),
    n(`SELECT count(*) n FROM users WHERE sub_status = 'past_due'`),
    n(`SELECT count(*) n FROM users WHERE ${PAYING_SQL} AND cancel_at_period_end`),
    n(`SELECT count(*) n FROM users WHERE comp_until > now()`),
    n(`SELECT count(DISTINCT user_id) n FROM events WHERE type = 'subscribed' AND at > now() - interval '30 days'`),
    n(`SELECT count(DISTINCT user_id) n FROM events WHERE type = 'cancelled' AND at > now() - interval '30 days'`),
    n(`SELECT count(DISTINCT user_id) n FROM events WHERE type = 'checkout_started' AND at > now() - interval '30 days'`),
    n(`SELECT count(*) n FROM events WHERE type = 'payment_failed' AND at > now() - interval '30 days'`),
  ]);
  const mrr = paying * site.price.amount;
  return { visitors7, visitors30, views30, signups7, signups30, usersTotal, active, paying, trials, pastDue, cancelling, comped, subscribed30, cancelled30, checkout30, failed30, mrr };
}

export async function daily(days = 30) {
  const rows = await q<{ d: string; visitors: string; signups: string; subs: string }>(
    `WITH d AS (SELECT generate_series((now() AT TIME ZONE 'Pacific/Auckland')::date - ($1::int - 1), (now() AT TIME ZONE 'Pacific/Auckland')::date, '1 day')::date AS d)
     SELECT to_char(d.d, 'YYYY-MM-DD') d,
       (SELECT count(DISTINCT visitor) FROM page_views p WHERE (p.at AT TIME ZONE 'Pacific/Auckland')::date = d.d) visitors,
       (SELECT count(*) FROM users u WHERE (u.created_at AT TIME ZONE 'Pacific/Auckland')::date = d.d) signups,
       (SELECT count(*) FROM events e WHERE e.type = 'subscribed' AND (e.at AT TIME ZONE 'Pacific/Auckland')::date = d.d) subs
     FROM d ORDER BY d.d`,
    [days],
  );
  return rows.map((r) => ({ d: r.d, visitors: Number(r.visitors), signups: Number(r.signups), subs: Number(r.subs) }));
}

export async function topList(kind: "pages" | "referrers" | "sources" | "countries" | "devices" | "areas", days = 30) {
  const col = { pages: "path", referrers: "referrer", sources: "utm_source", countries: "country", devices: "device", areas: "split_part(path, '/', 2) || CASE WHEN path LIKE '/sport/%' THEN '/' || split_part(path, '/', 3) ELSE '' END" }[kind];
  const where = kind === "pages" ? `AND user_id IS NULL AND path NOT LIKE '/account%' AND path NOT LIKE '/admin%'` : kind === "areas" ? `AND user_id IS NOT NULL AND path NOT LIKE '/account%' AND path NOT LIKE '/admin%'` : `AND ${col} <> ''`;
  const rows = await q<{ k: string; n: string; v: string }>(
    `SELECT ${col} k, count(*) n, count(DISTINCT visitor) v FROM page_views WHERE at > now() - ($1::int * interval '1 day') ${where} GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    [days],
  );
  return rows.map((r) => ({ k: r.k || "(direct)", n: Number(r.n), v: Number(r.v) }));
}

export async function recentEvents(limit = 25) {
  return q<{ at: string; type: string; email: string | null; meta: Record<string, unknown> }>(
    `SELECT e.at, e.type, u.email, e.meta FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE e.type <> 'login' ORDER BY e.at DESC LIMIT $1`,
    [limit],
  );
}

export const MEMBER_FILTERS: Record<string, string> = {
  all: "TRUE",
  active: ACTIVE_SQL,
  paying: PAYING_SQL,
  trial: "sub_status = 'trialing'",
  none: "sub_status IN ('none','incomplete','incomplete_expired') AND (comp_until IS NULL OR comp_until < now()) AND role <> 'admin'",
  cancelled: "sub_status = 'canceled' OR cancel_at_period_end",
  past_due: "sub_status = 'past_due'",
  comp: "comp_until > now()",
};
