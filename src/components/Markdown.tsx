import Link from "next/link";
import type { ReactNode } from "react";

// Small renderer for blog posts: "## "/"### " headings, "- " bullets, "1. " numbered lists,
// "> " callouts, "| a | b |" tables, **bold**, *italic*, [links](/path).
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(m[2].startsWith("/") ? <Link key={k} href={m[2]}>{m[1]}</Link> : <a key={k} href={m[2]} rel="noopener">{m[1]}</a>);
    else if (m[3]) out.push(<strong key={k}>{m[3]}</strong>);
    else if (m[4]) out.push(<em key={k}>{m[4]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const headingId = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const headings = (src: string) =>
  src.split("\n").filter((l) => l.startsWith("## ")).map((l) => ({ text: l.slice(3).trim(), id: headingId(l.slice(3).trim()) }));

export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.trim().split("\n").map((l) => l.trim());
        const first = lines[0];
        if (first.startsWith("### ")) return <h3 key={b} id={headingId(first.slice(4))}>{inline(first.slice(4), `h${b}`)}</h3>;
        if (first.startsWith("## ")) return <h2 key={b} id={headingId(first.slice(3))}>{inline(first.slice(3), `h${b}`)}</h2>;
        if (lines.every((l) => l.startsWith("- "))) return <ul key={b}>{lines.map((l, i) => <li key={i}>{inline(l.slice(2), `l${b}-${i}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\.\s/.test(l))) return <ol key={b}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\d+\.\s/, ""), `o${b}-${i}`)}</li>)}</ol>;
        if (lines.every((l) => l.startsWith(">"))) return <blockquote key={b}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), `q${b}`)}</blockquote>;
        if (lines.every((l) => l.startsWith("|"))) {
          const rows = lines.map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
          const [head, ...body] = rows.filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
          return (
            <div key={b} className="overflow-x-auto">
              <table>
                <thead><tr>{head.map((c, i) => <th key={i}>{inline(c, `t${b}h${i}`)}</th>)}</tr></thead>
                <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `t${b}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={b}>{inline(lines.join(" "), `p${b}`)}</p>;
      })}
    </>
  );
}
