"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <div className="display text-xl font-bold">Couldn&apos;t load this page</div>
      <p className="mt-2 text-sm text-ink-400">The data feed may be slow or temporarily unavailable.</p>
      <p className="mt-1 text-xs text-ink-600">{error.message}</p>
      <button onClick={reset} className="display mt-4 rounded-lg bg-court px-4 py-2 font-bold text-ink-950">
        Try again
      </button>
    </div>
  );
}
