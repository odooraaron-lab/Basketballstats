import Link from "next/link";
import { fmt } from "@/lib/format";
import { COL_LABELS, TRACKING_LABELS, isPctCol, n, nbaHeadshot, type Rec } from "@/lib/nbacom";
import type { ContestRow, PlayTypeRow, PlayerTracking, TeamTracking } from "@/lib/tracking";
import { Headshot } from "./Img";
import { SortableTable } from "./SortableTable";
import { playerRows, toColumns } from "./nbaTable";
import { Card, Empty, Stat } from "./ui";

const v = (r: Rec | null | undefined, k: string) => {
  const x = n(r?.[k]);
  if (x == null) return "–";
  return isPctCol(k) && Math.abs(x) <= 1.5 ? fmt(x, "pct") : Number.isInteger(x) ? String(x) : fmt(x, Math.abs(x) < 10 ? "2" : "1");
};

const TRACK_KEYS: Record<string, string[]> = {
  SpeedDistance: ["DIST_MILES", "DIST_MILES_OFF", "DIST_MILES_DEF", "AVG_SPEED", "AVG_SPEED_OFF", "AVG_SPEED_DEF"],
  Possessions: ["TOUCHES", "FRONT_CT_TOUCHES", "TIME_OF_POSS", "AVG_SEC_PER_TOUCH", "AVG_DRIB_PER_TOUCH", "PTS_PER_TOUCH"],
  Drives: ["DRIVES", "DRIVE_PTS", "DRIVE_FG_PCT", "DRIVE_AST", "DRIVE_PASSES_PCT", "DRIVE_TOV"],
  CatchShoot: ["CATCH_SHOOT_FGA", "CATCH_SHOOT_PTS", "CATCH_SHOOT_FG_PCT", "CATCH_SHOOT_FG3A", "CATCH_SHOOT_FG3_PCT", "CATCH_SHOOT_EFG_PCT"],
  PullUpShot: ["PULL_UP_FGA", "PULL_UP_PTS", "PULL_UP_FG_PCT", "PULL_UP_FG3A", "PULL_UP_FG3_PCT", "PULL_UP_EFG_PCT"],
  Passing: ["PASSES_MADE", "PASSES_RECEIVED", "POTENTIAL_AST", "AST_POINTS_CREATED", "SECONDARY_AST", "AST_TO_PASS_PCT"],
  Rebounding: ["REB_CHANCES", "REB_CONTEST", "REB_CHANCE_PCT", "OREB_CHANCES", "DREB_CHANCES", "AVG_REB_DIST"],
  Defense: ["DEF_RIM_FGA", "DEF_RIM_FGM", "DEF_RIM_FG_PCT", "STL", "BLK", "DREB"],
  PaintTouch: ["PAINT_TOUCHES", "PAINT_TOUCH_PTS", "PAINT_TOUCH_FG_PCT", "PAINT_TOUCH_PASSES_PCT", "PAINT_TOUCH_TOV"],
  PostTouch: ["POST_TOUCHES", "POST_TOUCH_PTS", "POST_TOUCH_FG_PCT", "POST_TOUCH_PASSES_PCT", "POST_TOUCH_TOV"],
  ElbowTouch: ["ELBOW_TOUCHES", "ELBOW_TOUCH_PTS", "ELBOW_TOUCH_FG_PCT", "ELBOW_TOUCH_PASSES_PCT", "ELBOW_TOUCH_TOV"],
  Efficiency: ["DRIVE_PTS", "CATCH_SHOOT_PTS", "PULL_UP_PTS", "PAINT_TOUCH_PTS", "POST_TOUCH_PTS", "ELBOW_TOUCH_PTS", "EFF_FG_PCT"],
};

function keysFor(type: string, r: Rec) {
  const pref = (TRACK_KEYS[type] ?? []).filter((k) => k in r);
  if (pref.length) return pref;
  return Object.keys(r).filter((k) => typeof r[k] === "number" && !/_ID$|^GP$|^W$|^L$|^MIN$/.test(k)).slice(0, 6);
}

