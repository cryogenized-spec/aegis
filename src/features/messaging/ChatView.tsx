import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Send } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Message } from '@/core/db';

interface Props {
  threadId: string;
  onBack: () => void;
}

export function ChatView({ threadId, onBack }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useLiveQuery(() => db.threads.get(threadId), [threadId]);
  const messages = useLiveQuery(
    () => db.messages.where('threadId').equals(threadId).sortBy('createdAt'),
    [threadId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

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
      title: thread?.title === 'New thread' ? text.slice(0, 40) : thread?.title,
    });

    // Placeholder assistant reply — real AI streaming arrives in next slice
    const assistantMsg: Message = {
      id: uuid(),
      threadId,
      role: 'assistant',
      content: `Received: "${text}"\n\n_(AI streaming will be wired next.)_`,
      createdAt: Date.now() + 1,
    };
    await db.messages.add(assistantMsg);
    await db.threads.update(threadId, {
      updatedAt: Date.now(),
      preview: assistantMsg.content.slice(0, 80),
    });

    setSending(false);
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
        <h1 className="truncate text-sm font-semibold">{thread?.title ?? 'Chat'}</h1>
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
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

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
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-black disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
