// 첫 타가 **얼마나 늦게** 나오나 — resume() 이 풀릴 때까지 소리가 묶인다.
//   node scripts/sound-first-tap-delay.mjs [주소]
// 톡 친 뒤 3초 동안 200ms 마다 스피커 세기를 적는다. 첫 타와 둘째 타를 견준다.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const 집 = process.argv[2] || "https://www.hwa-du.com";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const br = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, args: ["--autoplay-policy=document-user-activation-required"] });
const ctx = await br.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, userAgent: UA });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__tap = null; window.__ac = null; window.__resumed = [];
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (t, ...r) {
    try { if (t === this.context.destination) { window.__ac = this.context; if (!window.__tap) { const a = this.context.createAnalyser(); a.fftSize = 2048; window.__tap = a; } conn.call(this, window.__tap); } } catch {}
    return conn.call(this, t, ...r);
  };
  const r = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () { const t0 = performance.now(); const pr = r.call(this); pr.then(() => window.__resumed.push(Math.round(performance.now() - t0))); return pr; };
  window.__peak = () => { if (!window.__tap) return -1; const d = new Uint8Array(window.__tap.frequencyBinCount); window.__tap.getByteFrequencyData(d); return Math.max(...d); };
});
await p.goto(`${집}/moktak?lane=moktak`, { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(3500);
console.log("판 열리고 3.5초 — 통 상태:", await p.evaluate(() => window.__ac?.state ?? "(아직 destination 연결 없음)"));
const 목탁 = p.locator('.hip-obj[aria-label="목탁 치기"]').first();
for (const n of [1, 2, 3]) {
  const 시작 = Date.now();
  await 목탁.tap();
  const 줄 = [];
  for (let i = 0; i < 15; i++) {
    await p.waitForTimeout(200);
    줄.push(`${Date.now() - 시작}ms:${await p.evaluate(() => window.__peak())}`);
  }
  const st = await p.evaluate(() => ({ state: window.__ac?.state, resumed: window.__resumed.splice(0) }));
  console.log(`\n${n}번째 톡 → 통=${st.state} · resume 풀리기까지 ${st.resumed.length ? st.resumed.join("/") + "ms" : "(새 resume 없음)"}`);
  console.log("  세기:", 줄.join(" "));
}
await br.close();
