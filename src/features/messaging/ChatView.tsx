import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Send, Square, ImagePlus, X, Mic } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { db, type Message } from '@/core/db';
import { streamGemini, type ChatTurn } from '@/core/ai';
import { MessageBody } from './MessageBody';

interface Props {
  threadId: string;
  onBack: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ChatView({ threadId, onBack }: Props) {
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4 MB for v0.1.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingImage(dataUrl);
      setError(null);
    } catch {
      setError('Could not read image.');
    }
  };

  const runAssistant = async (history: ChatTurn[]) => {
    const assistantId = uuid();
    await db.messages.add({
      id: assistantId,
      threadId,
      role: 'assistant',
      content: '',
      createdAt: Date.now() + 1,
    });

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

  const send = async () => {
    const text = input.trim();
    if ((!text && !pendingImage) || sending || recording) return;

    setError(null);
    setSending(true);
    setInput('');
    const image = pendingImage;
    setPendingImage(null);

    const userMsg: Message = {
      id: uuid(),
      threadId,
      role: 'user',
      content: text || (image ? '(image)' : ''),
      createdAt: Date.now(),
      imageDataUrl: image || undefined,
    };
    await db.messages.add(userMsg);
    await db.threads.update(threadId, {
      updatedAt: Date.now(),
      preview: text.slice(0, 80) || (image ? 'Image' : ''),
      title:
        thread?.title === 'New thread' || thread?.title?.startsWith('Chat with ')
          ? (text || 'Image').slice(0, 40)
          : thread?.title,
    });

    const history: ChatTurn[] = [...(messages || []), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
      imageDataUrl: m.imageDataUrl,
    }));

    await runAssistant(history);
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;

        const dataUrl = await readFileAsDataUrl(
          new File([blob], 'voice.webm', { type: blob.type }),
        );

        const userMsg: Message = {
          id: uuid(),
          threadId,
          role: 'user',
          content: '(voice note)',
          createdAt: Date.now(),
          audioDataUrl: dataUrl,
        };
        await db.messages.add(userMsg);
        await db.threads.update(threadId, {
          updatedAt: Date.now(),
          preview: 'Voice note',
        });
        // Voice is stored for playback; transcription/AI path can come later.
      };

      recorder.start();
      setRecording(true);
      setError(null);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-black/5 hover:text-[var(--text)]"
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
        {messages?.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  isUser
                    ? 'rounded-br-md bg-[var(--accent)] text-black'
                    : 'rounded-bl-md border border-[var(--border)] bg-[var(--panel)] text-[var(--text)]'
                }`}
              >
                {m.imageDataUrl && (
                  <img
                    src={m.imageDataUrl}
                    alt=""
                    className="mb-2 max-h-56 w-full rounded-lg object-contain"
                  />
                )}
                {m.audioDataUrl && (
                  <audio controls src={m.audioDataUrl} className="mb-2 max-w-full" />
                )}
                {m.content !== '(voice note)' &&
                  m.content !== '(image)' &&
                  (m.content || (sending && m.role === 'assistant')) && (
                    <MessageBody content={m.content || '…'} inverted={isUser} />
                  )}
                {(m.content === '(voice note)' || m.content === '(image)') && !m.audioDataUrl && !m.imageDataUrl && (
                  <span className="text-xs opacity-70">{m.content}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="border-t border-[var(--border)] p-3">
        {pendingImage && (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative">
              <img
                src={pendingImage}
                alt="Pending"
                className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending || recording}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] disabled:opacity-40"
            title="Attach image"
          >
            <ImagePlus size={18} />
          </button>

          <button
            type="button"
            onClick={toggleRecord}
            disabled={sending}
            className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border disabled:opacity-40 ${
              recording
                ? 'border-red-500 bg-red-500/15 text-red-500'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)]'
            }`}
            title={recording ? 'Stop recording' : 'Voice note'}
          >
            <Mic size={18} />
          </button>

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
            placeholder={recording ? 'Recording…' : 'Message…'}
            disabled={sending || recording}
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
              disabled={(!input.trim() && !pendingImage) || recording}
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
