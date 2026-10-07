# Design credit policy

## Launch recommendation

**3 free design credits per verified new account.**

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

## Why 3 free renders

Three is intentionally between products that offer only one free design and competitors that currently offer five free designs. It gives a homeowner enough room to experience the workflow and recover from one result they dislike without encouraging unlimited image generation.

The free allowance should be issued **once per verified account**, not merely per browser/device.

## Purchase-earned credits

Architecture supports rewarding commerce without making retailer clicks exploitable.

Recommended beta rule:

**Confirmed qualifying purchase from a room → +1 design credit.**

Rules:
- Do not award on affiliate click.
- Award only after the affiliate network/direct checkout confirms the conversion.
- Maximum one purchase reward per qualifying order.
- Record the order/conversion ID in the immutable credit ledger to prevent duplicate rewards.
- If affiliate reporting is delayed, show the reward as pending rather than immediately usable.
- When direct checkout exists, rewards can become instant and more generous.

## Principle

People should be able to think, refine and get confident for free. Credits pay for expensive visual generation, not conversation.


## Stage 10 enforcement

The verified-account rule is now implemented.

- New accounts start with an unverified account wallet and 0 production render credits.
- Email verification changes the wallet to `verified`.
- The account receives the 3-credit signup grant exactly once.
- The immutable ledger uses a verified-account idempotency key to prevent duplicate signup grants.
- Anonymous/development wallets are not treated as verified production accounts.
