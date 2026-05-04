# AI Assistant Chat App

A streaming AI chat application powered by OpenAI via Replit AI Integrations.

## Architecture

- **Frontend**: React + Vite, served on port 5000
- **Backend**: Express + TypeScript (tsx), served on port 3001
- **AI**: OpenAI `gpt-5.4` via Replit AI Integrations (no API key needed)

## Project Structure

```
client/           React frontend
  index.html
  src/
    App.tsx       Main chat component
    App.css       Styles
    main.tsx      Entry point
    index.css     Global styles
  vite.config.ts  (unused, root config used instead)

server/
  index.ts        Express API server

vite.config.ts    Vite config (root: "client", proxy /api → port 3001)
tsconfig.json     TypeScript config for server
```

## Workflows

- **Start application** — `vite` — frontend on port 5000 (webview)
- **Backend** — `tsx server/index.ts` — API on port 3001 (console)

## Features

- Multi-conversation support (in-memory)
- Streaming AI responses via SSE
- Collapsible sidebar
- Full conversation history sent to OpenAI for context

## Environment Variables

Set automatically by Replit AI Integrations:
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
