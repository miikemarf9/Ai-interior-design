# Controlled build plan

## Stage 1 — Foundation + visual identity
Status: complete.

## Stage 2 — Premium homepage
Status: complete.

## Stage 3 — Design my room intake
Status: complete.

- Real room photo upload + preview
- Keep / replace categories
- Image-led style discovery
- Colour + material preferences
- Dislikes
- Lifestyle requirements
- Whole-room budget
- Optional measurements
- Creative freedom
- Final pre-AI review

## Stage 4 — AI design brief
Status: implemented.

- Stage 3 → written interior-design proposal
- Real server-side AI endpoint using the Responses API when configured
- Safe deterministic preview when no API key exists
- Individual brief-section editing
- Natural-language "ask to change something" interaction
- Approve / unlock design direction
- 0-credit brief creation and revisions
- 3-free-render credit policy defined
- Purchase-earned credit ledger architecture defined
- No image render is triggered in this stage

Production requirement before launch:
- Add OPENAI_API_KEY securely to the deployment environment
- Set/confirm OPENAI_BRIEF_MODEL
- Add authenticated database persistence in the product/account stages

## Stage 5 — UK product database
Status: next.

- Retailers
- Canonical products
- Retailer offers
- SKU/ID
- Categories
- Price/currency
- Dimensions
- Colour/material/style tags
- Room type
- Imagery
- Product + affiliate URL
- Stock / UK delivery
- Last-updated timestamps
- AI-selection metadata

## Stage 6 — Product intelligence
## Stage 7 — Image generation + credit enforcement
## Stage 8 — Designed-room experience
## Stage 9 — Affiliate commerce
## Stage 10 — Accounts + saved homes
## Stage 11 — Verified Room V1
## Stage 12 — Growth engine
## Stage 13 — Beta hardening + launch
