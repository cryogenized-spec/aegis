import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Bot } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Agent } from '@/core/db';

export function AgentList() {
  const agents = useLiveQuery(() => db.agents.orderBy('name').toArray(), []);

  const createAgent = async () => {
    const now = Date.now();
    const agent: Agent = {
      id: uuid(),
      name: 'New agent',
      systemPrompt: 'You are a helpful assistant.',
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      createdAt: now,
      updatedAt: now,
    };
    await db.agents.add(agent);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide">Agents</h1>
        <button
          onClick={createAgent}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] hover:opacity-90"
          title="New agent"
        >
          <Plus size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {!agents?.length && (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-[var(--muted)]">
            <Bot size={32} strokeWidth={1.25} />
            <p className="text-sm">No agents yet</p>
            <button
              onClick={createAgent}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-black"
            >
              Create one
            </button>
          </div>
        )}

        <ul className="space-y-1">
          {agents?.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-3"
            >
              <div className="text-sm font-medium">{a.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{a.systemPrompt}</div>
              {a.model && (
                <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  {a.model}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
