export function Prose({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-4xl font-extrabold">{title}</h1>
      {updated && <p className="mt-1 text-sm text-ink-500">Last updated {updated}</p>}
      <div className="prose-cs mt-6">{children}</div>
    </main>
  );
}
