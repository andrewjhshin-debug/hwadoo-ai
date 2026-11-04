# Approved silk weave replacement

`public/obj/silk-approved-weave-v1.webp` replaces the procedural hook artwork in the shared `InyeonThread` card, including board posts and HandInHand. The approved broad silk weave, tassels, open square-cut ends and crossings are a single transparent image, so the center cannot drift apart.

Built-in image generation extracted only the cords from `Downloads/hwadu-thread-reference-polished.png`, preserving the approved geometry, color and herringbone silk texture while removing background and all text. Transparent padding was trimmed for the card. Real names and existing gender direction remain DOM content. The default image is mirrored blue-left, then the existing red-left gender case mirrors the wrapper.

Checked both name/gender directions, image loading and 320px mobile overflow in a local-only preview route; that preview route was removed before publication.
