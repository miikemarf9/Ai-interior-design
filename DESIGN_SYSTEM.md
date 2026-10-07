# Stage 1 Design System

## Positioning

Accessible premium: visually elevated enough to inspire a serious home purchase, but never so luxury-coded that a £1,500 room feels out of place.

The product should feel like an interiors and commerce brand first. AI is infrastructure, not the visual identity.

## Core visual rules

- Large visual surfaces before grids of cards.
- Warm, quiet backgrounds rather than stark SaaS white.
- Editorial display typography paired with neutral interface typography.
- Deep forest green for primary action and trust; clay only as an accent.
- Rounded controls can exist; photography and large content areas should not all be rounded.
- Avoid excessive pills, gradients, floating glass panels and feature-icon grids.
- Mobile layouts keep the same hierarchy rather than simply shrinking desktop.

## Recommendation explanation

Use `WhyChosen` when a product/style recommendation benefits from a short trust explanation.

Potential reasons:
- Comfort
- Design
- Lasting style
- Budget fit
- Room fit
- Verified match (future)

The reasoning is progressive disclosure: visible on hover/focus/tap, not permanently repeated beneath every item.

## Design tokens

- Chalk `#F6F2EA`
- Bone `#E9E1D3`
- Soft black `#20221D`
- Forest `#35483D`
- Clay `#9A624D`

## Accessibility

- Hover interactions must also work by keyboard focus and touch.
- Primary actions retain strong contrast.
- Reduced-motion preference is respected globally.
- Never communicate Verified Room confidence using colour alone.
