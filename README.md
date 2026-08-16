# Aegis

Local-first messaging and AI agent platform.

A clean rebuild focused on maintainability, clear domain boundaries, and a deliberately limited initial scope.

## MVP Scope (v0.1)

The first version is intentionally narrow:

| Area | Included |
|------|----------|
| Messaging | Local threads, message list, composer |
| AI | Agent conversations with streaming responses |
| Security | API key lockbox (encrypted at rest) |
| Media | Images and voice notes |
| Settings | Theme, basic preferences |
| Architecture | Modular feature layout, no god components |

Explicitly **out of scope** for v0.1:
- Channels / RSS
- WhatsApp integration
- Full organiser suite
- Local LLM runtimes
- P2P networking
- Advanced image generation
- Cron / background agents

These may return later as separate, well-bounded modules.

## Architecture Principles

1. **Feature modules** live under `src/features/`. Each owns its UI, hooks, and domain logic.
2. **Core infrastructure** lives under `src/core/` (database, crypto, settings, shared UI primitives).
3. Components stay focused. Large surfaces are composed, not monolithic.
4. Local-first: Dexie (IndexedDB) is the primary data store.
5. External API keys never leave the lockbox unencrypted.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Dexie
- Minimal, intentional dependencies only

## Local Development

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY if using Google models
npm run dev
```

## Status

Scaffolding in progress. First vertical slice: messaging + AI streaming.
