// 소리 확인 — 고친 뒤에도 진짜 나는가. `node scripts/sound-check.mjs`
// 노드가 몇 개 생겼는지로 센다. 들을 수는 없으니 세어서 안다.
import { chromium } from "playwright-core";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const p = await (await b.newContext()).newPage();
await p.addInitScript(() => {
  window.__nodes = 0;
  for (const m of ["createOscillator", "createBufferSource", "createGain"]) {
    const o = BaseAudioContext.prototype[m];
    BaseAudioContext.prototype[m] = function (...a) { window.__nodes++; return o.apply(this, a); };
  }
  // iOS 흉내 — 통을 깨어나기 전 상태로 두고 "interrupted" 로 세운다
  window.__fakeState = null;
  const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state");
  Object.defineProperty(BaseAudioContext.prototype, "state", {
    get() { return window.__fakeState ?? d.get.call(this); },
  });
});

const 재 = (n) => p.evaluate((n) => { window.__nodes = 0; return n; }, n);

await p.goto("http://localhost:3000/moktak", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);

// ① 보통 — 목탁을 치면 소리가 난다
await 재();
await p.locator(".hip-obj[aria-label=\"목탁 치기\"]").first().click({ force: true });
await p.waitForTimeout(400);
const 보통 = await p.evaluate(() => window.__nodes);

// ② 아이폰이 통을 "interrupted" 로 세워 둔 뒤 — 예전엔 여기서 영영 죽었다
await p.evaluate(() => { window.__fakeState = "interrupted"; });
const 끊김 = await p.evaluate(async () => {
  // 손짓 하나 — 깨우기가 resume 을 부르는지 본다
  let 불렸나 = false;
  const r = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () { 불렸나 = true; return r.call(this); };
  document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  await new Promise((d) => setTimeout(d, 60));
  AudioContext.prototype.resume = r;
  return 불렸나;
});

console.log(`① 목탁 한 번      → 노드 ${보통}개 ${보통 > 0 ? "✅ 난다" : "❌ 안 난다"}`);
console.log(`② interrupted 뒤  → resume ${끊김 ? "불렀다 ✅ 되살아난다" : "안 불렀다 ❌ 죽은 채다"}`);
await b.close();
