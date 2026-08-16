import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { KeyRound, Eye, EyeOff, Save } from 'lucide-react';
import { getSetting, setSetting } from '@/core/db';

/**
 * Minimal lockbox for v0.1.
 * Stores the Gemini (or other) API key in Dexie settings.
 * Encryption-at-rest will be added in a later pass.
 */
export function Lockbox() {
  const stored = useLiveQuery(() => getSetting<string>('apiKey.gemini'), []);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync input when stored value loads
  const display = value || stored || '';

  const save = async () => {
    const key = value.trim() || stored || '';
    await setSetting('apiKey.gemini', key);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide">Lockbox</h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <KeyRound className="mt-0.5 shrink-0 text-[var(--accent)]" size={20} />
          <div className="text-sm text-[var(--muted)]">
            API keys stay on this device. They are used only for the providers you
            configure. Full encryption-at-rest lands in a later iteration.
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Gemini API Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? 'text' : 'password'}
                value={display}
                onChange={(e) => setValue(e.target.value)}
                placeholder="AIza…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={save}
              className="flex h-[42px] items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-sm font-medium text-black"
            >
              <Save size={16} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
