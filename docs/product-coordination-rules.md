# Automatic product coordination rules

The catalogue already records a selected product's style, colour, material, retailer and price. Imports should add those tags only when the feed, product title or explicit product attributes provide useful evidence; promotional description copy is not enough to guess colour or material.

## Import classification

- Map explicit styles to the site's supported directions: Modern Organic to warm-minimal, Modern Country to modern-british, Japandi to scandi, Mid-century Modern to mid-century, Bold & Colourful to colourful, and Contemporary Classic to classic.
- Infer colour only from the product title and feed's colour field. Use whole-word terms so words that merely contain a colour do not become colour tags.
- Infer material only from the title and feed's material/specification field. Do not tag faux, imitation, effect or lookalike materials as the real material.
- Keep the source text and confidence available for review. Missing supplier data must stay unknown instead of being invented.

## Room selection

- The sofa or first selected furniture item anchors the room palette; later slots are scored against the items already chosen.
- Prefer repeating at least one colour or staying within a related colour family. Warm and cool neutrals are tracked separately; warm neutrals can bridge earth tones and greens, while cool neutrals can bridge blues. Black works as a neutral bridge. Intentional complementary combinations receive some credit, but unrelated colours score lower.
- Coordinate materials by role, not by making every item identical. Repeating a material earns the strongest signal; woods, textiles and natural fibres can combine, and metal, glass or stone can be supporting finishes.
- Keep the customer's selected style, colours, budget, dimensions, availability and retailer constraints. Coordination is a ranking signal, not a promise of physical fit or an instruction to make every product a matching set.
- If colour or material data is missing, lower confidence and show a clear check-the-finish reason. Do not fabricate a match.

## Practical limit

The feed importer continues to stage products for curation. When a candidate is promoted, its inferred style, colour and material tags are attached automatically. Those tags then influence product selection so imported items that fit the room style and palette rank ahead of less-coordinated alternatives.
