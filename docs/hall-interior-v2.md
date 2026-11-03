# Hall interior — approved design, 2026-11-03

Asset: `public/obj/hall-interior-v2.webp`, 857 × 1836, 195,460 bytes.
The original outdoor scene remains in the repository for rollback.

Built-in image_gen edit of the approved preview. Production prompt:

> Create a production background asset from this approved exact Korean temple app design. Keep the architecture, perspective, lighting, character, altar composition and colors as faithfully as possible. Remove all four hanging lotus lanterns, cords, tags and letters; reveal the same unobstructed wooden ceiling and beams. Remove all floor cushions, visitor badges and bottom seated-count pill, restoring continuous matching wooden floorboards. Remove all right-edge round UI buttons, icons, counts and labels, restoring their underlying column/window. Remove every text character and UI border. Preserve the exact cute gold Buddha with navy hair, cheek resting on hand and orange robe, lotus throne, muted Buddhist painting, columns, restrained jade/blush dancheong, lattice windows, three-level chestnut lotus altar, flower vases, lit ivory candle, rice bowl, bronze incense burner and small wooden dish in their reference positions. Preserve the full altar feet and clear empty wooden floor covering roughly the lower third. Same premium soft 3D illustration and serene warm lighting; no additional ornaments. Keep the portrait composition uncropped and edge to edge. No text, interface, cushions or lanterns; these are supplied by the live app.

The image contains no baked-in lanterns, cushions, visitor names or controls.
Live lanterns, 13 existing realtime seats (5/4/4), soul/name markers,
seated-person list and offering/story sheets keep their existing behavior.
Tile dedications remain accessible on the interior beam instead of an exterior eave.

The artwork, floor seats and offering hit areas share one aspect-ratio-preserving
coordinate plane. The room is shown immediately, including while offerings load.
Offering hit areas correspond to candle, rice, incense and dish positions in the
new artwork. Actual purchases and presence writes were not used during QA.

Validation: production build and TypeScript passed. At CSS viewports 390×844 and
320×740, all 13 seats fit within the artwork and there is no horizontal page
overflow. Four live lanterns displayed; story and offering sheets opened.
Offering target centers resolve to their own buttons. Existing CandleHall lint
baseline has 23 hook-name errors; this change adds none.
