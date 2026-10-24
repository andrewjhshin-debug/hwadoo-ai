# Endless stone tower

- Existing stone atlas and application shell retained. Canvas engine animates independently of React renders.
- Drag and release to place stones; support overlap and weighted upper-stack center determine delayed partial collapse. Surviving stones retain original coordinates. Camera follows height without moving model coordinates.
- No fixed completion count. Daily seeded stone sequence can be shared using seed and target query parameters. Height in cm is a game unit, not a physical measurement.
- Personal best and daily paid height tiers are local per-account records. Each newly crossed 10 cm tier pays 144 merit, subject to the existing daily merit cap. Rebuilding an already paid height on the same day does not pay again. This is not a server-authoritative competitive leaderboard or anti-cheat system.
- Bounded replay holds up to 64 canvas snapshots. Explicit export locally renders an eight-second silent video; unsupported browsers can save a PNG. No microphone, camera, profile or full-screen recording. Closing cancels rendering and releases media tracks.
- Reduced-motion, keyboard controls, hidden-tab suspension and modal focus handling included.

## Difficulty adjustment, 2026-10-24

First three stones retain the introductory placement rules. From the fourth stone, a deterministic visible aiming sway introduces release timing. Its amplitude and speed increase gradually and are capped. The exact same sway offset is used for the preview and released stone: no hidden random miss penalty. Aiming time stops while paused or hidden. Automatic center alignment after a successful placement is removed. Advanced support windows narrow progressively while partial-collapse recovery and daily reward rules remain unchanged.

## Verification

Production build, targeted ESLint, existing tower balance test and new tower-endless-test.mjs passed. New test covers deterministic sequences, a playable 35-stone path, unchanged surviving positions, partial collapse, duplicate-input lock, hidden-tab suspension, bounded replay and reward replay prevention.

Automated browser could not connect to localhost:3128 (connection timed out). Actual Android appearance, touch feel, sound and device-specific video export remain unverified; do not represent these as physically tested.
