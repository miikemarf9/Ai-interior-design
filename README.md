# Interior platform

UK-first consumer interior-design and commerce platform.

Core proposition:

**Design a room you can actually buy.**

## Run locally

```bash
npm install
npm run dev
```

## Environment

The Stage 4 written-design-brief endpoint uses OpenAI's Responses API when a key is configured.

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_BRIEF_MODEL=gpt-6-luna
```

Never commit a real API key to this public repository.

If no API key is present, the brief experience uses a deterministic preview draft so the UX remains testable.

## Current routes

- `/` — premium consumer homepage
- `/design` — 10-step Design My Room consultation
- `/brief` — free editable written design brief
- `/style-guide` — internal design system

## Credit principle

New verified accounts are planned to receive **3 free design credits**.

- Written brief creation: free
- Written brief revisions: free
- Future room image generation: 1 design credit
- Future room regeneration: 1 design credit
- Confirmed qualifying purchase: planned +1 reward credit

See `CREDIT_POLICY.md`.

## Working name

`Roomfound` is still a working product name and is isolated in `lib/site.ts`.

## Current stage

Stages 1–4 are implemented. Stage 5 is the UK real-product database.
