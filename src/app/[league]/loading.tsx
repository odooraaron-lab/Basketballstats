export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-ink-850" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-ink-900" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-ink-900" />
    </div>
  );
}
