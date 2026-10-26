import { notFound } from "next/navigation";
import { BetSlip } from "@/components/BetSlip";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { SportNav } from "@/components/sport/SportNav";
import { LEAGUE_LIST } from "@/leagues/registry";
import { getComp } from "@/sports/comps";

export async function generateMetadata({ params }: { params: Promise<{ comp: string }> }) {
  const c = getComp((await params).comp);
  return { title: c ? `Courtside — ${c.short}` : "Courtside" };
}

export default async function SportLayout({ children, params }: { children: React.ReactNode; params: Promise<{ comp: string }> }) {
  const comp = getComp((await params).comp);
  if (!comp) notFound();
  const options = LEAGUE_LIST.map((l) => ({ id: l.id, shortName: l.shortName, name: l.name, region: l.region, accent: l.accent, tracking: l.features.nbaComTracking }));
  const switchId = comp.id === "a-league-w" ? "a-league" : comp.id;
  const source = comp.source.kind === "cd" ? "Champion Data match centre (official stats)" : "ESPN public feeds";
  return (
    <div style={{ ["--accent" as string]: comp.accent }}>
      <LeagueSwitch current={switchId} leagues={options} />
      <SportNav comp={comp.id} short={comp.short} accent={comp.accent} siblings={comp.siblings} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <BetSlip />
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: {source}. Times in NZ time. Projections and chances are calculated in-app from this season&apos;s results. Personal use only.
      </footer>
    </div>
  );
}
