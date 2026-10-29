import { BetSlip } from "@/components/BetSlip";
import { LeagueSwitch } from "@/components/LeagueSwitch";
import { RacingNav } from "@/components/racing/RacingNav";
import { memberShell } from "@/lib/appShell";

export const metadata = { title: "Racing", robots: { index: false, follow: false } };

export default async function RacingLayout({ children }: { children: React.ReactNode }) {
  const { hidden, switchProps } = await memberShell("/racing");
  return (
    <div style={{ ["--accent" as string]: "#c8a24a" }}>
      <LeagueSwitch current="racing" {...switchProps} />
      <RacingNav />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      {!hidden.includes("multi") && <BetSlip />}
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: TAB NZ racing feed (fields, fixed odds, results and dividends). Horse, jockey and trainer form is built in-app from every result we&apos;ve recorded. Times in NZ time. 18+, gamble responsibly — 0800 654 655.
      </footer>
    </div>
  );
}
