# Stage 5: living-room generation pilot

## Result: real-product pilot not run

The cleared catalogue contains zero products. No actual room image was generated during this stage, no retailer imagery was substituted, and no provider charge was incurred by the implementation tests. Actual image quality, latency and commercial unit cost remain unmeasured. Bedrooms remain blocked. The homepage and navigation are unchanged.

## Implemented

- Revalidate the approved collection and exact variant references before generation; block an empty cleared catalogue before database access or credit spending.
- Require a stored customer photo, approved brief, selected quantities and explicit placement instructions for every product. Keep input snapshots with each attempt.
- Send the original room and cleared product photographs, exact variants, dimensions, quantities and placements. Preserve architecture, perspective and retained furniture in the instructions. Keep prices and labels outside the generated image.
- Derive output proportions from the source image. This reduces cropping risk but cannot guarantee architectural fidelity.
- Show the source and result with individual product references and a saved human checklist: architecture, retained furniture, count, shape, finish and placement. Uncertain checks require correction; a visual pass never certifies fit or an exact product match.
- Permit up to two deliberate corrections after saved review findings. Reuse the source, approved references and previous result. Claim each correction once and stop after a technical correction failure for manual review.
- Record duration, available provider token usage, estimated image cost and correction count in existing generation records. Unknown usage or unpriced models remain unknown. Estimates use standard uncached rates, exclude other services and human review, and are not invoices.
- Remove automated claims that high visual confidence or a basic room-size envelope proves a verified match or fit.

## Validation and limits

Production build and TypeScript checks pass. Synthetic tests cover placement completeness, product checks, prompt reference order, quantities, aspect-ratio requests, cost uncertainty, correction limits, duplicate correction claims, refund error reporting and the empty-catalogue boundary. Fixtures are not real product or image-quality evidence.

Live database persistence, email/account readiness, provider configuration, actual paid generation and human comparison still require a real pilot. Browser visual QA was unavailable in this environment. The older optional AI product assessment is advisory and does not verify source-room geometry. Image-generation estimates do not include that assessment's cost.

## Smallest next pilot

1. Clear a small living-room collection, documenting permission for each exact product photograph and its use in AI visualisation. Confirm current variants, dimensions, quantities and offers.
2. Upload a real customer-authorised living-room photograph, approve its editable brief and collection, and provide placement instructions. Confirm a verified account, credit balance and working database/provider configuration.
3. Generate once. Compare source architecture and retained furniture, then each major product's count, silhouette, finish and placement. Save the findings, including uncertainty or hidden items.
4. If needed, describe a specific correction and generate deliberately, at most twice. Stop on a repeated failure; do not advertise the result as an exact match or guaranteed fit.
5. Record image cost estimates, any additional assessment costs, total elapsed time, human-review time and correction count. Report whether the result is commercially usable before expanding to bedrooms.

Provider request and pricing references checked 11 October 2026:
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
