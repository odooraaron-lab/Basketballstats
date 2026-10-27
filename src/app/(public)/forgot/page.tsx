import Link from "next/link";
import { Alert, AuthCard, btnCls, inputCls, labelCls } from "@/components/public/AuthCard";

export const metadata = { title: "Reset password", robots: { index: false } };

export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string; expired?: string }> }) {
  const { sent, expired } = await searchParams;
  return (
    <AuthCard title="Reset password" sub="We'll email you a link to set a new one.">
      {sent && <Alert tone="ok">If that email has an account, a reset link is on its way. It works for one hour.</Alert>}
      {expired && <Alert>That reset link has expired or was already used. Ask for a new one.</Alert>}
      <form action="/api/auth/forgot" method="post" className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
        </div>
        <button className={btnCls}>Send reset link</button>
      </form>
      <p className="mt-4 text-center text-sm"><Link href="/login" className="text-ink-400 hover:text-court">Back to log in</Link></p>
    </AuthCard>
  );
}
