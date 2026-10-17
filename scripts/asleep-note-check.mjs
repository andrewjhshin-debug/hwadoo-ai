// 통이 영영 안 깨어나는 폰을 흉내낸다 — 「소리통이 안 깨어나요」가 뜨는가.
// 이게 안 뜨면 그런 폰에서는 무음의 까닭을 아무도 모른다.
import { chromium } from "playwright-core";
const 집 = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.addInitScript(() => {
  // resume() 은 영영 안 풀리고, state 는 suspended 에 묶인다.
  // resume 은 BaseAudioContext 가 아니라 **AudioContext.prototype** 에 있다 —
  // Base 를 덮으면 그림자에 가려 진짜 resume 이 돌고, 그게 풀리면서 알림 타이머를
  // 꺼 버린다. 한참 「제품이 조용하다」고 믿었는데 검사가 저 자신을 속이고 있었다.
  AudioContext.prototype.resume = function () { return new Promise(() => {}); };
  Object.defineProperty(BaseAudioContext.prototype, "state", { get() { return "suspended"; } });
});
await p.goto(집 + "/moktak", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.locator('.hip-obj[aria-label="목탁 치기"]').first().tap();
await p.waitForTimeout(5200); // 문턱 4초 + 여유
const note = p.locator('.hip-soundoff[data-reason="asleep"]');
const 떴나 = await note.count();
console.log(`안 깨어나는 통에 목탁 → ${떴나 ? "✅ 알림 뜸: " + (await note.innerText()).replace(/\n/g, " ") : "❌ 아무 말 없음"}`);
if (떴나) {
  const r = await note.locator("button").boundingBox();
  const top = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${String(e.className).slice(0, 50)}` : "없음"; }, [r.x + r.width / 2, r.y + r.height / 2]);
  console.log(`「다시」 자리 맨 위 요소 → ${top}`);
  let 눌림 = false;
  await p.exposeFunction("__woke", () => { 눌림 = true; });
  await p.evaluate(() => { const b = document.querySelector('.hip-soundoff button'); b?.addEventListener("click", () => window.__woke()); });
  await note.locator("button").tap({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(300);
  console.log(`「다시」 tap → ${눌림 ? "✅ 눌렸다" : "❌ 안 눌렸다"}`);
}
await b.close();
