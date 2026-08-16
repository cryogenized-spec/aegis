# Aegis

Local-first messaging and AI agent platform.

A clean rebuild focused on maintainability, clear domain boundaries, and a deliberately limited initial scope.

## Current status (v0.1)

| Area | Status |
|------|--------|
| Threads + local messages | Working |
| Gemini streaming replies | Working |
| Agents (prompt, model, start chat) | Working |
| Markdown in bubbles | Working |
| Image attach (local display) | Working |
| API lockbox + passphrase encryption | Working |
| Session unlock for encrypted keys | Working |
| Theme / settings shell | Minimal |

Still out of scope for this phase: channels, P2P, organiser suite, local LLMs, vision-model image analysis, voice notes.

## Architecture

```
src/
  core/           db, crypto, ai client, session
  features/
    messaging/    threads, chat, markdown body
    agents/       agent list + edit + start chat
    lockbox/      encrypted API key storage
    settings/     appearance shell
```

Principles:

1. Feature modules own their UI and domain logic.
2. Core stays thin and shared.
3. No god components.
4. Local-first — Dexie is the primary store.
5. Secrets encrypted at rest when a passphrase is used.

## Local development

```bash
npm install
cp .env.example .env.local   # optional VITE_GEMINI_API_KEY
npm run dev
```

1. Open **Lockbox** → paste a Gemini key → **Save encrypted** (recommended) or plaintext.
2. If encrypted, **Unlock** with your passphrase once per session.
3. Create an **Agent**, set a system prompt, start a chat.
4. Stream replies in the thread view.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Dexie
- Web Crypto (AES-GCM + PBKDF2)
- Gemini Generative Language API (SSE streaming, no heavy SDK)
