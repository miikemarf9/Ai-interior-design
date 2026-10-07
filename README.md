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

The Neon-native schema is `database/catalog_schema_neon.sql`; taxonomy and verification SQL live alongside it in `database/`. Affiliate rows first land in `catalog_feed_candidates`, where they remain invisible to customers until explicitly promoted.

## Current routes

- `/` — premium consumer homepage
- `/design` — 10-step Design My Room consultation
- `/brief` — free editable written design brief
- `/products` — real-product proposal, alternatives and pre-render approval
- `/render` — metered image generation using the approved room + real products
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

Stages 1–6 are implemented.

Stage 5 is deployed to the dedicated Neon project `small-glitter-35907125` in AWS London. Stage 6 is wired to the live catalogue and deliberately refuses to invent products. The remaining pre-render dependency is approved affiliate-feed access so real products can be staged, reviewed and promoted.


## Affiliate feed ingestion

The first production feed path is Awin.

- Wayfair UK advertiser ID: `72067`
- The Range advertiser ID: `5238`
- Feed rows are normalized and quality-scored before entering the quarantine table.
- Nothing becomes selectable automatically.
- Reviewed candidates are promoted into the canonical product / variant / offer model.
- Images and affiliate deep links come from the authorized product feed rather than retailer-page scraping.

See `database/AWIN_FEEDS.md`.


## Stage 7 render engine

The render boundary is server-enforced:

- brief creation/revision: 0 credits
- product selection/swaps: 0 credits
- successful room generation: 1 credit
- successful regeneration: 1 credit
- technical/provider failure: logged and automatically refunded

The render uses OpenAI image editing with the original room as reference image 1 and the approved real products as subsequent image references.

Production logging records provider, model, prompt version, product IDs, token usage, calculated API cost, duration, result asset and failure state.

Original room photos and rendered outputs are private server assets. The current MVP uses Postgres bytea storage because Neon branchable object storage is not available in the London region. Move binary assets to dedicated object storage before meaningful scale.

Development credits are intentionally disabled by default. Set `RENDER_ALLOW_DEVELOPMENT_WALLETS=true` only in a private/local environment. Public render credits should remain blocked until Stage 10 verified accounts are connected.


## Continuous integration

GitHub Actions runs `npm run typecheck` and `npm run build` on pushes to `main` and on pull requests.
