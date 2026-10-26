import { TeamLogo } from "@/components/Img";
import type { Side } from "@/sports/model";

/** Team logo when the feed has one, otherwise a badge in the team's colour. */
export function TeamMark({ t, size = 28 }: { t: Pick<Side, "logo" | "abbr" | "color" | "name">; size?: number }) {
  if (t.logo) return <TeamLogo src={t.logo} alt={t.abbr || t.name} size={size} />;
  return (
    <span
      className="display inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-ink-950"
      style={{ width: size, height: size, background: t.color || "#5b6573", fontSize: Math.max(8, size * 0.32) }}
      title={t.name}
    >
      {(t.abbr || t.name).slice(0, 3)}
    </span>
  );
}
