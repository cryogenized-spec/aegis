import Dexie, { type Table } from 'dexie';

export interface Thread {
  id: string;
  title: string;
  kind: 'human' | 'agent';
  agentId?: string;
  createdAt: number;
  updatedAt: number;
  preview?: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  /** Optional media reference (future) */
  mediaId?: string;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

class AegisDB extends Dexie {
  threads!: Table<Thread, string>;
  messages!: Table<Message, string>;
  agents!: Table<Agent, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('aegis');
    this.version(1).stores({
      threads: 'id, kind, updatedAt',
      messages: 'id, threadId, createdAt',
      agents: 'id, name',
      settings: 'key',
    });
  }
}

export const db = new AegisDB();

export async function getSetting<T>(key: string, fallback?: T): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
