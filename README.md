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

### AI design brief

The Stage 4 written-design-brief endpoint uses OpenAI's Responses API when a key is configured.

```bash
OPENAI_API_KEY=your_key_here
OPENAI_BRIEF_MODEL=gpt-6-luna
```

### Neon product catalogue

Stage 5 now runs on a dedicated Neon/Postgres project in AWS London.

Configure the server-side database connection:

```bash
DATABASE_URL=postgresql://...
```

Never expose `DATABASE_URL` in browser code. Catalogue queries and imports should run through trusted server-side application code.

The Neon-native schema is `database/catalog_schema_neon.sql`; taxonomy and verification SQL live alongside it in `database/`.

## Current routes

- `/` — premium consumer homepage
- `/design` — 10-step Design My Room consultation
- `/brief` — free editable written design brief
- `/style-guide` — internal design system

## Product catalogue principle

**Product ≠ retailer offer.**

The canonical product and variant describe what the item actually is. Retailer offers describe where it can be bought, the current price, affiliate destination, stock and UK delivery state.

This lets the same real product be stocked by several retailers without duplicating its design identity.

See `database/README.md`.

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

Stages 1–5 are implemented.

Stage 5 is deployed to the dedicated Neon project `small-glitter-35907125` in AWS London. The live catalogue currently contains the structured taxonomy and is ready for curated retailer/product ingestion.
