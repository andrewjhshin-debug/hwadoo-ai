# Tower ranking

Approved record-board mockup, with heading changed to 랭킹 and the explanatory rule sentence removed. The tower header has a small trophy/랭킹 button. A native modal dialog pauses play and restores its prior pause state on close. It contains weekly/all-time tabs, leader, at most ten real records, highlighted own row, and an own-rank row when outside the top ten. No example players or padded empty rows ship.

Authenticated stable peaks queue a bounded seed/placement snapshot; requests batch for eight seconds or flush when opening the board. A per-account local retry survives navigation/offline failures. Anonymous visitors can read but do not upload. Historical local height-only records are preserved locally but cannot be imported as leaderboard scores because no verifiable placements exist for them.

The server replays at most 512 placements with the actual stone geometry and stability rules. It rejects nonfinite, out-of-bounds, unstable or oversized records, derives height itself, rounds to the displayed tenth of a centimetre, and takes maxima in a Firestore transaction. This checks legal geometry, not whether a human played; it is not a bot-proof contest. No rankings award currency or merit. No client name or UID is accepted as identity.

One server-only `tower-ranks/{uid}` document holds all-time and weekly score fields. Queries use single-field indexes and limit ten rather than scanning all users. Weekly periods start Monday 00:00 Korea time. Equal displayed heights share a rank. Retry snapshots from prior weeks may update all-time but not this week's board. Old weekly fields are pruned on writes. Public responses use generated anonymous names and omit account IDs. Account erasure removes the ranking document.

Tests: `scripts/tower-ranking-test.mjs` checks replay, malformed input, authentication, lower-record preservation, weekly boundaries, late retries, top ten, ties, own rank outside ten, identity privacy and erasure integration. Existing gameplay and contact tests remain passing. Browser control was disabled in the task environment; do not claim physical-mobile or rendered-dialog verification without actual evidence.
