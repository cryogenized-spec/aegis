import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Send, Square } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Message } from '@/core/db';
import { streamGemini, type ChatTurn } from '@/core/ai';

interface Props {
  threadId: string;
  onBack: () => void;
}

export function ChatView({ threadId, onBack }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const thread = useLiveQuery(() => db.threads.get(threadId), [threadId]);
  const agent = useLiveQuery(
    () => (thread?.agentId ? db.agents.get(thread.agentId) : undefined),
    [thread?.agentId],
  );
  const messages = useLiveQuery(
    () => db.messages.where('threadId').equals(threadId).sortBy('createdAt'),
    [threadId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, messages?.[messages.length - 1]?.content]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setInput('');

    const userMsg: Message = {
      id: uuid(),
      threadId,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    await db.messages.add(userMsg);
    await db.threads.update(threadId, {
      updatedAt: Date.now(),
      preview: text.slice(0, 80),
      title:
        thread?.title === 'New thread' || thread?.title?.startsWith('Chat with ')
          ? text.slice(0, 40)
          : thread?.title,
    });

    const assistantId = uuid();
    const assistantMsg: Message = {
      id: assistantId,
      threadId,
      role: 'assistant',
      content: '',
      createdAt: Date.now() + 1,
    };
    await db.messages.add(assistantMsg);

    const history: ChatTurn[] = [...(messages || []), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = '';

    try {
      for await (const chunk of streamGemini(history, {
        model: agent?.model || 'gemini-2.0-flash',
        systemPrompt: agent?.systemPrompt,
        temperature: agent?.temperature,
        signal: controller.signal,
      })) {
        accumulated += chunk;
        await db.messages.update(assistantId, { content: accumulated });
      }

      await db.threads.update(threadId, {
        updatedAt: Date.now(),
        preview: accumulated.slice(0, 80) || '…',
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        if (!accumulated) {
          await db.messages.update(assistantId, { content: '_(stopped)_' });
        }
      } else {
        const message = err instanceof Error ? err.message : 'Request failed';
        setError(message);
        await db.messages.update(assistantId, {
          content: accumulated || `Error: ${message}`,
        });
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{thread?.title ?? 'Chat'}</h1>
          {agent && (
            <p className="truncate text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {agent.name}
              {agent.model ? ` · ${agent.model}` : ''}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages?.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-[var(--accent)] text-black'
                  : 'rounded-bl-md border border-[var(--border)] bg-[var(--panel)] text-[var(--text)]'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {m.content || (sending && m.role === 'assistant' ? '…' : '')}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message…"
            disabled={sending}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
          {sending ? (
            <button
              onClick={stop}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-red-500 text-white"
              title="Stop"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-black disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
