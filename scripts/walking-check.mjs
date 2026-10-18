// 포행 확인 — 진짜 판에 **폰처럼 50Hz** 가짜 흔들림을 먹인다.
//   node scripts/walking-check.mjs [주소]
// ① 손에 든 떨림(10Hz, 0.12) 6초 → 0 걸음  ② 손에 들고 걷기(1.9Hz, 0.8) 30걸음 → 25 이상
// (예전 판은 걸음마다 표본 둘만 던졌다 — 감지기는 시간 간격으로 필터를 맞추니 그건 폰이 아니다)
import { chromium } from "playwright-core";
const 집 = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await p.goto(집 + "/walking", { waitUntil: "domcontentloaded" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.getByRole("button", { name: /포행 시작/ }).tap();
await p.waitForTimeout(300);

// 50Hz 로 표본을 쏜다. 중력 9.81 은 비스듬히(0.35,0.8,0.49). 걸음 = 120ms 반사인 충격 + 되튐
const 먹이기 = (초, 꼴) => p.evaluate(([초, 꼴]) => new Promise((done) => {
  const g = [0.35 * 9.81, 0.8 * 9.81, 0.49 * 9.81];
  const n = Math.round(초 * 50);
  let i = 0, seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5;
  const id = setInterval(() => {
    const t = i / 50;
    let s = 0;
    if (꼴.kind === "walk") {
      const T = 1 / 꼴.hz, ph = (t % T);
      if (ph < 0.12) s = 꼴.amp * Math.sin(Math.PI * ph / 0.12);          // 충격
      else if (ph < 0.24) s = -0.4 * 꼴.amp * Math.sin(Math.PI * (ph - 0.12) / 0.12); // 되튐
    } else if (꼴.kind === "tremor") {
      s = 꼴.amp * Math.sin(2 * Math.PI * (9 + 3 * Math.sin(t)) * t);
    }
    const nz = () => rnd() * 2 * 꼴.noise;
    // 충격은 중력 축(위아래)으로 — 단위 벡터 (0.35,0.8,0.49)
    window.dispatchEvent(new DeviceMotionEvent("devicemotion", {
      accelerationIncludingGravity: { x: g[0] + s * 0.35 + nz(), y: g[1] + s * 0.8 + nz(), z: g[2] + s * 0.49 + nz() },
    }));
    if (++i >= n) { clearInterval(id); done(); }
  }, 20);
}), [초, 꼴]);

const 걸음 = async () => Number((await p.locator(".walking-merit-steps strong").innerText()).replace(/,/g, ""));

await 먹이기(6, { kind: "tremor", amp: 0.12, noise: 0.03 });
const 떨림 = await 걸음();
await 먹이기(30 / 1.9 + 1, { kind: "walk", hz: 1.9, amp: 0.8, noise: 0.05 });
await p.waitForTimeout(300);
const 걷기 = (await 걸음()) - 떨림;
const 켜진 = await p.locator('.walking-merit-track i[data-lit="1"]').count();
console.log(`가만히 떨기 6초   → ${떨림} 걸음 ${떨림 <= 1 ? "✅ 안 센다" : "❌ 샌다"}`);
console.log(`걷기 30걸음       → ${걷기} 걸음 ${걷기 >= 25 ? "✅ 센다" : "❌ 놓친다"} · 발자국 ${켜진}/5`);
await p.screenshot({ path: "walk.png", clip: { x: 0, y: 120, width: 390, height: 420 } });
await b.close();
