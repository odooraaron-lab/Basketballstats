import { notFound } from "next/navigation";
import { BetSlip } from "@/components/BetSlip";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { SportNav } from "@/components/sport/SportNav";
import { memberShell } from "@/lib/appShell";
import { getComp } from "@/sports/comps";

export async function generateMetadata({ params }: { params: Promise<{ comp: string }> }) {
  const c = getComp((await params).comp);
  return { title: c ? c.short : "Stats", robots: { index: false, follow: false } };
}

export default async function SportLayout({ children, params }: { children: React.ReactNode; params: Promise<{ comp: string }> }) {
  const comp = getComp((await params).comp);
  if (!comp) notFound();
  const { hidden, switchProps } = await memberShell(`/sport/${comp.id}`);
  const switchId = comp.id === "a-league-w" ? "a-league" : comp.id;
  const source = comp.source.kind === "cd" ? "Champion Data match centre (official stats)" : "ESPN public feeds";
  return (
    <div style={{ ["--accent" as string]: comp.accent }}>
      <LeagueSwitch current={switchId} {...switchProps} />
      <SportNav comp={comp.id} short={comp.short} accent={comp.accent} siblings={comp.siblings} team={Boolean(comp.team)} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      {!hidden.includes("multi") && <BetSlip />}
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: {source}. Times in NZ time. {comp.team ? "Projections and chances are calculated in-app from every international this year and last." : "Projections and chances are calculated in-app from this season\u2019s results."}
      </footer>
    </div>
  );
}
