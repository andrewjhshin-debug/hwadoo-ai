# Selected design details only

The existing app, menus, practice tools and reward balance remain. This implements only the user's selected pieces from the redesign preview.

- One shared thin pink open-lotus wordmark replaces duplicate header marks. Home, practice, shared rooms, temple, gathering, settings and the sidebar use it. PWA/native golden app icons remain unchanged.
- The existing single global daily-merit indicator now has a compact label, rounded pale-pink horizontal fill and pink lotus bud at the end. It sits below the shared header, with 38px reserved by the header slot so it does not cover content. It still reads the real daily earned/cap values, listens to both merit and daily events, and leaves the existing daily lotus award transaction intact.
- `이 문장 간직하기` below the current question stores the complete original sentence and source. `모아보기` opens the existing archive's new saved-sentences section. Saving never changes the current session, duration or history. It persists locally and joins the existing owner-scoped account sync. Timestamped removal markers keep older devices from resurrecting deleted bookmarks. Storage failures are reported without pretending success.
- Removed the global SoundOffNote mounting, so intentional mute no longer produces an enable-sound popup. The existing top-right sound control reads the latest preference and wakes audio inside the unmute click. Audio preference and other sound controls are not redesigned.
- Two user-supplied ink-wash images are copied unchanged to `Downloads/화두-디자인-보관/2026-11-01/`, together with the chosen wordmark and progress references. They are not used as backgrounds in the app.

Validation: saved-sentences storage/account/merge tests, actual daily reward and last-increment progress tests, shared-header consistency, selected-details sound/brand/CSS tests, TypeScript, targeted lint and production build. No real account or wallet was modified. No physical-phone or live-browser visual verification is claimed.
