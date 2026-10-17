// 백팔배를 곧장 열고 손 안 댄 채 기울기만 보내면 — 「톡 치면 켜져요」가 바로 뜨는가.
// evaluate 는 쓰지 않는다(CDP evaluate 는 userGesture 를 심어 활성화를 오염시킨다).
import { chromium } from "playwright-core";
const 집 = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=document-user-activation-required"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36" });
const p = await ctx.newPage();
await p.addInitScript(() => {
  // 손짓 없이 기울기만 — 감지기(src/lib/bowSense.ts) 규약대로 절 한 번:
  //   보정: 12표본 이상 + 0.9초  → 숙임: 14° 이상을 180ms 넘게 → 일어남: 6° 이하 → onBow
  const 쏘기 = (beta) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { alpha: 0, beta, gamma: 0 }));
  const 차례 = [];
  for (let i = 0; i < 16; i++) 차례.push(0);   // 보정 ~1.1초
  for (let i = 0; i < 7; i++) 차례.push(45);   // 숙임 ~0.5초
  for (let i = 0; i < 8; i++) 차례.push(0);    // 일어남 → 한 배
  let k = 0;
  setTimeout(() => {
    const id = setInterval(() => { if (k >= 차례.length) return clearInterval(id); 쏘기(차례[k++]); }, 70);
  }, 2500); // 판이 뜨고 toggleSense 가 live 를 켤 때까지 기다린다
});
await p.goto(집 + "/bae", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(7000);
const note = p.locator('.hip-soundoff[data-reason="asleep"]');
const n = await note.count();
const t = n ? (await note.innerText()).replace(/\n/g, " ") : "";
console.log(`손짓 없이 기울기만 → ${n && /톡/.test(t) ? "✅ 바로 뜸: " + t : n ? "⚠️ 다른 알림: " + t : "❌ 아무 말 없음 (기울기로 절이 안 세졌을 수도 — 아래 참고)"}`);
if (!n) {
  const 센 = await p.locator("text=/\d+\s*(배|번)/").first().innerText().catch(() => "?");
  console.log("   화면 숫자:", 센, "| 센서 켜짐 버튼:", await p.locator("[aria-pressed]").count());
}
await b.close();
