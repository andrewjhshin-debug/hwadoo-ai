# Shared header and Inyeon-only capture policy

## Header

All garden states, practice, shared rooms, hall, Inyeon and settings render through `HipHeader`. It leaves a 40px flow slot and portals the row into the root `hip-header-layer`, escaping page widths, transforms and scroll containers. This uses the garden's existing coordinates: safe-area top + 18px, 26px horizontal inset on mobile, centered 460px row at widths of 768px and above. The right toolbar is always on the right, including the garden's initial audience selector. Controls compact consistently at widths up to 380px.

Only one visible `HipDayBar` is mounted in the root. Per-page bars are removed from HipShell and the hidden legacy MeritBar is no longer mounted. The visible bar listens to the daily ledger event so the last earned increment fills it immediately, and rechecks when returning to the app. Reward eligibility and count values remain unchanged.

## Capture

The root `SecureScreen` owns policy for the entire app: `/gathering` and its subroutes are protected; other routes explicitly clear the native flag. It no longer relies only on an Inyeon layout's unmount cleanup. Late bridge initialization, visibility, focus and restored navigation reapply the latest route. Serialized calls discard obsolete pending requests and ensure an in-flight protect request is followed by an unlock after leaving Inyeon.

Android starts with capture allowed. SecureScreenPlugin resolves only after the UI-thread window flag change; an Activity reference is retained for each call. Devices with an older APK that has global capture blocking and no SecureScreen bridge need the rebuilt APK; a web deployment alone cannot rewrite an installed native binary. Ordinary browsers cannot enforce Android FLAG_SECURE.

## Verification

- `node scripts/header-consistency-test.mjs`: every existing menu header uses the root viewport layer and a single global bar.
- `node scripts/screen-capture-test.mjs`: route boundaries, explicit unlock, late bridge, quick navigation, an in-flight native operation, rejection recovery and root ownership.
- `node scripts/daily-lotus-reward-test.mjs`: the actual visible global pink bar completes on the last daily increment, alongside reward regression cases.
- TypeScript, targeted lint and production web build. Android CI builds the changed native classes and installation artifacts.

Browser control is disabled for this task; no physical-phone capture or rendered pixel-alignment verification is claimed.
