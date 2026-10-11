# Stage 6: image-specific room exploration

Hotspot positions are saved in each generation's metadata, bound to both generation ID and result asset ID. They are never inferred from a furniture category or copied to a corrected image. The owner reviews every selected variant, marks visible items on the full photograph (or uses keyboard-accessible percentage fields), and explicitly confirms the positions. Hidden, missing and uncertain items have no public marker. Their actual product cards remain available.

The full generated photograph uses its natural aspect ratio on every screen, so percentage positions remain image-relative. Hover or keyboard focus reveals a short product name and recorded price. Clicking or tapping selects an inline detailed panel directly below the photograph. Escape closes it and returns focus to its trigger. The product list works independently of markers. This is a human visual association, not proof of exact likeness or fit.

Owner, account and shared-room reads use the immutable generation product snapshot. Unapproved or expired product imagery is blocked; alternatives are filtered to cleared references. Older images without a saved cleared collection cannot expose guessed product associations. Product offers show their recorded status and date; the retailer remains the source for final price, availability and fit.

Validation: synthetic tests cover coordinate bounds, foreign/duplicate IDs, image binding, ownership checks, explicit confirmation, missing/hidden items, cleared image references and UI selection/focus/list behaviour. Build and prior-stage regression checks accompany deployment. No real-room hotspot positions were asserted: the cleared catalogue remains empty and Stage 5 has no generated real-product pilot. Live persistence and visual browser QA therefore remain unverified. No homepage, navigation or hero-carousel files are changed.

Next real check: complete the cleared living-room pilot, open its room view, compare each major item to its exact reference, save positions, reload, and check the same image and markers on desktop and mobile. Corrected images require their own review. No schema migration is required.
