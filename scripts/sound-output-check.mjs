// 소리가 **진짜로 스피커까지 가는지** 잰다.
//   node scripts/sound-output-check.mjs [주소]   (안 주면 실서버)
//
// ac.destination 으로 들어오는 것을 몰래 갈라 분석기에 물려 세기를 본다.
// 갤럭시 무음 때 이 자로 「스피커 0 · 미디어통 224」를 잡아냈다.
import { chromium } from "playwright-core";
import { rmSync } from "node:fs";
const 집 = process.argv[2] || "https://www.hwa-du.com";
const DIR = "./.chromeprof2";
try { rmSync(DIR, { recursive: true, force: true }); } catch {}
const ctx = await chromium.launchPersistentContext(DIR, {
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, viewport: { width: 412, height: 860 }, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  args: ["--window-size=430,900", "--autoplay-policy=document-user-activation-required"],
});
const p = ctx.pages()[0] ?? await ctx.newPage();
await p.addInitScript(() => {
  window.__tap = { dest: null, msd: null };
  const 원래 = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (t, ...r) {
    try {
      const ac = this.context;
      if (t === ac.destination) {
        if (!window.__tap.dest) { const a = ac.createAnalyser(); a.fftSize = 2048; window.__tap.dest = a; }
        원래.call(this, window.__tap.dest);
      }
      if (t && t.constructor && t.constructor.name === "MediaStreamAudioDestinationNode") {
        if (!window.__tap.msd) { const a = ac.createAnalyser(); a.fftSize = 2048; window.__tap.msd = a; }
        원래.call(this, window.__tap.msd);
      }
    } catch {}
    return 원래.call(this, t, ...r);
  };
  window.__peak = (k) => {
    const a = window.__tap[k]; if (!a) return -1;
    const d = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(d);
    return Math.max(...d);
  };
});
await p.goto(집 + "/moktak", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(6000);
const 목탁 = p.locator('.hip-obj[aria-label="목탁 치기"]').first();
if (!(await 목탁.count())) { console.log("목탁을 못 찾음"); await ctx.close(); process.exit(0); }
await 목탁.tap();
let 끝 = { dest: 0, msd: 0 };
for (let i = 0; i < 25; i++) {
  await p.waitForTimeout(40);
  const v = await p.evaluate(() => ({ dest: window.__peak("dest"), msd: window.__peak("msd") }));
  끝.dest = Math.max(끝.dest, v.dest); 끝.msd = Math.max(끝.msd, v.msd);
}
const 상태 = await p.evaluate(() => {
  const a = document.querySelectorAll("audio");
  return { audios: [...a].map((x) => ({ paused: x.paused, muted: x.muted, vol: x.volume, src: (x.srcObject ? "stream" : x.currentSrc || "없음").slice(0, 40) })) };
});
console.log(`집: ${집}`);
console.log(`  스피커(ac.destination) 로 간 소리 세기 : ${끝.dest}  ${끝.dest > 0 ? "✅ 나간다" : "❌ 한 톨도 안 나간다"}`);
console.log(`  미디어 통(MediaStream) 로 간 소리 세기 : ${끝.msd}  ${끝.msd > 0 ? "⚠️  이리로 샜다" : "—"}`);
console.log(`  <audio> 들:`, JSON.stringify(상태.audios));
await ctx.close();
