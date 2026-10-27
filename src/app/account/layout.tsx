import Link from "next/link";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { viewerShell } from "@/lib/appShell";

export const metadata = { title: "Account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { switchProps, viewer } = await viewerShell("/account");
  return (
    <div>
      {viewer.hasAccess && <LeagueSwitch current="account" {...switchProps} />}
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <Link href={viewer.hasAccess ? "/app" : "/"} className="display text-xl font-extrabold">
            <span>Court<span className="text-court">side</span></span>
          </Link>
          <nav className="flex gap-1">
            <Link href="/account" className="tab">Settings</Link>
            <Link href="/account/billing" className="tab">Membership</Link>
          </nav>
          <form action="/api/auth/logout" method="post" className="ml-auto">
            <button className="text-xs text-ink-500 hover:text-ink-200">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
