// Signed-cookie sessions. Web Crypto only, so the same code verifies sessions in the Edge
// middleware and in Node route handlers.
//
// Token: <uid>.<role>.<version>.<expiry>.<hmac>
//   uid     — numeric user id, or "owner" for the site owner (APP_USERNAME / APP_PASSWORD)
//   role    — "member" | "admin"
//   version — bumped in the database to sign a user out everywhere

export const SESSION_COOKIE = "cs_session";
/** Non-secret hint cookie so static pages (the landing page) can show "Open app". */
export const SIGNED_IN_HINT = "cs_in";
export const SESSION_DAYS = 30;

export interface SessionClaims {
  uid: string;
  role: "member" | "admin";
  ver: number;
}

const enc = new TextEncoder();

function secret(): string | null {
  return process.env.AUTH_SECRET || null;
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  let diff = la ^ lb;
  for (let i = 0; i < Math.max(la, lb); i++) {
    diff |= (a.charCodeAt(i % la || 0) || 0) ^ (b.charCodeAt(i % lb || 0) || 0);
  }
  return diff === 0;
}

export function authConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}

/** The owner login from environment variables — always an admin, works without a database. */
export function checkOwnerCredentials(username: string, password: string): boolean {
  const u = process.env.APP_USERNAME || "";
  const p = process.env.APP_PASSWORD || "";
  if (!u || !p) return false;
  return safeEqual(username.trim().toLowerCase(), u.trim().toLowerCase()) && safeEqual(password, p);
}

export async function createSession(c: SessionClaims): Promise<string> {
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET is not set");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${c.uid}.${c.role}.${c.ver}.${exp}`;
  return `${payload}.${await hmac(payload, key)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionClaims | null> {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [uid, role, ver, exp, sig] = parts;
  if (!Number(exp) || Number(exp) < Date.now()) return null;
  if (role !== "member" && role !== "admin") return null;
  const expected = await hmac(`${uid}.${role}.${ver}.${exp}`, key);
  if (!safeEqual(sig, expected)) return null;
  return { uid, role, ver: Number(ver) || 1 };
}
