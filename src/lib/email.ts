import "server-only";
import { site } from "@/site.config";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/** Sends through Resend's HTTP API. Returns false (never throws) when not configured or on failure. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, reply_to: site.supportEmail }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const emailShell = (title: string, body: string) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#11151a">
  <div style="font-size:22px;font-weight:800;margin-bottom:16px">${site.name}</div>
  <h1 style="font-size:18px">${title}</h1>
  ${body}
  <p style="color:#5b6573;font-size:12px;margin-top:32px">${site.name} · ${site.url}<br>18+ only. Gamble responsibly — Gambling Helpline NZ 0800 654 655 · Gambling Help Online (AU) 1800 858 858.</p>
</div>`;
