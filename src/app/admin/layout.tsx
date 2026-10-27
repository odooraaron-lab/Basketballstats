import Link from "next/link";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { viewerShell } from "@/lib/appShell";
import { requireAdmin } from "@/lib/session";
import { AdminTabs } from "./AdminTabs";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { switchProps } = await viewerShell("/admin");
  return (
    <div>
      <LeagueSwitch current="admin" {...switchProps} />
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <Link href="/admin" className="display text-xl font-extrabold">
            <span>Quick <span className="text-court">Read</span></span> <span className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-300">ADMIN</span>
          </Link>
          <AdminTabs />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
