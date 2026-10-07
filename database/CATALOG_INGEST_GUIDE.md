# Catalogue ingestion plan

The first catalogue should be deliberately curated rather than broad.

## Initial target

Aim for roughly **500–800 strong living-room products** before expanding toward 2,000.

Suggested starting balance:
- 100 sofas
- 80 armchairs / footstools
- 100 coffee / side tables
- 80 TV units / storage / shelving
- 70 rugs
- 100 lighting products
- 70 mirrors / artwork / cushions / throws / selected accessories

The exact mix should follow customer demand rather than fixed quotas.

## Retailer strategy

Start with a small set of UK retailers whose affiliate/product-feed terms explicitly permit the intended use.

Prefer retailers with:
- reliable structured feeds or APIs
- dependable GBP pricing
- UK stock / delivery data
- strong product photography
- consistent product identifiers
- useful dimensions
- broad enough coverage to build a complete room
- commercially viable affiliate terms

Do not add a retailer solely because it has a huge catalogue.

## Ingestion sequence

1. Receive source record from approved feed/API/manual curation.
2. Resolve retailer.
3. Resolve or create canonical brand.
4. Match canonical product using, in order:
   - EAN/GTIN when reliable
   - manufacturer product ID
   - manufacturer SKU + brand
   - controlled manual match
5. Resolve/create the exact variant.
6. Upsert the retailer offer.
7. Append price/availability history when the commercial state changes.
8. Attach/reference product imagery.
9. Apply category/style/material/colour taxonomy.
10. Run quality checks.
11. Keep incomplete records as draft.
12. Only mark product + variant active/curated after review.

## Why matching matters

The same physical chair could appear in two retailer feeds.

Bad structure:
- "Chair at Retailer A"
- "Chair at Retailer B"

Correct structure:
- Canonical chair
  - Exact variant
    - Retailer A offer
    - Retailer B offer

That lets Stage 6 choose the chair for design reasons first, then choose the best valid offer separately.

## Units

Store:
- money as integer minor units (pence)
- dimensions in millimetres
- weight in grams
- currency as ISO three-letter code
- timestamps in UTC

Display conversion belongs in the application layer.

## Refresh cadence

During beta:
- price / availability: target at least daily when the source permits
- volatile or promotional feeds: more frequently if commercially justified
- product descriptive metadata: refresh when source changes
- images: do not repeatedly re-download unchanged assets

A retailer offer whose commercial data is stale should lose selection confidence before it disappears entirely.

## Quality gate

Blocking examples:
- no category
- no primary image
- no current GBP price
- no active UK retailer offer
- missing required dimensions for furniture

Warning examples:
- availability unknown
- UK delivery unknown
- missing style/material/colour tags
- last commercial check older than seven days

The TypeScript helper in `lib/catalog/quality.ts` mirrors this logic for application-side QA.

## Legal / commercial rule

Only ingest and display retailer content in ways permitted by the relevant feed, API, affiliate programme and image/content licence. Do not scrape retailer pages into a permanent commercial catalogue when the terms do not permit it.
