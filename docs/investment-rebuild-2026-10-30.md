# 불심투자: 판단 전과 후가 연결되는 도구

## Scope

Rebuild `/tamjinchi` with three views: before a decision, review the decision, and patterns in the user's own records. This is a personal reflection tool, not financial advice, a trading terminal, a clinical assessment or a return forecast. No market prices, brokerage connections, model calls, rewards or automatic public sharing are added.

Existing five-tab navigation, dimensions, position, header and approved shortcut placement remain. Native SVG candlestick mark uses dancheong jade/coral/ochre rather than the incorrectly interpreted radial ornament. Existing icon source is extended, not raster-generated. Product UI is outside the landing-page skill's form/dashboard scope; only preservation/audit, spacing, copy, accessibility and responsive guidance apply. Variance 4, motion 2, density 4. Existing light app palette is retained; the actual recorded-value chart is explicitly not a stock chart.

## New functionality

- Record intended action, optional nickname, self-reported emotion/urge, reason and evidence that would cause reconsideration.
- Snapshot the user's current principles so editing principles later cannot rewrite the past.
- Optional 108-second pause persists with the draft across reloads. Saving does not execute a trade, create an OS notification or award merit.
- Set a revisit time of one hour, one day or seven days; show due records on re-entry. No background notifications are promised.
- Append actual action, self-reported principle adherence, current urge and reflection without overwriting original reasons.
- Show counts, a clearly denominated adherence proportion and last-ten recorded urge values. Empty records do not invent scores.
- JSON export/import with schema, length, identity, range and size checks; merge preserves current duplicate IDs. Limit 500 records without silently discarding old entries.

## Data safety

New data uses `hwadu.investment.decisions.v2` and a separate draft key. Existing `hwadu.tamjinchi.v1` remains unchanged and readable under the legacy disclosure. Existing personal principles are reused. New-record backups explicitly exclude legacy records. Local data is not automatically synced, publicly posted or sent to a model. Storage/format failures display errors and do not overwrite corrupt data with an empty book. The optional nickname and private notes are user-entered local content, never analytics payloads from this feature.

## Verification and limitations

`scripts/investment-decisions-test.mjs` covers record/review lifecycle, original snapshots, due dates, sample-only stats, pause completion, backup merge and malformed input, storage failure, cap and legacy preservation. The shortcut layout regression still protects original navigation geometry. Old three-tap component files are preserved for rollback but are no longer the page's interface.

Browser control was disabled in Work settings in the prior verification attempt. Do not bypass that preference; do not claim rendered mobile or physical-device verification without successful tool evidence.

## Competitive ideas: proposals only

The competitor screenshots show a very legible shared-temple scene; visitor/like claims are not retention or revenue evidence. Proposed positioning for HWADU: a temple where you enter with one concern and leave one thing behind. These ideas are NOT implemented by this change:

1. One concern, one short ritual: private emotion/concern selection, existing temple/tower interaction, then an explicitly optional share card that excludes private text by default.
2. A tower completed by 108 people: bounded one-contribution-per-person participation, real counts, a collective artifact and invitation link. Requires server-side validation and abuse controls before public launch.
3. Quiet companionship: a short shared session without mandatory chat, profiles or unsolicited DMs. Requires truthful presence counts and opt-in visibility.
4. Tomorrow's self: reopen the user's own prior thought and compare, with reminder permission and data retention explicitly chosen. No inferred diagnoses.
5. Online ritual to real-world connection: build upon existing temple/group features, with age, consent, moderation and privacy gates rather than automatic matching.

Prioritize one-concern ritual as the entry experience, the collaborative artifact as the sharing loop, and return-to-your-own-record as retention. Test completion, next-day return, meaningful sharing and entry-to-ritual time rather than celebrating raw traffic alone. No claim of guaranteed virality or superiority.

## Stone colour and contact correction

Built-in ImageGen edited `public/obj/stone-cairn-atlas-v4.png` into `public/obj/stone-cairn-atlas-v5.png`, using transparent-background editing. Prompt: change only the nine rocks' colour and surface lighting to noticeably lighter, neutral cool-grey granite; remove brown/gold/beige tint, retain matte texture and darker crevices; match all nine including the top rock; preserve silhouettes, relative sizes, three-by-three arrangement, spacing and transparency; add no objects, shadows or text. Original tool output: `exec-2b0e45d7-fe88-4eb6-a6d0-dfee10abedb0.png`.

`scripts/build-tower-shapes.mjs` derives crops and 128-column opaque silhouettes directly from the new atlas. `tower-geometry.ts` rotates those outlines around the same pivot as the renderer and places each new rock at the first shared surface contact, with 1.25 game pixels of antialiasing overlap. Existing rocks retain their coordinates. No completion recentering is introduced.

`scripts/tower-contact-test.mjs` checks all 81 shape pairs at three rotations (243 contacts), neutral-grey channel balance and increased brightness. Mean opaque RGB changed from approximately 111/105/100 to 149/149/151. The seeded gameplay regression still finds a 35-stone playable path and checks unchanged survivors and partial collapse. These are geometry and code checks, not a claim of physical-phone visual verification.
