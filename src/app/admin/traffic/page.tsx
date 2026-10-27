import { Card } from "@/components/ui";
import { topList } from "@/lib/adminStats";
import { dbConfigured } from "@/lib/db";

export default async function Traffic({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!dbConfigured()) return <p className="text-sm text-ink-400">Connect the database first.</p>;
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const [pages, refs, sources, countries, devices] = await Promise.all([topList("pages", days), topList("referrers", days), topList("sources", days), topList("countries", days), topList("devices", days)]);
  const List = ({ title, rows }: { title: string; rows: { k: string; n: number; v: number }[] }) => (
    <Card title={title} right="views · visitors">
      {rows.length ? (
        <ul className="text-sm">
          {rows.map((r) => (
            <li key={r.k} className="flex justify-between gap-3 border-b border-ink-850 py-1">
              <span className="truncate text-ink-300">{r.k}</span>
              <span className="num shrink-0">{r.n} · {r.v}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">No data yet.</p>
      )}
    </Card>
  );
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {[7, 30, 90].map((d) => (
          <a key={d} href={`/admin/traffic?days=${d}`} className={`chip ${d === days ? "!border-court !text-court" : ""}`}>Last {d} days</a>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <List title="Top public pages (landing & blog)" rows={pages} />
        <List title="Referrers" rows={refs} />
        <List title="Campaigns (utm_source)" rows={sources} />
        <List title="Countries" rows={countries} />
        <List title="Devices" rows={devices} />
      </div>
    </div>
  );
}
