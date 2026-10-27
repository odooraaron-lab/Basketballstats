import { cookies } from "next/headers";
import { ThemePicker } from "@/components/ThemePicker";
import { Card } from "@/components/ui";
import { AREAS, THEME_COOKIE, type Theme } from "@/lib/areas";
import { requireViewer } from "@/lib/session";
import { changePasswordAction, deleteAccountAction, savePrefsAction, signOutEverywhereAction } from "./actions";

const inputCls = "w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm outline-none focus:border-court";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; pw?: string; del?: string }> }) {
  const v = await requireViewer("/account");
  const sp = await searchParams;
  const theme = (v.prefs.theme ?? ((await cookies()).get(THEME_COOKIE)?.value as Theme) ?? "dark") as Theme;
  const hidden = v.prefs.hidden ?? [];
  const pwMsg: Record<string, string> = { ok: "Password changed. Other devices have been signed out.", wrong: "Your current password wasn't right.", short: "New password needs at least 8 characters.", owner: "The owner login's password is set in environment variables." };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-extrabold">Settings</h1>
        <p className="text-sm text-ink-400">Signed in as {v.email}</p>
      </div>
      {sp.saved && <p className="rounded-md border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">Saved.</p>}

      <form action={savePrefsAction} className="space-y-5">
        <Card title="Appearance">
          <ThemePicker initial={theme} />
        </Card>

        <Card title="Show or hide areas" right="hidden areas disappear from the top bar">
          <div className="grid gap-2 sm:grid-cols-2">
            {AREAS.map((a) => (
              <label key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 px-3 py-2 text-sm">
                <span>
                  {a.label}
                  {a.kind === "feature" && <span className="ml-1 text-[11px] text-ink-500">tool</span>}
                </span>
                <input type="checkbox" name="show" value={a.id} defaultChecked={!hidden.includes(a.id)} className="h-4 w-4 accent-[#f26b1d]" />
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs text-ink-400">Open this after logging in</span>
            <select name="home" defaultValue={v.prefs.home ?? ""} className={inputCls}>
              <option value="">Wherever I was last</option>
              {AREAS.filter((a) => a.kind === "section").map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>
        </Card>
        <button className="display rounded-lg bg-court px-5 py-2 font-bold text-ink-950 hover:bg-court-soft">Save settings</button>
      </form>

      {v.user && (
        <Card title="Password">
          {sp.pw && <p className={`mb-3 text-sm ${sp.pw === "ok" ? "text-win" : "text-loss"}`}>{pwMsg[sp.pw]}</p>}
          <form action={changePasswordAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs text-ink-400">Current<input name="current" type="password" autoComplete="current-password" required className={`${inputCls} mt-1`} /></label>
            <label className="text-xs text-ink-400">New<input name="next" type="password" autoComplete="new-password" minLength={8} required className={`${inputCls} mt-1`} /></label>
            <button className="rounded-lg border border-ink-700 px-4 py-2 text-sm hover:border-court">Change</button>
          </form>
        </Card>
      )}

      <Card title="Security">
        <form action={signOutEverywhereAction}>
          <button className="rounded-lg border border-ink-700 px-4 py-2 text-sm hover:border-court">Sign out on every device</button>
        </form>
      </Card>

      {v.user && (
        <Card title="Delete account">
          <p className="mb-3 text-sm text-ink-400">Cancels your membership straight away and permanently deletes your account and settings.</p>
          {sp.del && <p className="mb-2 text-sm text-loss">Type DELETE to confirm.</p>}
          <form action={deleteAccountAction} className="flex flex-wrap gap-2">
            <input name="confirm" placeholder="Type DELETE" className={`${inputCls} max-w-[12rem]`} />
            <button className="rounded-lg border border-loss/50 px-4 py-2 text-sm text-loss hover:bg-loss/10">Delete my account</button>
          </form>
        </Card>
      )}
    </div>
  );
}
