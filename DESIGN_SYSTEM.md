# Seemori Design System

## Positioning

Accessible premium: visually elevated enough to inspire a serious home purchase, but never so luxury-coded that a £1,500 room feels out of place.

The product should feel like an interiors and commerce brand first. AI is infrastructure, not the visual identity.

## Core visual rules

- Large visual surfaces before grids of cards.
- Warm, quiet backgrounds rather than stark SaaS white.
- Editorial display typography paired with neutral interface typography.
- Use the Seemori logo's exact forest green for primary actions and trust; ink text on warm ivory for all navigation surfaces. Clay remains a restrained supporting accent.
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
- Ivory `#FBFAF7` — primary background and logo surface
- Near-black `#252320` — lettering and body copy
- Forest `#156339` — exact Seemori logo e's and primary buttons
- Deep forest `#104B2B` — hover, selected states and high-contrast green text
- Clay `#9A624D` — occasional supporting accent (never the primary CTA)

## Accessibility

- Hover interactions must also work by keyboard focus and touch.
- Primary actions retain strong contrast.
- Reduced-motion preference is respected globally.
- Never communicate Verified Room confidence using colour alone.
