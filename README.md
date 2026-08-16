# Aegis

Local-first messaging and AI agent platform.

## Status (v0.1)

| Area | Status |
|------|--------|
| Threads + local messages | Working |
| Gemini streaming | Working |
| Agents (prompt, model, temperature, delete) | Working |
| Markdown bubbles | Working |
| Image attach + vision | Working |
| Voice notes (record / playback) | Working |
| Lockbox + passphrase encryption | Working |
| Dark / light theme | Working |

Still later: STT on voice notes, channels, P2P, organiser suite, local LLMs.

## Architecture

```
src/
  core/           db, crypto, ai (multimodal stream), session
  features/
    messaging/    threads, chat, markdown, media
    agents/       list, edit, delete, start chat
    lockbox/      encrypted API keys
    settings/     theme
```

## Run

```bash
npm install
cp .env.example .env.local   # optional VITE_GEMINI_API_KEY
npm run dev
```

1. **Lockbox** → save Gemini key (encrypted recommended) → unlock session  
2. **Agents** → create, set prompt/model → start chat  
3. Send text, images (vision), or voice notes  

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Dexie · Web Crypto · Gemini SSE (no heavy SDK)
