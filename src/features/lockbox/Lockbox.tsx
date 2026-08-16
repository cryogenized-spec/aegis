import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { KeyRound, Eye, EyeOff, Save, Lock, Unlock } from 'lucide-react';
import { getSetting, setSetting } from '@/core/db';
import { encryptString, decryptString, isEncryptedBlob, type EncryptedBlob } from '@/core/crypto';
import { getSessionGeminiKey, setSessionGeminiKey } from '@/core/session';

export function Lockbox() {
  const stored = useLiveQuery(() => getSetting<unknown>('apiKey.gemini'), []);
  const encrypted = isEncryptedBlob(stored);
  const plaintextStored = typeof stored === 'string' ? stored : '';

  const [apiKey, setApiKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(() => Boolean(getSessionGeminiKey()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!encrypted && plaintextStored && !apiKey) {
      setApiKey(plaintextStored);
    }
  }, [encrypted, plaintextStored, apiKey]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  };

  const saveEncrypted = async () => {
    setError(null);
    const key = apiKey.trim();
    const pass = passphrase.trim();
    if (!key) {
      setError('Enter an API key to save.');
      return;
    }
    if (!pass) {
      setError('Enter a passphrase to encrypt the key.');
      return;
    }
    try {
      const blob = await encryptString(key, pass);
      await setSetting('apiKey.gemini', blob);
      setSessionGeminiKey(key);
      setUnlocked(true);
      setApiKey('');
      setPassphrase('');
      flash('Encrypted & unlocked');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encryption failed');
    }
  };

  const savePlain = async () => {
    setError(null);
    const key = apiKey.trim();
    if (!key) {
      setError('Enter an API key to save.');
      return;
    }
    await setSetting('apiKey.gemini', key);
    setSessionGeminiKey(key);
    setUnlocked(true);
    flash('Saved (plaintext)');
  };

  const unlock = async () => {
    setError(null);
    if (!isEncryptedBlob(stored)) {
      setError('No encrypted key stored.');
      return;
    }
    try {
      const plain = await decryptString(stored as EncryptedBlob, passphrase);
      setSessionGeminiKey(plain);
      setUnlocked(true);
      setPassphrase('');
      flash('Unlocked for this session');
    } catch {
      setError('Wrong passphrase or corrupt data.');
    }
  };

  const lockSession = () => {
    setSessionGeminiKey(null);
    setUnlocked(false);
    flash('Session locked');
  };

  const clearStored = async () => {
    await setSetting('apiKey.gemini', null);
    setSessionGeminiKey(null);
    setUnlocked(false);
    setApiKey('');
    flash('Key removed');
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
            Keys stay on this device. Prefer saving with a passphrase so the key is
            encrypted at rest. Unlock once per session to use AI features.
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-xs">
          <span className="text-[var(--muted)]">
            Storage:{' '}
            <span className="text-[var(--text)]">
              {encrypted ? 'encrypted' : plaintextStored ? 'plaintext' : 'empty'}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            Session:{' '}
            <span className={unlocked ? 'text-emerald-400' : 'text-[var(--text)]'}>
              {unlocked ? 'unlocked' : 'locked'}
            </span>
          </span>
        </div>

        {encrypted && !unlocked && (
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Unlock passphrase
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Passphrase"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={unlock}
                className="flex h-[42px] items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-sm font-medium text-black"
              >
                <Unlock size={16} />
                Unlock
              </button>
            </div>
          </div>
        )}

        {unlocked && (
          <button
            onClick={lockSession}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            <Lock size={16} />
            Lock session
          </button>
        )}

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <label className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={encrypted ? 'Enter new key to replace…' : 'AIza…'}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Passphrase (recommended)
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Used to encrypt the key at rest"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveEncrypted}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-black"
            >
              <Save size={16} />
              Save encrypted
            </button>
            <button
              onClick={savePlain}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Save plaintext
            </button>
            {(encrypted || plaintextStored) && (
              <button
                onClick={clearStored}
                className="rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                Remove key
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {status && <p className="text-xs text-emerald-400">{status}</p>}
      </div>
    </div>
  );
}