export function TrackingGrid({ tracking }: { tracking: Record<string, Rec> }) {
  const types = Object.keys(TRACKING_LABELS).filter((t) => tracking[t]);
  if (!types.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {types.map((t) => (
        <Card key={t} title={TRACKING_LABELS[t]} right="per game">
          <div className="grid grid-cols-3 gap-2">
            {keysFor(t, tracking[t]).map((k) => (
              <div key={k} className="rounded-md bg-ink-950/60 px-2 py-1.5">
                <div className="display truncate text-[10px] text-ink-500" title={k}>
                  {COL_LABELS[k] ?? k.replace(/_/g, " ")}
                </div>
                <div className="num text-sm font-semibold">{v(tracking[t], k)}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PlayTypeTable({ rows, side, ranked }: { rows: (PlayTypeRow & { rank?: number | null; of?: number })[]; side: "off" | "def"; ranked?: boolean }) {
  if (!rows.length) return <Empty>No play-type data.</Empty>;
  return (
    <div className="overflow-x-auto">
    <table className="stat-table">
      <thead>
        <tr>
          <th>Play type</th>
          <th>POSS</th>
          <th>FREQ</th>
          <th>PPP</th>
          <th className="!text-left">PERCENTILE</th>
          {ranked && <th>RANK</th>}
          <th>FG%</th>
          <th>eFG%</th>
          <th>TOV%</th>
          <th>SCORE%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const p = r.pctile ?? 0;
          const good = side === "off" ? p : p; // NBA.com percentile is already oriented so higher = better
          return (
            <tr key={r.type}>
              <td className="font-sans">{r.label}</td>
              <td>{fmt(r.poss, "int")}</td>
              <td>{fmt(r.freq, "pct")}</td>
              <td className="font-semibold !text-ink-100">{fmt(r.ppp, "2")}</td>
              <td className="!text-left">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-800">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${good * 100}%`, background: good >= 0.66 ? "#3fb57a" : good >= 0.33 ? "#f8a26b" : "#e25c5c" }}
                    />
                  </span>
                  <span className="num text-xs">{fmt(r.pctile, "pct0")}</span>
                </span>
              </td>
              {ranked && <td>{r.rank ? `${r.rank}/${r.of}` : "–"}</td>}
              <td>{fmt(r.fg, "pct")}</td>
              <td>{fmt(r.efg, "pct")}</td>
              <td>{fmt(r.tov, "pct")}</td>
              <td>{fmt(r.score, "pct")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export function ContestBars({ rows }: { rows: ContestRow[] }) {
  if (!rows.length) return <Empty>No shot-contest data.</Empty>;
  const colors = ["#e25c5c", "#f8a26b", "#8fb6e0", "#3fb57a"];
  return (
    <div>
      <div className="mb-3 flex h-3 overflow-hidden rounded-full">
        {rows.map((r, i) => (
          <span key={r.range} style={{ width: `${(r.freq ?? 0) * 100}%`, background: colors[i] }} title={`${r.label}: ${fmt(r.freq, "pct0")}`} />
        ))}
      </div>
      <div className="overflow-x-auto">
      <table className="stat-table">
        <thead>
          <tr>
            <th>Closest defender</th>
            <th>FREQ</th>
            <th>FGA</th>
            <th>FG%</th>
            <th>eFG%</th>
            <th>3PA</th>
            <th>3P%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.range}>
              <td className="font-sans">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colors[i] }} />
                {r.label}
              </td>
              <td>{fmt(r.freq, "pct0")}</td>
              <td>{fmt(r.fga, "1")}</td>
              <td>{fmt(r.fgPct, "pct")}</td>
              <td className="font-semibold !text-ink-100">{fmt(r.efg, "pct")}</td>
              <td>{fmt(r.fg3a, "1")}</td>
              <td>{fmt(r.fg3Pct, "pct")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function MatchupList({ title, rows, nameKey, idKey, league }: { title: string; rows: Rec[]; nameKey: string; idKey: string; league: string }) {
  return (
    <Card title={title} right="Partial possessions · NBA.com matchups" pad={false}>
      {rows.length ? (
        <ul>
          {rows.map((r, i) => {
            const pts = n(r.PLAYER_PTS) ?? 0;
            const poss = n(r.PARTIAL_POSS) ?? 0;
            return (
              <li key={i} className="flex items-center gap-3 border-t border-ink-850 px-4 py-2 text-sm first:border-t-0">
                <Headshot src={nbaHeadshot(r[idKey] as number)} name={String(r[nameKey])} size={30} />
                <Link href={`/${league}/go?player=${encodeURIComponent(String(r[nameKey]))}`} className="min-w-0 flex-1 truncate hover:text-court">
                  {String(r[nameKey])}
                </Link>
                <span className="num text-xs text-ink-400">{fmt(poss, "1")} poss</span>
                <span className="num w-14 text-right text-xs text-ink-300">{pts} pts</span>
                <span className="num w-16 text-right text-xs text-ink-400">
                  {r.MATCHUP_FGM ?? 0}-{r.MATCHUP_FGA ?? 0}
                </span>
                <span className="num w-16 text-right text-xs font-semibold">{poss ? fmt((100 * pts) / poss, "1") : "–"}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-4">
          <Empty>No matchups with 15+ possessions.</Empty>
        </div>
      )}
    </Card>
  );
}

export function PlayerTrackingPanel({ t, league, season }: { t: PlayerTracking; league: string; season: string }) {
  if (!t.found)
    return <Empty>Couldn&apos;t match this player in the NBA.com data for {season}. They may not have played yet this season.</Empty>;
  const a = t.adv;
  const h = t.hustle;
  const defendRows = Object.entries(t.defend);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Off rating" value={v(a, "OFF_RATING")} sub="Official, on court" />
        <Stat label="Def rating" value={v(a, "DEF_RATING")} />
        <Stat label="Net rating" value={v(a, "NET_RATING")} tone={(n(a?.NET_RATING) ?? 0) >= 0 ? "win" : "loss"} />
        <Stat label="USG%" value={v(a, "USG_PCT")} />
        <Stat label="TS%" value={v(a, "TS_PCT")} />
        <Stat label="PIE" value={v(a, "PIE")} sub="Player impact estimate" tone="accent" />
        <Stat label="AST%" value={v(a, "AST_PCT")} sub={`AST/TO ${v(a, "AST_TO")}`} />
        <Stat label="REB%" value={v(a, "REB_PCT")} sub={`O ${v(a, "OREB_PCT")} · D ${v(a, "DREB_PCT")}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Hustle" right="per game">
          {h ? (
            <div className="grid grid-cols-3 gap-2">
              {["CONTESTED_SHOTS", "CONTESTED_SHOTS_3PT", "DEFLECTIONS", "CHARGES_DRAWN", "SCREEN_ASSISTS", "SCREEN_AST_PTS", "LOOSE_BALLS_RECOVERED", "BOX_OUTS", "BOX_OUT_PLAYER_REBS"].map((k) => (
                <div key={k} className="rounded-md bg-ink-950/60 px-2 py-1.5">
                  <div className="display text-[10px] text-ink-500">{COL_LABELS[k] ?? k}</div>
                  <div className="num text-base font-semibold">{v(h, k)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No hustle data.</Empty>
          )}
        </Card>
        <Card title="Shot contest level" right="How tightly his shots were defended">
          <ContestBars rows={t.contests} />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Play types — offense" right="Synergy · PPP = points per possession" pad={false}>
          <PlayTypeTable rows={t.playOff} side="off" />
        </Card>
        <Card title="Play types — defense" right="Points allowed per possession" pad={false}>
          <PlayTypeTable rows={t.playDef} side="def" />
        </Card>
      </div>

      <div>
        <h2 className="display mb-3 text-lg font-bold">Player tracking</h2>
        <TrackingGrid tracking={t.tracking} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MatchupList title="Guarded most by" rows={t.guardedBy} nameKey="DEF_PLAYER_NAME" idKey="DEF_PLAYER_ID" league={league} />
        <MatchupList title="Guarded most" rows={t.guarded} nameKey="OFF_PLAYER_NAME" idKey="OFF_PLAYER_ID" league={league} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Defense as closest defender" right="Opponent FG% vs their normal" pad={false}>
          {defendRows.length ? (
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Shots</th>
                  <th>D FGA</th>
                  <th>D FG%</th>
                  <th>NORMAL</th>
                  <th>DIFF</th>
                </tr>
              </thead>
              <tbody>
                {defendRows.map(([cat, r]) => {
                  const keys = Object.keys(r);
                  const fga = keys.find((k) => /^(D_FGA|FGA_LT_\d+|FGA_GT_\d+|FG3A|FG2A)$/.test(k));
                  const pct = keys.find((k) => /^(D_FG_PCT|LT_\d+_PCT|GT_\d+_PCT|FG3_PCT|FG2_PCT)$/.test(k));
                  const norm = keys.find((k) => /^(NORMAL_FG_PCT|NS_.*PCT)$/.test(k));
                  const diff = keys.find((k) => /^(PCT_PLUSMINUS|PLUSMINUS)$/.test(k));
                  const dv = diff ? n(r[diff]) : null;
                  return (
                    <tr key={cat}>
                      <td className="font-sans">{cat}</td>
                      <td>{fga ? v(r, fga) : "–"}</td>
                      <td>{pct ? v(r, pct) : "–"}</td>
                      <td>{norm ? v(r, norm) : "–"}</td>
                      <td className={dv != null ? (dv <= 0 ? "!text-win" : "!text-loss") : ""}>{dv != null ? fmt(dv * 100, "signed1") : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-4">
              <Empty>No defensive tracking data.</Empty>
            </div>
          )}
        </Card>
        <Card title="Season shot zones (official)" pad={false}>
          {t.zones.length ? (
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>FGM</th>
                  <th>FGA</th>
                  <th>FG%</th>
                </tr>
              </thead>
              <tbody>
                {t.zones.map((z) => (
                  <tr key={z.zone}>
                    <td className="font-sans">{z.zone}</td>
                    <td>{fmt(z.fgm, "1")}</td>
                    <td>{fmt(z.fga, "1")}</td>
                    <td>{z.pct != null ? fmt(z.pct, "pct") : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4">
              <Empty>No zone data.</Empty>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Scoring breakdown" right="per game">
          <div className="grid grid-cols-3 gap-2">
            {[
              [t.misc, "PTS_PAINT"],
              [t.misc, "PTS_FB"],
              [t.misc, "PTS_2ND_CHANCE"],
              [t.misc, "PTS_OFF_TOV"],
              [t.scoring, "PCT_AST_FGM"],
              [t.scoring, "PCT_UAST_FGM"],
              [t.scoring, "PCT_PTS_3PT"],
              [t.scoring, "PCT_PTS_PAINT"],
              [t.scoring, "PCT_PTS_FT"],
            ].map(([r, k]) => (
              <div key={k as string} className="rounded-md bg-ink-950/60 px-2 py-1.5">
                <div className="display text-[10px] text-ink-500">{COL_LABELS[k as string] ?? k}</div>
                <div className="num text-base font-semibold">{v(r as Rec | null, k as string)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Clutch (official)" right="Last 5 min, within 5 · per game">
          {t.clutch ? (
            <div className="grid grid-cols-4 gap-2">
              {["GP", "MIN", "PTS", "FG_PCT", "FG3_PCT", "FT_PCT", "AST", "TOV", "REB", "STL", "BLK", "PLUS_MINUS"].map((k) => (
                <div key={k} className="rounded-md bg-ink-950/60 px-2 py-1.5">
                  <div className="display text-[10px] text-ink-500">{COL_LABELS[k] ?? k}</div>
                  <div className="num text-base font-semibold">{v(t.clutch, k)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No clutch minutes yet.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}

export function TeamTrackingPanel({ t, league }: { t: TeamTracking; league: string }) {
  const a = t.adv;
  const ord = (x: number | null) => (x ? `#${x}` : "");
  const hustleKeys = ["CONTESTED_SHOTS", "DEFLECTIONS", "CHARGES_DRAWN", "SCREEN_ASSISTS", "SCREEN_AST_PTS", "LOOSE_BALLS_RECOVERED", "BOX_OUTS"];
  return (
    <div className="space-y-5">
      {!a && <Empty>Couldn&apos;t match this team in the NBA.com data.</Empty>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Off rating" value={v(a, "OFF_RATING")} sub={ord(t.ranks.off)} />
        <Stat label="Def rating" value={v(a, "DEF_RATING")} sub={ord(t.ranks.def)} />
        <Stat label="Net rating" value={v(a, "NET_RATING")} sub={ord(t.ranks.net)} tone={(n(a?.NET_RATING) ?? 0) >= 0 ? "win" : "loss"} />
        <Stat label="Pace" value={v(a, "PACE")} sub={ord(t.ranks.pace)} />
        <Stat label="TS%" value={v(a, "TS_PCT")} />
        <Stat label="Opp eFG%" value={t.opp ? fmt(((n(t.opp.OPP_FGM) ?? 0) + 0.5 * (n(t.opp.OPP_FG3M) ?? 0)) / (n(t.opp.OPP_FGA) || 1), "pct") : "–"} sub="Allowed" />
        <Stat label="Opp PTS" value={v(t.opp, "OPP_PTS")} sub="per game" />
        <Stat label="PIE" value={v(a, "PIE")} tone="accent" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Play types — offense" right="PPP rank across the league" pad={false}>
          <PlayTypeTable rows={t.playOff} side="off" ranked />
        </Card>
        <Card title="Play types — defense" right="PPP allowed · rank 1 = stingiest" pad={false}>
          <PlayTypeTable rows={t.playDef} side="def" ranked />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Hustle" right={`per game · deflections ${ord(t.ranks.deflections)} · contests ${ord(t.ranks.contests)}`}>
          {t.hustle ? (
            <div className="grid grid-cols-4 gap-2">
              {hustleKeys.map((k) => (
                <div key={k} className="rounded-md bg-ink-950/60 px-2 py-1.5">
                  <div className="display text-[10px] text-ink-500">{COL_LABELS[k] ?? k}</div>
                  <div className="num text-base font-semibold">{v(t.hustle, k)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No hustle data.</Empty>
          )}
        </Card>
        <Card title="Shot contest profile" right="How tightly their shots were defended">
          <ContestBars rows={t.contests} />
        </Card>
      </div>

      <Card title="Official 5-man lineups" right="Season totals · most minutes first" pad={false}>
        {t.lineups.length ? (
          <SortableTable
            leadLabel="Lineup"
            defaultSort={{ key: "MIN", dir: "desc" }}
            columns={toColumns(
              ["PTS", "PLUS_MINUS", "OFF_RATING", "DEF_RATING", "NET_RATING", "PACE", "TS_PCT", "EFG_PCT", "TM_TOV_PCT", "OREB_PCT"].map((key) => ({
                key,
                signed: key === "PLUS_MINUS" || key === "NET_RATING",
                invert: key === "DEF_RATING" || key === "TM_TOV_PCT",
              })),
              ["GP", "MIN"],
            )}
            rows={t.lineups.map((r) => ({
              key: String(r.GROUP_ID),
              lead: { label: String(r.GROUP_NAME ?? "").replace(/ - /g, ", ") },
              cells: Object.fromEntries(
                ["GP", "MIN", "PTS", "PLUS_MINUS", "OFF_RATING", "DEF_RATING", "NET_RATING", "PACE", "TS_PCT", "EFG_PCT", "TM_TOV_PCT", "OREB_PCT"].map((k) => {
                  const x = n(r[k]);
                  return [k, x != null && /_PCT$/.test(k) && Math.abs(x) <= 1.5 ? x * 100 : x];
                }),
              ),
            }))}
          />
        ) : (
          <div className="p-4">
            <Empty>No lineup data (lineups need 10+ minutes together).</Empty>
          </div>
        )}
      </Card>

      {t.hustlePlayers.length > 0 && (
        <Card title="Player hustle" right="per game" pad={false}>
          <SortableTable
            defaultSort={{ key: "DEFLECTIONS", dir: "desc" }}
            columns={toColumns(hustleKeys.map((key) => ({ key })), ["G", "MIN"])}
            rows={playerRows(league, t.hustlePlayers, ["G", "MIN", ...hustleKeys])}
          />
        </Card>
      )}

      <div>
        <h2 className="display mb-3 text-lg font-bold">Team tracking</h2>
        <TrackingGrid tracking={t.tracking} />
      </div>
    </div>
  );
}
