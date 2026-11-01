# Design credit policy

## Launch policy

- Each verified customer account receives **1 free image generation**.
- Customers can buy **10 more image generations for £2** through Stripe Checkout.
- The verified admin email in `ADMIN_EMAILS` is exempt from the site's image-credit cap. Its usage is still subject to the image provider's account limit and billing.

A design credit is spent only when the system performs a compute-heavy room image generation or regeneration.

### Free
- Design intake
- AI-written design brief
- Editing the brief
- Asking the brief to change
- Browsing selected products
- Swapping products before rendering
- Saving a project

### 1 design credit
- Generate a room image
- Regenerate a room image
- Later: other image-generation actions that have a meaningful model cost

The free allowance is issued **once per verified account**, not per browser or device. Failed technical generations are refunded; each successful generation or regeneration uses one image credit.

## Principle

People should be able to think, refine and get confident for free. Credits pay for expensive visual generation, not conversation.


## Account enforcement

The verified-account rule is now implemented.

- New accounts start with an unverified account wallet and 0 production render credits.
- Email verification changes the wallet to `verified`.
- The account receives the 1-credit signup grant exactly once.
- The immutable ledger uses a verified-account idempotency key to prevent duplicate signup grants.
- Anonymous/development wallets are not treated as verified production accounts.
- A successful £2 Stripe Checkout payment adds 10 credits from the signed `checkout.session.completed` webhook, once per checkout session.
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the production Worker. Configure the Stripe webhook to call `/api/stripe/webhook` for `checkout.session.completed`.
- Set `ADMIN_EMAILS` to the verified owner email. This grants the admin area and bypasses the site's credit counter; the image API's usage limit still applies.
