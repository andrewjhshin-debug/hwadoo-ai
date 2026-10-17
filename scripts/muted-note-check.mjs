// 꺼 놓고 쳤을 때 「소리가 꺼져 있습니다」가 뜨는가.
// 이게 안 뜨면 음소거를 스쳐 끈 사람은 영영 까닭을 모른다.
import { chromium } from "playwright-core";
const 집 = process.argv[2] || "http://localhost:3000";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(집 + "/moktak", { waitUntil: "domcontentloaded" });
await p.evaluate(() => localStorage.setItem("hwadoo.sound-muted.v1", "1"));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.locator('.hip-obj[aria-label="목탁 치기"]').first().tap();
await p.waitForTimeout(700);
const 떴나 = await p.locator('.hip-soundoff[data-reason="muted"]').count();
const 글 = 떴나 ? await p.locator('.hip-soundoff[data-reason="muted"]').innerText() : "";
console.log(`음소거 켜 둔 채 목탁 → ${떴나 ? "✅ 알림 뜸: " + 글.replace(/\n/g, " ") : "❌ 아무 말 없음"}`);
if (떴나) {
  await p.locator(".hip-soundoff button").tap();
  await p.waitForTimeout(400);
  const 풀림 = await p.evaluate(() => localStorage.getItem("hwadoo.sound-muted.v1"));
  console.log(`「켜기」 누름 → 깃발 ${풀림} ${풀림 === "0" ? "✅ 풀렸다" : "❌ 그대로"}`);
}
// 꺼져 있지 않을 땐 안 떠야 한다
await p.evaluate(() => localStorage.setItem("hwadoo.sound-muted.v1", "0"));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.locator('.hip-obj[aria-label="목탁 치기"]').first().tap();
await p.waitForTimeout(700);
// 헤드리스 크롬은 출력 장치가 없어 통이 영영 suspended 라 asleep 알림은 뜰 수 있다 — muted 만 본다
console.log(`켜 둔 채 목탁 → ${(await p.locator('.hip-soundoff[data-reason="muted"]').count()) ? "❌ 음소거 알림이 쓸데없이 뜸" : "✅ 음소거 알림 없음"}`);
await b.close();
