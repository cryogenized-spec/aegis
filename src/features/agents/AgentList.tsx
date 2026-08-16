import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Bot, MessageSquare } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Agent, type Thread } from '@/core/db';

interface Props {
  onOpenThread: (id: string) => void;
}

export function AgentList({ onOpenThread }: Props) {
  const agents = useLiveQuery(() => db.agents.orderBy('name').toArray(), []);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setEditingId(agent.id);
  };

  const startChat = async (agent: Agent) => {
    const now = Date.now();
    const thread: Thread = {
      id: uuid(),
      title: `Chat with ${agent.name}`,
      kind: 'agent',
      agentId: agent.id,
      createdAt: now,
      updatedAt: now,
      preview: '',
    };
    await db.threads.add(thread);
    onOpenThread(thread.id);
  };

  const updateAgent = async (id: string, patch: Partial<Agent>) => {
    await db.agents.update(id, { ...patch, updatedAt: Date.now() });
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

        <ul className="space-y-2">
          {agents?.map((a) => {
            const isEditing = editingId === a.id;
            return (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                      value={a.name}
                      onChange={(e) => updateAgent(a.id, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <textarea
                      className="min-h-[80px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                      value={a.systemPrompt}
                      onChange={(e) => updateAgent(a.id, { systemPrompt: e.target.value })}
                      placeholder="System prompt"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-sm font-medium">{a.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                          {a.systemPrompt}
                        </div>
                        {a.model && (
                          <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                            {a.model}
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => startChat(a)}
                        title="Chat with agent"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
