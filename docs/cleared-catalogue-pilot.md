# Cleared catalogue pilot — Stage 4

Stage 2 (11 October 2026) cleared **zero products**. The application deliberately
ships with an empty `CLEARED_CATALOGUE` register. Research candidates, active
retailers and curated database records do not establish permission.

## Enabling an approved pilot collection

1. Obtain and review the Stage 2 product data and separate permissions for image
   display, AI reference processing and customer-facing generated outputs. Confirm
   provider restrictions and expiry/withdrawal terms. Marketing permission is
   separate; this step does not change the homepage.
2. Import verified product/variant/offer records using the existing catalogue
   workflow. Check the exact size, upholstery/finish, GBP selling-unit price,
   quantity per pack, dimensions, material details, stock, destination and delivery.
3. Add a reviewed entry to `lib/catalog/clearance.ts`, identifying the exact product,
   variant, offer and approved photograph. Evidence fields contain references to
   approval records, not private correspondence. Set a review and expiry date.
   Do not use a generic model photograph for a different variant.
4. Delivery basis is `unknown` unless the recorded fee is confirmed for the stated
   unit or retailer order. Conditional/postcode-dependent fees stay unknown until
   the conditions can be established. Use delivery details for lead times, access,
   assembly and postcode limitations.
5. Check the Vercel database connection against the intended catalogue. The prior
   connection error remains unverified: an empty register avoids a database query,
   which is a clearance gate, not a database repair.
6. Run the selection tests, then verify real photographs, variant destinations,
   mobile layout, current prices, approved swaps and a saved customer collection
   against the imported data. Do not claim the real-product pilot is complete until
   this has passed.

## Selection behaviour

- Only currently cleared entries are queried. Offer checks older than seven days,
  unknown prices, missing variant photographs and unavailable offers are excluded.
- Retained names and photo-marker labels inform category exclusions. Ambiguous
  labels and unstructured practical requirements still need human review.
- Requested changes limit the categories. Unmatched requested categories remain
  visible as missing items; the total is not presented as a complete room price.
- At most three alternatives appear per slot. Pack quantity is explicit; totals
  use selling units, not individual pieces in a pack.
- Known per-order delivery is counted once per retailer. Unknown/conditional or
  conflicting fee bases are not treated as free delivery.
- Fit remains unverified even when supplied room dimensions eliminate obvious
  size conflicts. No layout, access or retained-furniture geometry is inferred.
- Saved browser data is rechecked before displaying photographs. Approval compares
  variants, quantities, offers, images, dimensions, delivery and the known total
  with the server's current recommendation. Changes require another review.
- The render boundary also checks current clearance and uses only the approved
  variant image and pack-adjusted quantity. Stage 4 does not validate generated
  image fidelity or complete the subsequent image-generation stage.

## Checks

`node scripts/test-product-selection.cjs`

`node scripts/test-room-brief.cjs`

`npm run build`

Automated selection tests use synthetic fixtures only. No test fixture is loaded
by the application, added to the live catalogue or represented as a retail offer.
