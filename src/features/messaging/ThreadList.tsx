import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Thread } from '@/core/db';

interface Props {
  onOpenThread: (id: string) => void;
}

export function ThreadList({ onOpenThread }: Props) {
  const [query, setQuery] = useState('');
  const threads = useLiveQuery(
    () => db.threads.orderBy('updatedAt').reverse().toArray(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !threads) return threads || [];
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.preview || '').toLowerCase().includes(q),
    );
  }, [threads, query]);

  const createThread = async () => {
    const now = Date.now();
    const thread: Thread = {
      id: uuid(),
      title: 'New thread',
      kind: 'human',
      createdAt: now,
      updatedAt: now,
      preview: '',
    };
    await db.threads.add(thread);
    onOpenThread(thread.id);
  };

  const deleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.messages.where('threadId').equals(id).delete();
    await db.threads.delete(id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text)]">Threads</h1>
        <button
          onClick={createThread}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] hover:opacity-90"
          title="New thread"
        >
          <Plus size={18} />
        </button>
      </header>

      <div className="border-b border-[var(--border)] px-3 py-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!threads?.length && (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-[var(--muted)]">
            <MessageSquare size={32} strokeWidth={1.25} />
            <p className="text-sm">No threads yet</p>
            <button
              onClick={createThread}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-black"
            >
              Start one
            </button>
          </div>
        )}

        {threads && threads.length > 0 && filtered.length === 0 && (
          <p className="px-2 pt-8 text-center text-sm text-[var(--muted)]">No matches</p>
        )}

        <ul className="space-y-1">
          {filtered.map((t) => (
            <li key={t.id} className="group relative">
              <button
                onClick={() => onOpenThread(t.id)}
                className="w-full rounded-xl border border-transparent px-3 py-3 pr-10 text-left transition-colors hover:border-[var(--border)] hover:bg-black/5"
              >
                <div className="truncate text-sm font-medium text-[var(--text)]">{t.title}</div>
                {t.preview && (
                  <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{t.preview}</div>
                )}
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  {t.kind === 'agent' ? 'Agent · ' : ''}
                  {new Date(t.updatedAt).toLocaleString()}
                </div>
              </button>
              <button
                type="button"
                title="Delete thread"
                onClick={(e) => deleteThread(t.id, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted)] opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
