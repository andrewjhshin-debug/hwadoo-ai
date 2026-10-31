# Fourth and fifth horizontal mala skins

Fourth replaces the selectable neon skin with light-grey stone bearing six repeated Buddhist motifs: lotus, dharma wheel, bodhi leaf, stupa, knot and incense burner. Fifth adds twelve repeated zodiac animal engravings (rat through pig); its unfilled base uses a warmer ivory display filter. Both turn the entire bead to the same warm-gold sprite. No paw relief remains on either new skin. Old stored `neon` selection maps to `stone`; default paw, wood and jade stay unchanged.

The 27-bead ring, width 39, per-bead sizing, depth ordering, rotation, original click/drag handlers, 108 count, merit writes and golden-fill formula are unchanged. Both normal and full-screen renderers use the new engravings. Only visual rendering and preload registration changed. Bead sprites use the same 920-square canvas and original cat alpha mask, preserving its 802-pixel body and outer outline. Twelve motifs repeat twice plus the first three across 27 beads; no claim of 108 distinct symbols.

Art: built-in ImageGen, transparent two-cell source copied to `public/obj/bead-stone-source-v1.png`. Prompt requested two identical blank front-view round beads using the existing cat base/gold as geometry references: left neutral light-grey fine-grained stone, right warm champagne gold; no paw, symbols, text, ground shadow or changed silhouette. `scripts/prepare-stone-mala.mjs` isolates and registers those sprites to the cat mask. Native vector engraving paths are shared across grey and gold states for exact alignment. Saved assets: `bead-stone-one-v1.png`, `bead-stone-one-gold-v1.png`.

`scripts/stone-mala-test.mjs` verifies five choices, no neon choice, legacy mapping, six/twelve motif repetition, intermediate/full gold, matching sprite bounds/alpha and unchanged geometry/count formulas. TypeScript and production build validate integration. Physical-phone and browser interaction verification are not claimed; local browser control was disabled in this task environment.

The new component passes ESLint. The existing practice page retains the same five pre-existing hook lint errors (three set-state-in-effect and two render-time-ref findings), verified against HEAD; these unrelated behaviours were not rewritten. Sprite preloads now include base/gold and use the same versioned URLs as the rendered sprites.

## Wood revision

User requested the fifth zodiac skin to use natural wood. It now uses `bead-wood-one-v1.png` and `bead-wood-one-gold-v1.png`, registered to the same original cat mask. Fourth stone skin is unchanged. ImageGen generated a transparent blank pair with honey-brown sandalwood grain and a matching champagne-gold state; source is retained as `bead-wood-source-v1.png`. Ivory brightening/sepia filter is removed and zodiac engraving uses darker brown. Motif sequence, transforms and counting are unchanged. The geometry test also covers both wood sprites.
