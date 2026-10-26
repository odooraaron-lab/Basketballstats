import Link from "next/link";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { LEAGUE_LIST } from "@/leagues/registry";

export const metadata = { title: "Courtside — Cricket" };

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  const options = LEAGUE_LIST.map((l) => ({ id: l.id, shortName: l.shortName, name: l.name, region: l.region, accent: l.accent, tracking: l.features.nbaComTracking }));
  return (
    <div style={{ ["--accent" as string]: "#2fb36d" }}>
      <LeagueSwitch current="cricket" leagues={options} />
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <Link href="/cricket" className="display flex items-center gap-2 text-xl font-extrabold">
            Court<span className="text-court">side</span>
            <span className="rounded bg-[#2fb36d] px-1.5 py-0.5 text-xs font-bold text-ink-950">CRICKET</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            <Link href="/cricket" className="tab">Matches</Link>
            <Link href="/cricket/super-smash" className="tab">Super Smash</Link>
          </nav>
          <form action="/api/logout" method="post">
            <button className="text-xs text-ink-500 hover:text-ink-200" type="submit">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: ESPN public cricket feed (ESPNcricinfo match data). Rates and analysis calculated in-app. Personal use only.
      </footer>
    </div>
  );
}
