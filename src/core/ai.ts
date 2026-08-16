import { getSetting } from './db';
import { getSessionGeminiKey } from './session';
import { isEncryptedBlob } from './crypto';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface StreamOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Resolve the API key priority:
 * 1. In-memory session (unlocked encrypted key)
 * 2. Plaintext lockbox value (legacy / no passphrase)
 * 3. Vite env fallback
 */
export async function resolveApiKey(): Promise<string | null> {
  const session = getSessionGeminiKey();
  if (session) return session;

  const stored = await getSetting<unknown>('apiKey.gemini');
  if (typeof stored === 'string' && stored.trim()) return stored.trim();
  if (isEncryptedBlob(stored)) {
    throw new Error('API key is encrypted. Unlock it in Lockbox first.');
  }

  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv?.trim()) return fromEnv.trim();
  return null;
}

/**
 * Stream a completion from Gemini via the public Generative Language API.
 * Yields text chunks as they arrive (SSE).
 */
export async function* streamGemini(
  turns: ChatTurn[],
  options: StreamOptions = {},
): AsyncGenerator<string, void, unknown> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add one in Lockbox.');
  }

  const model = options.model || 'gemini-2.0-flash';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const contents = turns
    .filter((t) => t.role !== 'system')
    .map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
    },
  };

  if (options.systemPrompt?.trim()) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt.trim() }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err?.error?.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Gemini error (${res.status}): ${detail}`);
  }

  if (!res.body) {
    throw new Error('No response body from Gemini');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const json = JSON.parse(payload);
        const text =
          json?.candidates?.[0]?.content?.parts?.[0]?.text ??
          json?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || '')
            .join('') ??
          '';
        if (text) yield text;
      } catch {
        // skip malformed SSE chunks
      }
    }
  }
}
