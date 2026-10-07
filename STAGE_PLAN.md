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
Status: implemented; production credit activation is now backed by Stage 10 verified accounts.

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

Remaining scale dependency:
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
Status: implemented; real commission validation waits for approved publisher/programme access.

Implemented:
- First-party commerce event tracking
- Product-view event when a product drawer is opened
- Swap-view event only when cheaper/similar/premium alternatives are opened
- Server-side retailer-click event before leaving Roomfound
- Stable Roomfound commerce session key
- Current retailer offers resolved live from the variant, not frozen to the render snapshot
- Same product can remain available through another retailer offer if one retailer changes price or drops out
- `/go/[offerId]` first-party redirect
- Roomfound click reference appended to Awin affiliate destinations
- Exact design / generation / product / variant / offer / retailer attribution per click
- Affiliate network, advertiser ID and publisher ID captured where available
- Sale-value snapshot captured at click time
- Expected commission captured when programme commission terms are known
- Expected revenue per click uses Awin EPC where available, otherwise programme conversion + approval + commission estimates
- Awin programme-details sync endpoint
- Awin transaction sync endpoint with maximum 31-day window
- Pending / approved / declined / deleted conversion states
- Conversion reconciliation back to Roomfound clickref
- Raw affiliate transaction payload retained for audit
- Internal commercial-validation metrics endpoint
- No invented commission or conversion numbers before Awin supplies programme data

External dependency:
- Awin publisher approval / API token / publisher ID.
- Retailer programme approval and authorized affiliate destinations.
- Once credentials exist, sync programme terms before interpreting expected revenue.
## Stage 10 — Accounts + saved homes
Status: implemented; transactional email delivery requires deployment secrets.

Implemented:
- Native Roomfound customer accounts
- Email + password sign-up/sign-in
- Scrypt password hashing
- HTTP-only SameSite session cookie
- 30-day server-side sessions with revocation
- Email verification token flow
- Password-reset token flow
- Verification/reset emails via Resend REST API
- One-time 3 design-credit grant after verified email
- Account-linked production credit wallet
- Anonymous room ownership claimed when signing up or signing in
- Logged-in room uploads automatically attached to the account
- Account-authorized private room/render assets
- `My rooms` dashboard
- Original photo + current design thumbnails
- Brief title/direction persisted
- Product selection + room total persisted
- Resume unfinished room from its saved stage
- Open finished room on another device via authenticated design ID
- Default `My home` record
- Data model supports multiple homes later without migrating room ownership
- `crm_contact_links` integration table
- Durable `crm_outbox` for account/verification/room lifecycle events
- Protected Roomfound-side Grab&Book bridge worker
- No direct dependency on Grab&Book internal database/tables

Deployment dependencies:
- `APP_URL`
- `RESEND_API_KEY`
- `AUTH_FROM_EMAIL` using a verified sender/domain
- Optional future `GRABANDBOOK_CRM_ENDPOINT` + bridge secret once Grab&Book exposes ingestion
## Stage 11 — Verified Room V1
Status: implemented; visual checks activate when an OpenAI API key and real product/render images are available.

Implemented:
- Generation-specific verification record
- Product-level evidence records
- Real canonical product / exact variant check
- Current UK retailer-offer check
- Price freshness check
- Price verified threshold: <=72 hours
- Stale-price warning / failure states rather than permanent green ticks
- Full width / depth / height availability check
- Supplied room width / length / height evidence
- V1 product-vs-room envelope check
- Explicit insufficient-data state when room measurements or product dimensions are missing
- Vision comparison of finished room vs exact selected product reference images
- Per-product visual confidence score
- Visual divergence warning text
- Visual assessment cached per generation so the same render is not repeatedly charged for vision checks
- Live price/availability/dimension evidence refreshed when the owner reopens verification
- Customer-facing Verified Room panel on the designed-room page
- Product-by-product expandable evidence
- Shared rooms can display already-recorded verification without triggering new AI work
- Explicit V1 limitation language for clearances, doorways, wall space and exact scale
- No guarantee wording and no conversion of missing evidence into a pass

Advanced layer intentionally deferred:
- circulation and furniture clearances
- doorway / access-route checking
- wall-space placement
- exact layout geometry
- scale and proportion reconstruction
- deeper colour/material divergence analysis
## Stage 12 — Growth engine
Status: implemented; pages deliberately remain noindex until enough real rooms are published.

Implemented:
- Real-room SEO hub at `/ideas`
- Semantic topic collections at `/ideas/[slug]`
- Semantic public rooms at `/rooms/[slug]`
- Initial collections:
  - Small living-room ideas
  - Bay-window living rooms
  - Living rooms under £1,500
  - Warm-neutral living rooms
  - 1930s living rooms
  - New-build living rooms
- No 800-word filler requirement
- Collection pages contain real generated rooms, product counts and room totals
- Public room pages contain the real finished design and current live product offers
- Collection pages require at least 3 real published rooms before becoming indexable
- Empty/thin collections use noindex,follow
- Editorial publication requires an active public share plus Stored Verified Room evidence
- Automatic provable tagging for under-£1,500, small-room measurements and warm-neutral palette signals
- Architectural tags remain editorial unless explicitly evidenced
- Canonical URLs
- Dynamic XML sitemap
- robots.txt
- Dynamic Open Graph images from real room renders
- CollectionPage + ItemList JSON-LD
- Real-room CreativeWork JSON-LD
- Social creative generator:
  - Pinterest 2:3
  - Instagram 4:5
  - Story/Reel 9:16
  - Facebook landscape
- Social creative uses exact original room + finished render + current room total
- Original room remains owner-authenticated; SEO publication does not expose it
- Designed-room page exposes share-creative formats
- Consent-gated abandoned-design scanner
- Only verified accounts with explicit marketing-email consent can enter recovery
- Recovery produces a durable `design_abandoned` CRM outbox event
- Grab&Book remains the eventual campaign executor, not a hard Roomfound dependency

External dependencies:
- Set `NEXT_PUBLIC_SITE_URL` to the final canonical production domain before indexing.
- Real SEO pages start indexing only after real rooms are published.
- Abandoned-design campaigns remain dormant until a UI captures explicit marketing consent and Grab&Book has the receiving campaign workflow.
## Stage 13 — Beta hardening + launch
