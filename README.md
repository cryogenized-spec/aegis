# Aegis

Local-first messaging and AI agent platform.

## Status (v0.1)

| Area | Status |
|------|--------|
| Threads + search | Working |
| Gemini streaming + vision | Working |
| Agents (prompt, model, temperature, delete) | Working |
| Markdown bubbles | Working |
| Image attach (compressed) + vision | Working |
| Voice notes + browser STT | Working |
| Message delete / thread export | Working |
| Lockbox + passphrase encryption | Working |
| Dark / light theme | Working |

Later: channels, P2P, organiser, local LLMs, stronger offline packaging.

## Architecture

```
src/
  core/           db, crypto, ai, session, media
  features/
    messaging/    threads, chat, markdown, media
    agents/
    lockbox/
    settings/
```

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

1. Lockbox → save Gemini key → unlock session  
2. Agents → create → start chat  
3. Text, images, or voice (STT when the browser supports it)  

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Dexie · Web Crypto · Gemini SSE
