# 2026-10-30: walking, investment practice, header and stones

## Scope and design audit

Preserve the established pink/mint background, lotus logo, serif/sans typography, five navigation destinations and round controls. Header alignment is the requested correction: mute, walking ON/OFF, lotus, messages and profile use identical 34 x 36 slots; remove the lotus's independent vertical translation. UI variance 3 / motion 2 / density 3. No new design library.

Remove duplicate investment entries from the generic sidebar/menu, keep the personal-settings entry and add the approved independent circular shortcut to the right of the bottom navigation. On narrow screens reserve its width instead of overlaying a tab.

## Walking findings and changes

- Former listeners lived in the walking page. Leaving that page detached sensing while the saved ON flag remained. Move the runtime to the persistent root layout; all controls and the walking screen subscribe to one external store.
- The original cadence startup limit of 1200 ms rejected slow 0.65 Hz walking entirely in a deterministic reproduction. Increase startup/continuation windows to 1800/2200 ms. Broader foot impulses require 450 ms transient allowance; separately track transverse gravity changes when moving the phone between pocket and hand.
- GPS previously suppressed counting based only on a last-five-seconds sensor timestamp. A GPS interval can cover much more time. Track sensor counts across each GPS segment and do not award that same segment twice. GPS-only steps and distance remain estimates, explicitly labelled.
- UI shows permission denial, missing signal and GPS status instead of silently presenting an enabled counter. Request permissions only from the ON gesture. Stop clears watchers, listeners, timers and wake lock. Late permission results cannot restart an OFF session.
- Persist daily steps outside React updater callbacks to avoid Strict Mode replay writing totals twice. Day rollover uses Asia/Seoul. Reward boundaries remain 143 steps (roughly 100 m using 0.7 m stride).
- A visible webpage may keep the screen awake if allowed. This is NOT a native background pedometer. Locking the screen or using another app can suspend browser sensing; no retroactive steps are invented. Full reload requires another ON gesture; in-app route changes do not.
- Location coordinates are held only in memory for segment calculation, not persisted or uploaded. Counts are local-device data, not a certified health measurement.

## Investment practice

Add four emotional situations, contextual reflection questions and checklists, optional 108-second pause, saved personal principles, check-in entries and a seven-day review. Existing diagnostic questions, loss-reflection questions and journal remain. No securities, prices, returns or trade signals. All personal rules/journal remain local to this browser; no model or remote service receives them. The page now uses the existing app shell and correct settings navigation destination. The countdown updates at 5 Hz instead of updating React every animation frame.

## Stone asset

Built-in image generation produced `public/obj/stone-cairn-atlas-v4.png`, a nine-silhouette transparent neutral-grey atlas. Original v3 is preserved. Alpha component bounds, not equal-grid guesses, define sprite crops. Live rendering uses each crop's natural aspect ratio and a small two-pixel contact overlap instead of the old v3 half-height wedge workaround. Existing fixed-nine legacy coordinates have a taller stage; the current endless engine still uses its own scrolling camera and preserves surviving stone coordinates.

Prompt: one 3x3 transparent sprite atlas, nine distinct neutral-charcoal natural river rocks (squat foundation, thin slate, kidney, blunt wedge, chipped oval, lopsided pebble, layered slab, rounded shoulder stone, arched cap), soft studio side view matching existing material, no text, no outside shadows, no clipped silhouettes. Built-in image tool, not CLI.

## Verification

- `scripts/walking-session-test.mjs`: 12 broad/slow waveform combinations (10/20/30/60 Hz, 0.65/1.2/1.8 steps/s), runtime lifecycle, route-independent sensing, stop/permission race, reward boundary, hidden suspension, day rollover, GPS fallback/deduplication, investment rules and review.
- Existing sensor suites: 8/8 and 26/26.
- Existing fixed tower balance and endless tower regression tests.
- TypeScript, targeted ESLint, production build, followed by browser layout checks.

Browser UI QA was blocked: local browser use is disabled in Work settings. Do not bypass that setting or claim screenshot/viewport verification. Physical Android walking/screen-lock behaviour and OS-specific permission prompts cannot be certified from synthetic tests. No real-phone accuracy claim without device testing.

## Bottom bar restoration follow-up

Per the user's correction, remove all shortcut-dependent bottom-nav overrides. Restore the original centered navigation, 54 x 42 buttons, six-pixel gaps and bottom safe-area +16 px position. The independent shortcut is now 38 x 38 at safe-area +86 px, above rather than beside the bottom bar. Reuse the existing native radial Mandala glyph in restrained dancheong green/red/ochre/blue colors, without chart imagery. `scripts/investment-shortcut-layout-test.mjs` guards the restored separation; it is a structural regression test, not a browser screenshot test.
