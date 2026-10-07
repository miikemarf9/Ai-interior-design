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
- `/room` — immersive designed-room result, hotspots, product drawer and swaps
- `/room/share/[token]` — explicit public share view of a finished room
- `/account` — sign in, verification, design credits and My rooms
- `/reset-password` — secure password-reset completion
- `/style-guide` — internal design system

## Product catalogue principle

**Product ≠ retailer offer.**

The canonical product and variant describe what the item actually is. Retailer offers describe where it can be bought, the current price, affiliate destination, stock and UK delivery state.

This lets the same real product be stocked by several retailers without duplicating its design identity.

See `database/README.md`.

## Credit principle

New verified accounts receive **3 free design credits**.

- Written brief creation: free
- Written brief revisions: free
- Future room image generation: 1 design credit
- Future room regeneration: 1 design credit
- Confirmed qualifying purchase: planned +1 reward credit

See `CREDIT_POLICY.md`.

## Working name

`Roomfound` is still a working product name and is isolated in `lib/site.ts`.

## Current stage

Stages 1–12 are implemented.

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

Development credits remain disabled by default. Stage 10 verified accounts now own production credit wallets and receive the one-time 3-credit signup grant after email verification.


## Continuous integration

GitHub Actions runs `npm run typecheck` and `npm run build` on pushes to `main` and on pull requests.


## Stage 8 designed-room experience

The finished room is separated from the technical generation interface. The owner gets a full-screen room, before/after comparison, product hotspots, persistent room total, a product drawer and staged cheaper/similar/premium swaps.

Public share tokens expose the finished render and safe design/product data only. They never expose the original room photograph or owner key.


## Stage 9 affiliate commerce

Retailer CTAs route through `/go/[offerId]`. The server resolves the current database offer, records the click, appends Roomfound's Awin `clickref` to an approved affiliate URL and redirects.

Tracked funnel:
- product viewed
- swap alternatives viewed
- retailer clicked
- expected commission / expected revenue where programme KPIs are known
- Awin conversion status and actual commission where supplied

A product remains a canonical product/variant even if one retailer changes price or becomes unavailable. The designed-room drawer loads current offers for the variant and can show another retailer without deleting the product from the design.

Awin programme and transaction sync remain inactive until `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID` and `COMMERCE_SYNC_SECRET` are configured.


## Stage 10 accounts + saved homes

Roomfound now has native customer accounts backed by Neon:

- email + password sign-up/sign-in
- scrypt password hashing
- HTTP-only 30-day session cookies
- email verification
- password reset
- 3-credit grant once the email is verified
- anonymous room claiming on signup/sign-in
- account-owned room uploads and private assets
- `My rooms` dashboard
- original room photo
- latest generated design
- saved brief
- saved product selection
- saved room total
- persistent design-credit balance
- default `My home` container with schema support for multiple homes later
- saved rooms can be reopened on another device

Account emails use Resend's HTTP API. Configure `APP_URL`, `RESEND_API_KEY` and `AUTH_FROM_EMAIL` before public verification/reset email delivery.

### Grab&Book CRM bridge

Roomfound does not duplicate CRM functions. Customer lifecycle events are written to `crm_outbox` and linked to a `grabandbook` CRM provider record. A protected sync worker can forward those events once Grab&Book exposes a dedicated authenticated CRM-ingestion endpoint.

Until then the bridge is deliberately dormant rather than writing directly into Grab&Book's internal tables.


## Stage 11 Verified Room V1

Verified Room is evidence attached to the exact generated room, not a generic badge.

V1 checks:
- real canonical product and exact variant
- current UK availability
- price freshness
- complete product dimensions
- room measurement availability
- basic product-vs-room envelope fit
- visual similarity between the finished render and exact product reference images

Price and availability evidence is refreshed from the live catalogue when the owner reopens the room. The visual comparison is stored against the generation because the rendered pixels and selected product references do not change.

The visual check uses the Responses API with the final render plus exact product reference images and returns an uncertainty-aware confidence assessment. It does not verify physical fit.

V1 explicitly does not claim to verify clearances, doorway access, circulation, wall placement, exact scale/proportion or colour accuracy under all lighting conditions.


## Stage 12 growth engine

The SEO system publishes visual database-backed pages rather than long-form filler.

Routes:
- `/ideas` — visual discovery hub
- `/ideas/[slug]` — themed real-room collection
- `/rooms/[slug]` — one public real design with current live products/prices
- `/api/growth/social/[designId]/[format]` — owner-authorized social creative

A collection is `noindex,follow` until it has at least 3 published real rooms. The sitemap only includes collections that clear that threshold.

Publishing is editorially protected by `GROWTH_ADMIN_SECRET` and requires:
1. a successful room generation,
2. an active public Roomfound share,
3. a stored Verified Room record.

Public SEO pages expose the finished room only. The customer's original room photo is never published by the SEO system. The owner can separately generate a Before → After → Shop this room social creative.

The social generator supports Pinterest 2:3, Instagram 4:5, vertical Story/Reel 9:16 and Facebook landscape outputs.

Abandoned-design recovery uses a protected scanner and never assumes consent. Only a verified account with explicit marketing-email consent and no opt-out can generate a `design_abandoned` event in the existing Grab&Book CRM outbox.
