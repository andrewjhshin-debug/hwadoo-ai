# Approved practice collection

Four new horizontal mala skins: ebony with a square lotus master bead, carved sandalwood, black/gold lotus inlay, and the approved upright carved wooden lotus repeated for every bead. Existing skins remain selectable.

The pastel four-key cluster is the fourth keycap skin. It uses the existing key press/release, sound, count and merit handlers. Its four keys have separate buttons and matching artwork masks. A fixed complete body remains beneath the four clipped surfaces. Only the pressed surface compresses inside its fixed boundary, so no background gap can open. Pointer capture, cancellation and keyboard release restore it. Each press runs the existing sound, count and merit handler once.

The separate proposed “공덕 변화” design is excluded. All four new malas gain a progressive gold coating using the exact base pixels and alpha. Dark and light wood use separate gold tone mappings to retain grain, carving and highlight positions.

Built-in image generation produced transparent sprite atlases from the approved board and final single lotus bead. Prompts requested isolated ebony, engraved sandalwood, black/gold inlay and exact upright honey lotus bead, plus matching square master/spacer and the four-key cluster. Converted/cropped WebP sprites live in `public/obj/practice-collection-v1/`. The preparation script records source paths and packing geometry.

Validation: production build, mobile selection of all four malas, keycap fourth slot, keycap press increments count and merit, base materials retained after mala interaction.
