# Horizontal mala elasticity

Rapid bead advances build a small visual pull on the entire horizontal ring. Slow advances leave it still. The spring compresses the group, gives a small rebound and settles to its exact original size. It runs on the existing count gestures; no inertial counting, extra rotation, gold-fill delay or merit changes are introduced.

- `src/lib/mala-elastic.ts`: cadence-driven, bounded spring; maximum compression 9.5%, maximum expansion 2.8%, with energy decay and a settling threshold.
- `src/components/useMalaElastic.ts`: animates only the ring wrapper transform via requestAnimationFrame; no per-frame React rerender. Stops on completion, hidden document, disabled mode or unmount, and respects prefers-reduced-motion.
- Normal and expanded horizontal renderers share the spring. Vertical mala, ring geometry, beads, pointer thresholds, 108 count and gold-fill logic stay unchanged.

`node scripts/mala-elastic-test.mjs` verifies slow/fast input, bounded simultaneous bursts, rebound and settling at 30/60/120 Hz. Existing stone-mala geometry tests pass. TypeScript and hook/model lint pass. Browser/physical-phone feel has not been visually verified in this environment.

## More visible speed response · 2026-11-01

The earlier nominal 5.5% limit produced only about 3% actual shrink and 0.1% rebound in a rapid-turn simulation, which was difficult to see. Rapid advances now give a small capped inward impulse and a stronger compression target. After 110ms without a new advance, the load decays faster so the spring can visibly rebound rather than slowly drifting back. At simulated 30/60/120Hz, rapid input yields approximately 5–8% compression and 1–2% rebound. Slower turns have less response; deliberate slow advances still do not animate. Exact resting size, centre, count, fill, gestures and motion-preference handling are preserved. Regression assertions now require visible compression/rebound and verify that faster cadence has a stronger response, in addition to stability and settling.

The full working-directory type check during this revision encountered unrelated in-progress `프로필.qa` changes in `yeonPick.ts`/`yeon.ts`. Those edits are not part of this change. Motion model/hook lint, standalone model TypeScript and spring regressions validate the selected files; deployment builds the committed source separately.
