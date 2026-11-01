# Singing bowl silhouette registration

The first bowl is the geometry reference for all five choices. The old fourth and fifth sprites matched only the total image box; the fifth had a taller bowl and a thin support ring. Replace slots four and five with material-only edits of the first original. Skin IDs, sound, saved selection and responsive layout remain shared.

Built-in ImageGen was used, with `public/obj/bowl.png` as the sole edit target and a transparent background. Final prompt set: preserve the exact original silhouette, camera, rim ellipse, bowl width and height, thick cushion contour, and striker angle, position, length and round head. Fourth changes materials only to opaque ivory satin quartz, mint-grey fabric and pale ash with an ivory felt round head. Fifth changes materials only to warm copper/brass with shallow hammer dimples, brown lower patina, charcoal fabric and walnut with a wine-red felt round head. No extra props, scene or text.

Project sources: `design/singing-bowls/bowl-ivory-v2-source.png` and `bowl-hammered-v2-source.png`. Both are mechanically registered by `scripts/prepare-bowl-skin.mjs` to the first original's 841×716 canvas without stretching. Runtime sprites: `public/obj/bowl-ivory-v2.webp` and `bowl-hammered-v2.webp`. Comparison: `design/singing-bowls/silhouette-unified-v2.png`.

Validation: all five sprites have identical canvas dimensions. At bowl rows 150 and 280 and cushion rows 380 and 450, all opaque outer edges match the original within 3 source pixels (under 1 pixel at a 252px-wide preview). Comparison visually inspected; the fourth and fifth now match the original bowl/cushion proportions and striker arrangement. The existing mobile fitting rules are unchanged.
