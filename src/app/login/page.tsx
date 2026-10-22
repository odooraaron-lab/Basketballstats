export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const notConfigured = !process.env.APP_PASSWORD || !process.env.AUTH_SECRET;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* half-court lines in the background */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 500 470"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#f26b1d" strokeWidth="2">
          <rect x="10" y="10" width="480" height="450" />
          <rect x="170" y="10" width="160" height="190" />
          <circle cx="250" cy="200" r="60" />
          <path d="M40 10v140a210 210 0 0 0 420 0V10" />
          <circle cx="250" cy="460" r="60" />
        </g>
      </svg>

      <form
        action="/api/login"
        method="post"
        className="card relative w-full max-w-sm p-7 shadow-2xl shadow-black/50"
      >
        <div className="mb-6">
          <div className="display text-3xl font-extrabold text-ink-100">
            Court<span className="text-court">side</span>
          </div>
          <p className="mt-1 text-sm text-ink-400">Private stat tracker. Sign in to continue.</p>
        </div>

        {notConfigured && (
          <p className="mb-4 rounded-md border border-court-dim bg-court/10 px-3 py-2 text-xs text-court-soft">
            Login isn&apos;t configured yet. Set <code>APP_PASSWORD</code> and <code>AUTH_SECRET</code>{" "}
            in your environment variables.
          </p>
        )}
        {error === "1" && (
          <p className="mb-4 rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-xs text-loss">
            Wrong username or password.
          </p>
        )}

        <input type="hidden" name="next" value={next ?? ""} />
        <label className="mb-1 block text-xs font-medium text-ink-400" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          className="mb-4 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm outline-none focus:border-court"
        />
        <label className="mb-1 block text-xs font-medium text-ink-400" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mb-6 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm outline-none focus:border-court"
        />
        <button
          type="submit"
          className="display w-full rounded-lg bg-court py-2.5 text-base font-bold text-ink-950 transition hover:bg-court-soft"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
