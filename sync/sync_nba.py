#!/usr/bin/env python3
"""
Pull official NBA.com tracking data with nba_api and save compact JSON into data/nba/.

stats.nba.com blocks cloud servers (Vercel, Heroku, AWS...), so run this from your own
computer. The app reads the JSON files that this script writes.

    pip install -r sync/requirements.txt
    python sync/sync_nba.py                     # current season, regular season
    python sync/sync_nba.py --season 2025-26    # a past season
    python sync/sync_nba.py --playoffs          # playoffs instead
    python sync/sync_nba.py --push              # commit + push data so Vercel redeploys
    python sync/sync_nba.py --only hustle_player,synergy_player_off
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Callable

try:
    from nba_api.stats import endpoints as E
    from nba_api.stats.library.parameters import Season
except ImportError:  # pragma: no cover
    sys.exit("nba_api is not installed. Run: pip install -r sync/requirements.txt")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "nba"
DELAY = 0.8  # seconds between requests — be polite to NBA.com
TIMEOUT = 60

DROP_SUFFIXES = ("_RANK",)
DROP_COLS = {"CFID", "CFPARAMS", "NBA_FANTASY_PTS", "WNBA_FANTASY_PTS", "AVAILABLE_FLAG"}

TRACKING_TYPES = [
    "SpeedDistance", "Drives", "CatchShoot", "PullUpShot", "Passing", "Rebounding",
    "Possessions", "PaintTouch", "PostTouch", "ElbowTouch", "Defense", "Efficiency",
]
CONTEST_RANGES = ["0-2 Feet - Very Tight", "2-4 Feet - Tight", "4-6 Feet - Open", "6+ Feet - Wide Open"]
PLAY_TYPES = [
    "Isolation", "Transition", "PRBallHandler", "PRRollman", "Postup", "Spotup",
    "Handoff", "Cut", "OffScreen", "OffRebound", "Misc",
]
DEFENSE_CATEGORIES = ["Overall", "3 Pointers", "2 Pointers", "Less Than 6Ft", "Less Than 10Ft", "Greater Than 15Ft"]


# ----------------------------------------------------------------------------- helpers

def _clean_value(v: Any) -> Any:
    if isinstance(v, float):
        return round(v, 4)
    return v


def _flatten_headers(headers: Any) -> list[str]:
    """Shot-location endpoints return two header rows (zone name + stat)."""
    if headers and isinstance(headers, list) and isinstance(headers[0], dict):
        top = next((h for h in headers if h.get("name") == "SHOT_CATEGORY"), None)
        cols = next((h for h in headers if h.get("name") == "columns"), headers[-1])
        names = list(cols.get("columnNames", []))
        if top:
            skip = int(top.get("columnsToSkip", 0))
            span = int(top.get("columnSpan", 1))
            zones = top.get("columnNames", [])
            out = names[:skip]
            for i, n in enumerate(names[skip:]):
                z = zones[i // span] if i // span < len(zones) else "Other"
                out.append(f"{z}|{n}")
            return out
        return names
    return list(headers or [])


def table(result_set: dict, min_filter: Callable[[dict], bool] | None = None) -> dict:
    headers = _flatten_headers(result_set.get("headers"))
    rows = result_set.get("rowSet", [])
    keep = [i for i, h in enumerate(headers) if h not in DROP_COLS and not h.endswith(DROP_SUFFIXES)]
    h = [headers[i] for i in keep]
    out = []
    for r in rows:
        row = [_clean_value(r[i]) for i in keep]
        if min_filter and not min_filter(dict(zip(h, row))):
            continue
        out.append(row)
    return {"h": h, "r": out}


def first_set(raw: dict) -> dict:
    sets = raw.get("resultSets") or raw.get("resultSet")
    if isinstance(sets, dict):
        return sets
    return sets[0] if sets else {"headers": [], "rowSet": []}


def call(endpoint_cls, **kwargs) -> dict:
    last: Exception | None = None
    for attempt in range(4):
        try:
            time.sleep(DELAY if attempt == 0 else DELAY * (attempt * 4))
            return endpoint_cls(timeout=TIMEOUT, **kwargs).get_dict()
        except Exception as e:  # network hiccups, 429s, timeouts
            last = e
            print(f"    retry {attempt + 1} for {endpoint_cls.__name__}: {e.__class__.__name__}")
    raise RuntimeError(f"{endpoint_cls.__name__} failed: {last}")


# ----------------------------------------------------------------------------- datasets

def build_jobs(season: str, st: str) -> dict[str, Callable[[], dict]]:
    """Each job returns {"h","r"} or {"groups": {name: {"h","r"}}}."""

    def dash_players(measure: str, per_mode="PerGame"):
        return lambda: table(first_set(call(
            E.LeagueDashPlayerStats, season=season, season_type_all_star=st,
            measure_type_detailed_defense=measure, per_mode_detailed=per_mode)))

    def dash_teams(measure: str, per_mode="PerGame"):
        return lambda: table(first_set(call(
            E.LeagueDashTeamStats, season=season, season_type_all_star=st,
            measure_type_detailed_defense=measure, per_mode_detailed=per_mode)))

    def grouped(names: list[str], fn: Callable[[str], dict]):
        def run():
            groups = {}
            for n in names:
                try:
                    groups[n] = fn(n)
                except Exception as e:
                    print(f"    skipped {n}: {e}")
            return {"groups": groups}
        return run

    def tracking(kind: str):
        return grouped(TRACKING_TYPES, lambda m: table(first_set(call(
            E.LeagueDashPtStats, season=season, season_type_all_star=st,
            player_or_team=kind, pt_measure_type=m, per_mode_simple="PerGame"))))

    def contests(cls):
        return grouped(CONTEST_RANGES, lambda r: table(first_set(call(
            cls, season=season, season_type_all_star=st,
            close_def_dist_range_nullable=r, per_mode_simple="PerGame"))))

    def synergy(who: str, grouping: str):
        return grouped(PLAY_TYPES, lambda p: table(first_set(call(
            E.SynergyPlayTypes, season=season, season_type_all_star=st,
            player_or_team_abbreviation=who, type_grouping_nullable=grouping,
            play_type_nullable=p, per_mode_simple="Totals"))))

    def lineups():
        base = first_set(call(E.LeagueDashLineups, season=season, season_type_all_star=st, group_quantity=5,
                              measure_type_detailed_defense="Base", per_mode_detailed="Totals"))
        adv = first_set(call(E.LeagueDashLineups, season=season, season_type_all_star=st, group_quantity=5,
                             measure_type_detailed_defense="Advanced", per_mode_detailed="Totals"))
        min_ok = lambda r: (r.get("MIN") or 0) >= 10
        return {"groups": {"base": table(base, min_ok), "advanced": table(adv, min_ok)}}

    def matchups():
        raw = call(E.LeagueSeasonMatchups, season=season, season_type_playoffs=st, per_mode_simple="Totals")
        return table(first_set(raw), lambda r: (r.get("PARTIAL_POSS") or 0) >= 15)

    def clutch(cls):
        return lambda: table(first_set(call(cls, season=season, season_type_all_star=st, per_mode_detailed="PerGame")))

    return {
        "player_base": dash_players("Base"),
        "player_advanced": dash_players("Advanced"),
        "player_misc": dash_players("Misc"),
        "player_scoring": dash_players("Scoring"),
        "player_usage": dash_players("Usage"),
        "team_base": dash_teams("Base"),
        "team_advanced": dash_teams("Advanced"),
        "team_opponent": dash_teams("Opponent"),
        "team_misc": dash_teams("Misc"),
        "hustle_player": lambda: table(first_set(call(E.LeagueHustleStatsPlayer, season=season, season_type_all_star=st, per_mode_time="PerGame"))),
        "hustle_team": lambda: table(first_set(call(E.LeagueHustleStatsTeam, season=season, season_type_all_star=st, per_mode_time="PerGame"))),
        "tracking_player": tracking("Player"),
        "tracking_team": tracking("Team"),
        "contest_player": contests(E.LeagueDashPlayerPtShot),
        "contest_team": contests(E.LeagueDashTeamPtShot),
        "synergy_player_off": synergy("P", "offensive"),
        "synergy_player_def": synergy("P", "defensive"),
        "synergy_team_off": synergy("T", "offensive"),
        "synergy_team_def": synergy("T", "defensive"),
        "lineups": lineups,
        "matchups": matchups,
        "clutch_player": clutch(E.LeagueDashPlayerClutch),
        "clutch_team": clutch(E.LeagueDashTeamClutch),
        "est_player": lambda: table(first_set(call(E.PlayerEstimatedMetrics, season=season, season_type=st))),
        "est_team": lambda: table(first_set(call(E.TeamEstimatedMetrics, season=season, season_type=st))),
        "shot_zones_player": lambda: table(first_set(call(E.LeagueDashPlayerShotLocations, season=season, season_type_all_star=st, distance_range="By Zone", per_mode_detailed="PerGame"))),
        "defend_player": grouped(DEFENSE_CATEGORIES, lambda c: table(first_set(call(
            E.LeagueDashPtDefend, season=season, season_type_all_star=st, defense_category=c, per_mode_simple="PerGame")))),
    }


def count_rows(d: dict) -> int:
    if "groups" in d:
        return sum(len(g.get("r", [])) for g in d["groups"].values())
    return len(d.get("r", []))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", default=Season.default, help="e.g. 2026-27 (default: current)")
    ap.add_argument("--playoffs", action="store_true", help="pull playoff data instead of regular season")
    ap.add_argument("--only", default="", help="comma-separated dataset keys")
    ap.add_argument("--push", action="store_true", help="git commit + push data/ afterwards")
    args = ap.parse_args()

    st = "Playoffs" if args.playoffs else "Regular Season"
    folder = args.season + ("-playoffs" if args.playoffs else "")
    out_dir = DATA / folder
    out_dir.mkdir(parents=True, exist_ok=True)

    jobs = build_jobs(args.season, st)
    only = {k.strip() for k in args.only.split(",") if k.strip()}
    if only:
        unknown = only - jobs.keys()
        if unknown:
            print("Unknown datasets:", ", ".join(sorted(unknown)), "\nAvailable:", ", ".join(jobs))
            return 2
        jobs = {k: v for k, v in jobs.items() if k in only}

    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    manifest_path = DATA / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"seasons": {}}
    entry = manifest["seasons"].setdefault(folder, {"datasets": {}})

    print(f"Syncing NBA.com data · {args.season} {st} → {out_dir.relative_to(ROOT)}")
    failures = 0
    for key, job in jobs.items():
        print(f"  {key} …", flush=True)
        try:
            data = job()
        except Exception as e:
            failures += 1
            print(f"    FAILED: {e}")
            entry["datasets"].setdefault(key, {})["error"] = str(e)[:200]
            continue
        data.update({"dataset": key, "season": args.season, "seasonType": st, "updated": now})
        (out_dir / f"{key}.json").write_text(json.dumps(data, separators=(",", ":")))
        entry["datasets"][key] = {"rows": count_rows(data), "updated": now}
        print(f"    {count_rows(data)} rows")

    entry["updated"] = now
    entry["season"] = args.season
    entry["seasonType"] = st
    manifest["updated"] = now
    manifest_path.write_text(json.dumps(manifest, indent=1))

    print(f"Done with {failures} failure(s).")
    if failures == len(jobs):
        print("Every request failed. If you're on a cloud server or VPN, stats.nba.com is probably blocking it —"
              " run this from a home connection.")

    if args.push:
        subprocess.run(["git", "-C", str(ROOT), "add", "data/nba"], check=True)
        diff = subprocess.run(["git", "-C", str(ROOT), "diff", "--cached", "--quiet"])
        if diff.returncode != 0:
            subprocess.run(["git", "-C", str(ROOT), "commit", "-m", f"Sync NBA.com data {folder} ({now[:10]})"], check=True)
            subprocess.run(["git", "-C", str(ROOT), "push"], check=True)
            print("Pushed — Vercel will redeploy with the new data.")
        else:
            print("No data changes to push.")
    return 0 if failures < len(jobs) else 1


if __name__ == "__main__":
    sys.exit(main())
