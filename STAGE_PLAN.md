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
- 53 production indexes for selection and freshness queries
- Initial living-room taxonomy seeds
- TypeScript catalogue domain types
- Catalogue quality-scoring helper
- Neon-native schema at `database/catalog_schema_neon.sql`
- Server-side Neon connection helper

Live production verification:
- 18 catalogue tables
- 18 categories
- 8 styles
- 17 materials
- 17 colours
- 0 products / offers until curated feeds are ingested

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
Status: next after live catalogue project/data connection.

## Stage 7 — Image generation + credit enforcement
## Stage 8 — Designed-room experience
## Stage 9 — Affiliate commerce
## Stage 10 — Accounts + saved homes
## Stage 11 — Verified Room V1
## Stage 12 — Growth engine
## Stage 13 — Beta hardening + launch
