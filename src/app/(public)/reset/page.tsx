import { Alert, AuthCard, btnCls, inputCls, labelCls } from "@/components/public/AuthCard";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="New password" sub="Choose a new password for your account.">
      {error && <Alert>Use at least 8 characters.</Alert>}
      <form action="/api/auth/reset" method="post" className="space-y-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <div>
          <label className={labelCls} htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
        </div>
        <button className={btnCls}>Save and log in</button>
      </form>
    </AuthCard>
  );
}
