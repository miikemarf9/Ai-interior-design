# Roomfound customer-readiness audit — 12 October 2026

## Verdict

**Not ready for a small end-to-end customer pilot or wider promotion.** The illustrative homepage can be demonstrated, but a live room upload failed and no furniture is cleared for the real-product pilot. No paid generation or real retailer purchase journey was completed. Existing green checks do not establish customer readiness.

Audited application commit: `08d2f98d994727df7ca8a780be0dd6271789190d`.
This stage changes only this report, not application code, the hero, catalogue or database schema. Tests attempted to save a disposable room using an existing public demonstration image; both upload and the built-in example fallback reported failure. Partial test records may need checking in the server logs/database. No private customer image was used.

## Evidence and coverage

| Area | Result | Evidence / limit |
| --- | --- | --- |
| Desktop homepage | Pass for tested controls | Live Chrome browser: coffee-table hotspot selected the correct £245 illustrative detail; three product controls and the explicit illustrative disclosure were present. |
| Room upload | **Live failure** | A valid existing WebP selected successfully, then displayed “The room photograph could not be stored.” Continue remained disabled. The built-in example-room fallback produced the same result. Root cause not established; inspect deployment/server/database logs. |
| Brief and retained furniture | Fixture pass; live blocked | Existing tests cover room-specific briefs, retained photo markers, uncertain measurements, ownership-scoped metadata and brief revisions. The live upload failure prevented progressing to these steps. |
| Product selection | Fixture pass; real collection blocked | Five existing test scripts all passed. Selection fixtures reject uncleared, stale, unpriced, oversized and withdrawn candidates; reapproval handles changed prices and quantities. Actual clearance register contains zero products. |
| Generation | Correctly blocked live | Pilot endpoint reports no cleared collection; render endpoint returns 409 PILOT_CATALOGUE_NOT_READY. Provider image accuracy, actual runtime, usage costs and result persistence remain untested. |
| Failure / correction handling | Mocked pass, additional retry issue | Provider failure/refund-error fixtures and two-correction cap pass. No live credit debit/refund transaction was performed. A zero-balance render request returns NO_RENDER_CREDIT before the idempotency lookup; recovery of a completed last-credit request depends on history rather than retrying the request. |
| Hotspots and product cards | Fixture pass; real image unchecked | Image-bound IDs, coordinate bounds, hidden/missing omission, ownership and clearance checks pass. Earlier DOM tests cover list fallback and keyboard focus. No generated real-product room exists for visual placement verification. |
| Post-generation alternatives | **Reproduced totals defect** | A synthetic £1,000 item + £50 delivery swapped to an £800 item + £70 delivery yielded total £800, while stored subtotal remained £1,000 and delivery £50. Correct total is £870. The initial selection calculator is correct; applyPendingAlternative does not reuse it. Server reapproval may block the inconsistent selection, so do not describe this as a confirmed incorrect charge. |
| Retailer destinations | **Latent launch blocker reproduced with mocks** | commerce/offers and go/[offerId] check active/in-stock flags but do not apply the clearance register or price freshness limit. A synthetic active offer dated 2020 was returned and redirected to example.invalid with an empty clearance register. No real retailer was contacted or approved. Direct endpoints must fail closed independently of UI filtering. |
| Illustrative versus verified claims | **Mixed message** | Below-hero examples and £3,000 spending plan are clearly labelled. The preserved hero still says “real products” and “Design a room you can actually buy”, and presents a bedroom journey despite bedroom generation being blocked. This needs explicit beta expectation-setting before inviting customers. Hero copy was not changed during the audit. |
| Hero regression | Partial live pass | Both image pairs loaded and had matching rendered dimensions within each pair. Desktop slide selection and pause worked; bedroom labels included £795 bed and £395 bedside pair. Navigation anchor worked, header hid after scrolling and returned to transparent at the top. Protected hero/header/global-style/image files are unchanged from Stage 6. No frame-by-frame five-second timing or pixel-difference certification. |
| Mobile | **Not visually verified** | Responsive styles and prior narrow-width DOM tests exist, but the available browser interface exposes no supported viewport/emulation control. A real phone or supported mobile browser session is still required. Do not count DOM fixtures as mobile visual testing. |
| Build / typecheck | Pass | Fresh production build and TypeScript check passed. All five existing scripts passed. |
| Dependency / deployment checks | Qualified pass | Hosted GitHub validate and Vercel deployment status for the audited application commit were success. Local npm audit could not run: ENOLOCK, no project lockfile. CI installs dependencies before auditing. Commit a lockfile for reproducibility; no new dependency vulnerability was established by this failure. |

## Specific fixes before the customer pilot

1. Restore upload/storage and verify retrieval and session resumption using a disposable photo. Inspect actual server errors rather than guessing that this is a particular database setting.
2. Establish one cleared living-room collection with exact variants, image-use permissions, dimensions, pack quantities, dated prices and genuine retailer destinations. Keep generation blocked until this is ready.
3. Reuse selectionTotals/applySelectionChoices for post-generation swaps; recompute subtotal, known delivery, unknown-delivery state and remaining budget together. Reapprove changed quantities and offers before generation.
4. Apply clearance, variant/offer identity, GBP/valid-price, availability and freshness checks at the retailer-offer and redirect endpoints. Reconcile updated prices with saved totals; visibly distinguish saved and current prices. Test unavailable destinations and safe URL handling without tracking a fictional sale.
5. Resolve the hero's beta expectations without changing its approved visual design. Make the limitation clear at the first CTA, not only below the fold. Obtain approval for any change to protected hero copy.
6. Check completed-request recovery before rejecting for zero balance. Exercise two concurrent duplicate requests, a lost connection, a provider timeout and a failed refund against an isolated test database; prove one debit per attempt and one refund where applicable. Check abandoned processing records and support recovery.
7. Complete one real internal living-room run, followed by desktop and physical-mobile acceptance checks for upload, retained markers, variants/quantities, image review, corrections, hotspot positioning and exact retailer destinations.

## Short pilot after those gates pass

Run a supervised one-week living-room pilot with five homeowners, preceded by two internal end-to-end runs. Include an empty room, an existing room with retained furniture and at least two mobile participants. Do not charge for unproven shopping functionality or promote bedrooms.

Record a small consented session log linking each brief, selection snapshot, generation attempt and outcome. Existing feedback and commerce-event code are starting points, not verified reporting. Check metric collection before recruitment and distinguish illustrative interactions from genuine product/retailer clicks.

| Measure | What to record |
| --- | --- |
| Completion | Started uploads → saved photos → approved briefs → approved collections → reviewed designs → furniture explored; completion time and exact abandonment step. |
| Design satisfaction | 1–5 score, willingness to use the design, and one reason; separately record architecture, retained furniture and each major product's likeness/placement. |
| Product interest | Unique real-product views and genuine retailer clicks per participant; track exact variant and image. A click is not a purchase. |
| Generation economics | Provider usage/cost or explicitly unknown cost, latency, number of corrections, failed requests/refunds and human-review minutes. Include optional visual-assessment costs separately. |

Suggested go/no-go criteria to agree before starting: at least four of five complete the assisted journey, median satisfaction at least 4/5, no wrong variants or unexplained totals, no credit-accounting errors, and a known full cost per accepted room within your chosen margin. Product-click interest is exploratory at this sample size, not evidence for scalable conversion. Resolve all critical defects before wider promotion.
