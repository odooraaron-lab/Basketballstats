import Link from "next/link";
import { Alert, AuthCard, btnCls, inputCls, labelCls } from "@/components/public/AuthCard";

export const metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; email?: string }> }) {
  const { error, next, email } = await searchParams;
  return (
    <AuthCard title="Log in" sub="Welcome back. Your stats are waiting.">
      {error === "1" && <Alert>Wrong email or password.</Alert>}
      {error === "config" && <Alert tone="info">Logins aren&apos;t configured yet — set AUTH_SECRET (and DATABASE_URL for member accounts).</Alert>}
      <form action="/api/auth/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" name="email" type="text" inputMode="email" autoComplete="username" required defaultValue={email} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
        </div>
        <button className={btnCls}>Log in</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot" className="text-ink-400 hover:text-court">Forgot password?</Link>
        <Link href="/signup" className="text-court hover:text-court-soft">Create an account</Link>
      </div>
    </AuthCard>
  );
}
