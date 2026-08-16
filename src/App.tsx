import { useState } from 'react';
import { MessageSquare, Bot, KeyRound, Settings } from 'lucide-react';
import type { AppView } from './core/types';
import { ThreadList } from './features/messaging/ThreadList';
import { ChatView } from './features/messaging/ChatView';
import { AgentList } from './features/agents/AgentList';
import { Lockbox } from './features/lockbox/Lockbox';
import { SettingsView } from './features/settings/SettingsView';

export default function App() {
  const [view, setView] = useState<AppView>('threads');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const openThread = (id: string) => {
    setActiveThreadId(id);
    setView('chat');
  };

  const navItems: { id: AppView; icon: typeof MessageSquare; label: string }[] = [
    { id: 'threads', icon: MessageSquare, label: 'Threads' },
    { id: 'agents', icon: Bot, label: 'Agents' },
    { id: 'lockbox', icon: KeyRound, label: 'Lockbox' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--panel)] py-4">
        <div className="mb-6 text-xs font-bold tracking-widest text-[var(--accent)]">AEGIS</div>
        {navItems.map(({ id, icon: Icon, label }) => {
          const active = view === id || (id === 'threads' && view === 'chat');
          return (
            <button
              key={id}
              title={label}
              onClick={() => {
                setView(id);
                if (id !== 'chat') setActiveThreadId(null);
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--accent)]" />
              )}
              <Icon size={20} />
            </button>
          );
        })}
      </nav>

      {/* Main */}
      <main className="min-w-0 flex-1">
        {view === 'threads' && <ThreadList onOpenThread={openThread} />}
        {view === 'chat' && activeThreadId && (
          <ChatView
            threadId={activeThreadId}
            onBack={() => {
              setView('threads');
              setActiveThreadId(null);
            }}
          />
        )}
        {view === 'agents' && <AgentList />}
        {view === 'lockbox' && <Lockbox />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
