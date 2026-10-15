// 얼굴 판이 뜨고, 카메라가 열리고, 모델이 내려오는가.
// 가짜 카메라라 얼굴은 없다 — 「얼굴을 맞춰 주세요」까지 가면 길은 뚫린 것이다.
import { chromium } from "playwright-core";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ["camera"] });
const p = await ctx.newPage();
const 탈 = [];
p.on("pageerror", (e) => 탈.push(String(e).slice(0, 120)));
const 받은것 = [];
p.on("response", (r) => { if (/mediapipe|\.task|\.wasm/.test(r.url())) 받은것.push(`${r.status()} ${r.url().split("/").pop()}`); });
await p.goto("http://localhost:3100/dev/face", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.getByText("얼굴 인증 열기").tap();
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(700);
  const t = await p.locator(".hip-face-say").innerText().catch(() => "");
  if (t && t !== "카메라를 켜는 중") { console.log(`판에 뜬 말: 「${t}」`); break; }
  if (i === 29) console.log(`판에 뜬 말: 「${t}」 (더 안 바뀜)`);
}
const 원 = await p.locator(".hip-face-ring").count();
const 보임 = 원 ? await p.locator(".hip-face-ring video").evaluate((v) => v.videoWidth + "x" + v.videoHeight) : "-";
console.log("동그라미", 원 ? "✅" : "❌", "· 카메라 화면", 보임);
console.log("받은 것:", 받은것.slice(0, 4).join(" | ") || "없음");
console.log("오류:", 탈.length ? "❌ " + 탈[0] : "✅ 없음");
await p.screenshot({ path: "face.png" });
await b.close();
