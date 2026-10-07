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


## Feed quarantine and promotion

Affiliate feeds never write directly into `products`.

Flow:

```
authorized Awin feed
  → normalize + filter
  → catalog_feed_candidates (pending)
  → review / curation
  → canonical brand
  → product
  → variant
  → taxonomy links
  → retailer offer
  → product image
  → price history
```

The import endpoint caps each category during a run so a very large retailer feed cannot overwhelm the review queue.

Candidates currently need a normalized living-room category, GBP price, current orderable availability and a product image before they are staged as useful records. Promotion has a second quality threshold and remains explicit.

Initial Awin retailer sources configured in production:
- Wayfair UK — advertiser `72067`
- The Range — advertiser `5238`

Private Awin feed URLs/API keys are never stored in Neon. `catalog_sources.public_config` contains only the environment-variable name expected by the server.


## Stage 7 render data

Apply `render_schema_neon.sql` after the catalogue schema for a fresh environment.

It adds:
- `room_designs`
- `design_assets`
- `design_credit_wallets`
- `design_credit_ledger`
- `render_generations`

Each generation logs the provider, exact model, prompt version/text, selected product UUIDs, status, OpenAI request ID, token usage, calculated API cost, duration, result asset and failure details.

Credit balance is updated atomically before the provider call. The immutable ledger is the audit trail. Technical/provider failures insert a refund ledger event and restore one credit.

The current asset backend is explicitly marked `postgres_bytea_mvp`. It is suitable for controlled development and early testing, not high-volume image storage.


## Stage 8 room sharing

Apply `room_experience_schema_neon.sql` after `render_schema_neon.sql` for a fresh environment.

`room_shares` creates a revocable public token for one successful generation. Shared APIs expose the finished render and safe design/product data only. They do not expose the original room photograph or `owner_key`.


## Stage 9 affiliate commerce

Apply `affiliate_commerce_schema_neon.sql` after the Stage 8 schema for a fresh environment.

Tables:
- `affiliate_programs` — programme IDs, membership state, commission range and Awin KPIs
- `commerce_events` — product views, swap views and retailer clicks
- `affiliate_clicks` — exact clickref attribution plus expected economics at click time
- `affiliate_conversions` — pending/approved/declined/deleted transaction states from the network
- `affiliate_sync_runs` — programme and transaction import audit

Roomfound uses the canonical product/variant as the stable object and retailer offers as replaceable commercial destinations. Price or availability changes therefore do not delete the designed product.

Expected revenue is nullable by design. It is only populated when Awin supplies programme economics. Awin EPC is preferred when available; otherwise the fallback estimate uses commission rate × conversion rate × approval percentage.
