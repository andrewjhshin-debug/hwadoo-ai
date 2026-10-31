# Daily lotus completion reward

- The top bar and reward controller now listen to `DAILY_EVENT`, emitted after the final daily ledger increment. Previously both listened only to the earlier merit event, so the final action could leave them one increment behind.
- The exchange transaction reads the wallet before any writes. Previously it wrote the daily mark and then read the wallet, which Firestore rejects. The wallet update uses normalized live balances so expired free lotus cannot be revived.
- A full day requests one lotus. The server retains the shared automatic/manual one-per-day cap, uses Korea's date, rejects a stale client date and returns a per-account daily receipt. Concurrent/repeated requests never add a second lotus.
- The bloom animation, gold ripples, particles and +1 appear with “연꽃 1송이를 받았어요” only after a confirmed server receipt. The wallet badge refreshes. The user dismisses with 확인 or Escape; focus is restored. Reduced-motion users get a static card.
- A full bar without login offers the login route. Network/write failures show retry instead of a fake award; online/visibility/manual retry and periodic checks recover. Automatic retries back off to five minutes. In-flight requests are deduplicated; blocked localStorage uses an in-memory receipt.
- A lost successful response can be recovered through the same daily receipt, without granting again. Switching accounts cannot display another account's receipt.
- The top bar remains full for today's completed merit cap; tomorrow's daily ledger resets it. The merit values and lotus price are unchanged.

`node scripts/daily-lotus-reward-test.mjs` exercises the real route and component logic with strict read-before-write transactions and fake identities/wallets: first gift plus reward, KST date, concurrent claims, expired free balance, failed writes, final daily event, guest login, blocked storage, lost-response recovery, online retry and immediate bar completion. No real balance is modified.

Physical-phone and browser animation/layout verification are not claimed. Merit eligibility remains client-side as in the existing service; the server enforces the daily grant cap, not a new authoritative proof of every practice action.
