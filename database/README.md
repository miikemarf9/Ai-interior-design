# Stage 5 — curated UK product catalogue

This directory defines the commerce catalogue on a dedicated Neon/Postgres project, independent of Grab&Book.

## Core rule

**Product identity is not a retailer offer.**

A canonical product can have one or more variants. A variant can then have one or more retailer offers with different SKUs, prices, affiliate destinations, availability and delivery terms.

```
brand
  └─ product
       └─ variant
            ├─ retailer offer A
            ├─ retailer offer B
            └─ retailer offer C
```

That means a price or stock change does not rewrite the underlying product.

## Apply order

Production is Neon project `small-glitter-35907125` in AWS London.

For a fresh Neon environment:

1. Apply `catalog_schema_neon.sql`.
2. Apply `catalog_seed_taxonomy.sql`.
3. Run `catalog_verification.sql`.
4. Verify table/index counts and query performance.
5. Configure server-side `DATABASE_URL`.

`catalog_schema.sql` is retained as the original Supabase-oriented version for history/reference.

## Catalogue scope

MVP target: **500–2,000 high-quality living-room products**.

Prioritise:
- sofas
- armchairs / footstools
- coffee and side tables
- TV units / storage
- rugs
- lighting
- selected curtains / mirrors / artwork / cushions / throws

Do not ingest a giant feed just because it exists. A product should not be made selectable until it has enough structured data to make a defensible recommendation.

## Minimum quality gate

A variant should generally not become public/selectable until it has:
- a canonical product
- primary category
- at least one image
- width / height / depth where the category reasonably requires them
- at least one active UK retailer offer
- current price in GBP
- availability state
- UK delivery state
- style tags
- primary colour
- material information where available
- recent `last_checked_at`
- curation / quality score above the chosen launch threshold

The schema deliberately supports incomplete draft records so feed ingestion does not force bad products into the customer experience.

## Price history

`retailer_offers` holds the current commercial state.

`offer_price_history` is append-only history for:
- price changes
- stock changes
- future "price checked" trust signals
- diagnosing stale feeds

## Images

`product_images` can reference:
- a canonical product
- a specific variant
- optionally the retailer offer the image came from

This matters later for Verified Room because the visual checker needs to know which real reference images correspond to the exact variant/offer.

## Application access

The Neon catalogue is server-side by default. The browser does not receive a database credential.

Customer-facing catalogue endpoints should query Neon from trusted Next.js/server code and return only curated, active records required by the UI.

Import/sync history, quality issues and price history remain backend concerns. All catalogue mutations should come from trusted backend/feed-processing code, never directly from a public browser client.

## Feed secrets

Do not store private affiliate/API credentials in `catalog_sources.public_config` or any catalogue row. Put secrets in the deployment environment/secret store and keep only non-secret source configuration in Postgres.
