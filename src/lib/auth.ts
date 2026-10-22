// Minimal signed-cookie session. Works in both the Edge middleware and Node route handlers
// because it only uses Web Crypto.

export const SESSION_COOKIE = "bs_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function secret(): string | null {
  return process.env.AUTH_SECRET || null;
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
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
  return Boolean(process.env.APP_PASSWORD && process.env.AUTH_SECRET);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.APP_USERNAME || "";
  const p = process.env.APP_PASSWORD || "";
  if (!p) return false;
  const userOk = u ? safeEqual(username.trim().toLowerCase(), u.trim().toLowerCase()) : true;
  return safeEqual(password, p) && userOk;
}

export async function createSession(username: string): Promise<string> {
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET is not set");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${encodeURIComponent(username)}.${exp}`;
  return `${payload}.${await hmac(payload, key)}`;
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [user, exp, sig] = parts;
  if (!Number(exp) || Number(exp) < Date.now()) return false;
  const expected = await hmac(`${user}.${exp}`, key);
  return safeEqual(sig, expected);
}
