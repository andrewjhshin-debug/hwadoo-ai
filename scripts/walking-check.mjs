// 포행 확인 — 진짜 판에 가짜 흔들림을 먹인다.
// ① 손에 쥔 떨림: 세면 안 된다  ② 걷는 가락: 세야 한다
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext()).newPage();
await p.goto("http://localhost:3000/walking", { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await p.getByRole("button", { name: /포행 시작/ }).click();
await p.waitForTimeout(300);

const 먹이기 = (초, 간격, 세기) => p.evaluate(([초, 간격, 세기]) => new Promise((done) => {
  // 흔들림 한 번 = 올라갔다 내려오는 두 점. 꼭대기를 지나야 후보가 된다
  let t = 0;
  const id = setInterval(() => {
    const 위 = t % 2 === 0;
    const a = 위 ? 세기 : 0;
    window.dispatchEvent(new DeviceMotionEvent("devicemotion", {
      acceleration: { x: a, y: 0, z: 0 },
      accelerationIncludingGravity: { x: a, y: 9.8, z: 0 },
    }));
    if (++t >= 초) { clearInterval(id); done(); }
  }, 간격 / 2);
}), [초, 간격, 세기]);

const 걸음 = () => p.locator(".walking-merit-steps strong").innerText();

await 먹이기(60, 150, 0.12);              // 손 떨림 — 빠르고 약하다
const 떨림뒤 = await 걸음();
await 먹이기(40, 520, 0.9);               // 걷기 — 1초에 두 걸음, 발 충격
await p.waitForTimeout(200);
const 걷기뒤 = await 걸음();

console.log(`가만히 떨기 30번 → ${떨림뒤} 걸음 ${떨림뒤 === "0" ? "✅ 안 센다" : "❌ 샌다"}`);
console.log(`걷기 20걸음     → ${걷기뒤} 걸음 ${Number(걷기뒤.replace(/,/g,"")) >= 15 ? "✅ 센다" : "❌ 놓친다"}`);
await b.close();
