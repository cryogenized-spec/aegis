import { useLiveQuery } from 'dexie-react-hooks';
import { getSetting, setSetting } from '@/core/db';

export function SettingsView() {
  const theme = useLiveQuery(() => getSetting<'dark' | 'light'>('theme', 'dark'), []);

  const setTheme = async (value: 'dark' | 'light') => {
    await setSetting('theme', value);
    // Theme tokens are currently fixed dark; light mode wiring comes later.
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Appearance
          </h2>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-xl border px-4 py-2 text-sm capitalize transition-colors ${
                  (theme ?? 'dark') === t
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Light theme tokens are prepared; full application lands shortly.
          </p>
        </section>

        <section className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="text-sm font-medium">Aegis</div>
          <div className="text-xs text-[var(--muted)]">v0.1.0 — scaffolding</div>
          <div className="text-xs text-[var(--muted)]">
            Local-first messaging and AI agents. Clean rebuild.
          </div>
        </section>
      </div>
    </div>
  );
}
