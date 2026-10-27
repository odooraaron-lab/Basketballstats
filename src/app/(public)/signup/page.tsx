import Link from "next/link";
import { Alert, AuthCard, btnCls, inputCls, labelCls } from "@/components/public/AuthCard";
import { priceLabel, site } from "@/site.config";

export const metadata = {
  title: "Join",
  description: `Create your ${site.name} account: live stats, betting odds tools and the multi builder for NZ & Australian sport. ${priceLabel}/month, cancel anytime.`,
};

const ERRORS: Record<string, string> = {
  email: "That email doesn't look right.",
  password: "Use a password with at least 8 characters.",
  terms: "Please confirm you're 18 or over and accept the terms.",
  exists: "There's already an account with that email — log in instead.",
  config: "Sign-ups aren't switched on yet (the database isn't connected).",
  server: "Something went wrong creating your account. Please try again.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; name?: string }> }) {
  const { error, email, name } = await searchParams;
  return (
    <AuthCard title="Join Quick Read" sub={<>Every sport, every stat, every tool — {priceLabel}/month. Cancel anytime.</>}>
      {error && <Alert>{ERRORS[error] ?? ERRORS.server}</Alert>}
      <form action="/api/auth/signup" method="post" className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="name">First name</label>
          <input id="name" name="name" autoComplete="given-name" defaultValue={name} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          <p className="mt-1 text-[11px] text-ink-500">At least 8 characters.</p>
        </div>
        <label className="flex items-start gap-2 text-xs text-ink-300">
          <input type="checkbox" name="adult" required className="mt-0.5 accent-[#f26b1d]" /> I&apos;m 18 or older.
        </label>
        <label className="flex items-start gap-2 text-xs text-ink-300">
          <input type="checkbox" name="terms" required className="mt-0.5 accent-[#f26b1d]" />
          <span>
            I accept the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
          </span>
        </label>
        <button className={btnCls}>Create account</button>
        <p className="text-center text-[11px] text-ink-500">Next step: secure payment with Stripe. {site.trialDays ? `${site.trialDays}-day free trial.` : ""}</p>
      </form>
      <p className="mt-4 text-center text-sm text-ink-400">
        Already a member? <Link href="/login" className="text-court">Log in</Link>
      </p>
    </AuthCard>
  );
}
