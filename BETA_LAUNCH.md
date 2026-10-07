# Roomfound controlled UK beta launch gate

Stage 13 separates **engineering complete** from **safe to invite beta users**.

The protected endpoint `GET /api/beta/metrics` is the machine-readable launch dashboard. Send `Authorization: Bearer <BETA_ADMIN_SECRET>`.

## Automated hard gates

The dashboard returns `beta.launchReady=false` while any hard gate fails:

- canonical production URL configured
- Neon database configured
- OpenAI API configured
- database-backed auth rate limiting configured
- transactional verification/password-reset email configured
- published privacy contact
- retention cleanup secret configured
- USD→GBP operating rate configured for AI cost snapshots
- controlled beta access enabled with signup code
- final UK legal/data-protection review marked complete
- no negative credit wallets
- every wallet balance agrees with the immutable credit ledger
- no duplicate signup grants
- no renders stuck in processing for >10 minutes
- after 10+ render attempts, failure rate <=10%
- no active retailer offers older than seven days
- at least `BETA_MIN_SELECTABLE_PRODUCTS` selectable curated variants (default 100)
- at least one active affiliate programme unless `BETA_REQUIRE_AFFILIATE=false`
- once 20+ samples exist for each metric: p75 LCP <=2.5s, INP <=200ms and CLS <=0.1

## Controlled beta scope

- Market: United Kingdom
- Room scope: living rooms only
- New accounts: invite code
- Existing verified accounts: normal sign-in
- Render credits: verified-account credits only
- Paid credit checkout: **not enabled in this beta**
- Affiliate commerce: only current live UK offers can redirect
- SEO collections: noindex until their existing Stage 12 real-room threshold is met

## Manual pre-launch test matrix

Automated CI cannot replace real device and provider tests. Complete these after the production deployment exists:

1. iPhone Safari: signup → verify email → upload → brief → products → render → room → retailer.
2. Android Chrome: same critical path.
3. Desktop Safari + Chrome: same path plus keyboard-only navigation.
4. VoiceOver on iPhone or macOS: account, design intake, product selection and designed-room drawer.
5. Slow 4G / throttled connection: loading states remain visible and buttons cannot double-submit renders.
6. Provider failure injection: failed and timed-out generation returns the credit exactly once.
7. Retailer failure: out-of-stock/disabled offer does not redirect and the product remains in the saved design.
8. Email failure: account remains recoverable; resend endpoint is rate-limited.
9. Session expiry + password reset.
10. Privacy export and deletion request from a signed-in account.
11. Analytics refused: design experience works and no optional analytics events are written.
12. Analytics accepted: page/funnel/Web Vitals events appear without raw IP storage.
13. Share link: original customer photograph and owner key remain private.
14. Social creative: owner-authenticated Before image is not exposed by public SEO routes.
15. Affiliate link disclosure is visible before the user follows a retailer link.

## Unit economics

Every new render records:
- provider/model
- token usage
- USD API cost
- a GBP cost snapshot using `AI_COST_USD_TO_GBP_RATE`
- duration and result/failure

`beta_room_economics` joins this against attributed retailer clicks and affiliate conversions per design.

Use **approved commission** for realised revenue. Pending commission stays separate. Expected affiliate revenue is directional only.

For each rendered room the core commercial equation is:

`approved affiliate revenue - AI generation cost = approved contribution before hosting/ops`

Do not scale paid acquisition from expected-revenue modelling alone.

## Legal/privacy launch gate

The implemented Privacy, Cookies and Beta Terms pages are operational drafts aligned to the product as built. Before opening unrestricted public traffic:
- confirm the legal entity/controller wording and contact details
- confirm lawful-basis wording and retention schedule
- confirm processor/subprocessor wording and international transfer position
- review AI image terms and customer-upload wording
- review affiliate disclosure placement
- confirm consumer/credit terms if paid credits are introduced later

Only then set `LEGAL_REVIEW_COMPLETE=true`.

## Performance

Optional, consented real-user measurement records LCP, INP and CLS. The launch dashboard starts enforcing Core Web Vitals thresholds after 20 samples for each metric so an empty dataset cannot produce a false green result.

## Dependency security

CI:
1. installs dependencies,
2. fails on production dependency vulnerabilities at **high** severity or above,
3. typechecks,
4. performs the production build.

Next is pinned to the current 15.5.27 Maintenance LTS security release. PostCSS is overridden to a patched 8.5.24 release.
