# Horizontal mala elasticity

Rapid bead advances build a small visual pull on the entire horizontal ring. Slow advances leave it still. The spring compresses the group, gives a small rebound and settles to its exact original size. It runs on the existing count gestures; no inertial counting, extra rotation, gold-fill delay or merit changes are introduced.

- `src/lib/mala-elastic.ts`: cadence-driven, bounded spring; maximum compression 5.5%, maximum expansion 1.8%, with energy decay and a settling threshold.
- `src/components/useMalaElastic.ts`: animates only the ring wrapper transform via requestAnimationFrame; no per-frame React rerender. Stops on completion, hidden document, disabled mode or unmount, and respects prefers-reduced-motion.
- Normal and expanded horizontal renderers share the spring. Vertical mala, ring geometry, beads, pointer thresholds, 108 count and gold-fill logic stay unchanged.

`node scripts/mala-elastic-test.mjs` verifies slow/fast input, bounded simultaneous bursts, rebound and settling at 30/60/120 Hz. Existing stone-mala geometry tests pass. TypeScript and hook/model lint pass. Browser/physical-phone feel has not been visually verified in this environment.
