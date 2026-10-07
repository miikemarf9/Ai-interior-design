# Stage 5 — curated UK product catalogue

This directory defines the commerce catalogue without coupling it to the existing Grab&Book Supabase project.

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

When the dedicated interior Supabase project exists:

1. Apply `catalog_schema.sql`.
2. Apply `catalog_seed_taxonomy.sql`.
3. Run `catalog_verification.sql`.
4. Run Supabase Security and Performance Advisors.
5. Generate TypeScript database types from the live project and replace the temporary catalogue types where appropriate.

Do not apply these files to the existing Grab&Book project.

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

## Public access

Catalogue tables use RLS. Anonymous and authenticated users are granted **SELECT only** on curated/active catalogue records.

Import/sync history, quality issues and price history are not publicly exposed.

All catalogue mutations should come from trusted backend/feed-processing code, never directly from a public browser client.

## Feed secrets

Do not store private affiliate/API credentials in `catalog_sources.public_config` or any catalogue row. Put secrets in the deployment/Supabase secret store and keep only non-secret source configuration in Postgres.
