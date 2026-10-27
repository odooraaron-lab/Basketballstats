import "server-only";
import { q, q1 } from "./db";
import type { Prefs } from "./areas";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "member" | "admin";
  created_at: string;
  last_login_at: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  sub_status: string; // none | trialing | active | past_due | canceled | incomplete | unpaid
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  comp_until: string | null;
  prefs: Prefs;
  signup_meta: Record<string, unknown>;
  session_version: number;
  password_hash: string;
}

export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200;

export async function findUserByEmail(email: string) {
  return q1<User>(`SELECT * FROM users WHERE email = $1`, [normEmail(email)]);
}
export async function getUser(id: number) {
  return q1<User>(`SELECT * FROM users WHERE id = $1`, [id]);
}

export async function createUser(email: string, passwordHash: string, name: string, meta: Record<string, unknown>) {
  return q1<User>(
    `INSERT INTO users (email, password_hash, name, signup_meta) VALUES ($1, $2, $3, $4) RETURNING *`,
    [normEmail(email), passwordHash, name.trim().slice(0, 80), JSON.stringify(meta)],
  );
}

const GRACE_MS = 3 * 86400_000; // card retries: keep access a few days while Stripe tries again

/** Paid (or comped, or admin) right now? */
export function hasAccess(u: Pick<User, "role" | "sub_status" | "current_period_end" | "comp_until"> | null): boolean {
  if (!u) return false;
  if (u.role === "admin") return true;
  const now = Date.now();
  if (u.comp_until && Date.parse(u.comp_until) > now) return true;
  const end = u.current_period_end ? Date.parse(u.current_period_end) : 0;
  if (u.sub_status === "active" || u.sub_status === "trialing") return !end || end + 86400_000 > now;
  if (u.sub_status === "past_due") return end + GRACE_MS > now;
  return false;
}

export function accessLabel(u: User): string {
  if (u.role === "admin") return "Admin";
  if (u.comp_until && Date.parse(u.comp_until) > Date.now()) return "Complimentary";
  switch (u.sub_status) {
    case "active":
      return u.cancel_at_period_end ? "Cancelling" : "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment failed";
    case "canceled":
      return "Cancelled";
    case "incomplete":
    case "incomplete_expired":
      return "Checkout not finished";
    default:
      return "No subscription";
  }
}

export async function savePrefs(id: number, prefs: Prefs) {
  await q(`UPDATE users SET prefs = $2 WHERE id = $1`, [id, JSON.stringify(prefs)]);
}
