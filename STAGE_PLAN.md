# Controlled build plan

## Stage 1 — Foundation + visual identity
Status: complete.

## Stage 2 — Premium homepage
Status: complete.

## Stage 3 — Design my room intake
Status: complete.

## Stage 4 — AI design brief
Status: implemented.

- Structured interior-design proposal
- Server-side AI endpoint
- Manual section editing
- Natural-language brief revisions
- Design-direction approval
- Free brief / paid-render boundary
- 3-free-render credit policy
- Purchase-earned credit architecture

## Stage 5 — Real UK product database
Status: live on Neon; ready for curated retailer/product ingestion.

Implemented:
- Dedicated Neon/Postgres project in AWS London
- Canonical retailers and brands
- Product → variant → retailer-offer separation
- Retailer SKU and external product IDs
- Hierarchical living-room categories
- Style / material / colour taxonomies
- Variant dimensions in millimetres
- Product and variant imagery
- GBP prices + comparison prices
- Availability / stock
- UK delivery status / cost / ETA
- Product and affiliate URLs
- Current offer timestamps
- Append-only price / stock history
- Feed/source records + sync-run audit
- Catalogue quality issues
- Curation and quality scores
- Production indexes for selection, freshness and feed-candidate review
- Initial living-room taxonomy seeds
- TypeScript catalogue domain types
- Catalogue quality-scoring helper
- Neon-native schema at `database/catalog_schema_neon.sql`
- Server-side Neon connection helper

Live production verification:
- 19 catalogue tables, including affiliate-feed quarantine
- 18 categories
- 8 styles
- 17 materials
- 17 colours
- 2 configured Awin retailer sources: Wayfair UK and The Range
- 0 canonical products / offers until reviewed feed candidates are promoted

Live-data target:
- Start with 500–2,000 curated living-room products.
- Do not bulk-publish poor feed records.
- Only curated, active records become customer-visible.

Security model:
- `DATABASE_URL` stays server-side.
- No public browser database credential.
- Catalogue mutations and feed ingestion run through trusted backend code.
- Public catalogue APIs will expose only the fields/records deliberately returned by the application.

## Stage 6 — Product intelligence
Status: implemented; waiting on live retailer/product ingestion for real selection results.

Implemented:
- Live Neon catalogue query only; no invented fallback products
- Hard eligibility filters for curated/active products, UK delivery and orderable availability
- Whole-room budget allocation by furniture slot
- Retained-item detection so furniture being kept is not re-selected
- Room-dimension fit checks where measurements exist
- Weighted scoring for style, colour, materials, budget, dimensions, curation, quality, freshness and availability
- Proposed furniture set before rendering
- Per-product match score and selection rationale
- Cheaper alternative
- Similar alternative
- Premium alternative
- Customer-controlled swaps with whole-room total recalculation
- Over-budget approval protection
- Product-set approval stored separately from brief approval
- 0 render credits used throughout product selection
- Approved product set becomes the hard input for Stage 7 rendering

Current live-data dependency:
- Awin feed ingestion and promotion code is implemented.
- Wayfair UK and The Range are configured as the first production retailer sources.
- Feed rows land in a quarantine table and cannot become customer-visible automatically.
- The remaining external dependency is an approved Awin publisher/feed URL for at least one retailer.
- Stage 6 deliberately returns an honest empty state until reviewed real products are promoted.

## Stage 7 — Image generation + credit enforcement
Status: implemented; production credit activation waits for verified accounts in Stage 10.

Implemented:
- Durable original-room asset upload
- Private server-side image asset delivery
- OpenAI image-edit engine using the original room + approved real product references
- Pinned `gpt-image-2.5-sunburst-2026-09-08` default
- Prompt versioning (`room-render-v1`)
- Room geometry / retained-furniture / measurement / product constraints
- Real-product revalidation immediately before rendering
- Maximum 15 product references + original room (16 image inputs total)
- Atomic one-credit spend before provider invocation
- Immutable credit ledger
- Explicit balance cache with non-negative enforcement
- Idempotent render-spend keys to prevent double-click double charging
- Successful regeneration costs another credit
- Provider/technical failures are logged and automatically refunded
- Provider + model + prompt + product IDs + duration + usage + calculated cost logging
- Result/failure state persisted per generation
- Customer-facing “Editing your brief — Free” vs “Generate your room — 1 credit” boundary
- Development wallet mode guarded by server environment flag and disabled by default

Pre-public dependency:
- Stage 10 verified accounts must replace development-session ownership before public paid rendering.
- Binary assets should move from Postgres bytea to dedicated object storage before meaningful scale.
## Stage 8 — Designed-room experience
Status: implemented; becomes fully populated once real catalogue products and renders exist.

Implemented:
- Dedicated `/room` emotional-payoff experience
- Full-viewport finished room image with minimal chrome
- Persistent whole-room total
- Draggable before/after comparison for the room owner
- Interactive product hotspots
- Product strip beneath the room
- Product drawer with retailer, availability, dimensions, match score and rationale
- Cheaper / similar / premium alternatives
- Swaps staged for the next version instead of falsely changing the current image
- Separate pending next-version total
- Updated room generation remains an explicit 1-credit action
- Explicit per-generation share links
- Public share view exposes only finished render + safe product/design data
- Original room photograph and owner key are never exposed through sharing
- Native Web Share with clipboard fallback
## Stage 9 — Affiliate commerce
## Stage 10 — Accounts + saved homes
## Stage 11 — Verified Room V1
## Stage 12 — Growth engine
## Stage 13 — Beta hardening + launch
