// 「안 눌린다」를 **미리** 찾는다.
//
// 형: 「모바일에서 화두 쓰고 회향하려면 밑에 모바일 탭이랑 겹친다.
//      이런 초보적 실수 하지 마」
//
// 자리(getBoundingClientRect)만 보면 못 찾는다 — 겹친 것은 자리가 아니라
// **누가 위에 있느냐**다. 그래서 단추 한가운데를 실제로 찍어 본다
// (document.elementFromPoint). 제가 안 잡히면 누가 덮고 있는 것이다.
import { createRequire } from "node:module";
const require = createRequire("C:/Users/user/Desktop/HWADU AI/hwadoo-ai/package.json");
const { chromium } = require("playwright-core");
const 길 = ["/", "/moktak?lane=moktak", "/moktak?lane=yeomju", "/moktak?lane=bowl", "/moktak?lane=keycap",
  "/bae", "/mung", "/breath", "/mandala", "/sambae", "/hasim",
  "/gathering", "/gathering/yeon", "/gathering/me", "/gathering/me/view",
  "/settings", "/letters", "/rank", "/lotus", "/candle", "/archive", "/pilgrimage"];
const br = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
let 탈 = 0;
for (const r of 길) {
  try {
    await p.goto("http://localhost:3000" + r, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch { console.log("  ", r, "— 못 엶"); continue; }
  await p.waitForTimeout(4500);   // 설치 띠가 뜰 때까지 기다린 뒤에 굴린다
  // **끝까지 굴려 본 뒤에** 잰다.
  // 굴려서 빠져나올 수 있으면 덮인 게 아니다. 진짜 덫은 굴려도 안 빠지는
  // 것이다(형이 짚은 회향 단추가 그랬다 — fixed 라 굴릴 데가 없었다).
  await p.evaluate(() => {
    const 통 = [document.scrollingElement, ...document.querySelectorAll("*")].filter((e) => {
      if (!e || e === document.documentElement) return e === document.scrollingElement;
      const c = getComputedStyle(e);
      return /auto|scroll/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 4;
    });
    통.forEach((e) => { e.scrollTop = e.scrollHeight; });
  });
  await p.waitForTimeout(500);
  const 덮인것 = await p.evaluate(() => {
    const 나쁜 = [];
    const 볼것 = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")];
    for (const e of 볼것) {
      const b = e.getBoundingClientRect();
      if (b.width < 8 || b.height < 8) continue;
      if (b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) continue;
      const c = getComputedStyle(e);
      if (c.visibility === "hidden" || c.display === "none" || +c.opacity < 0.05) continue;
      if (e.hasAttribute("disabled")) continue;
      const x = Math.round(Math.min(innerWidth - 2, Math.max(2, b.left + b.width / 2)));
      const y = Math.round(Math.min(innerHeight - 2, Math.max(2, b.top + b.height / 2)));
      const 위 = document.elementFromPoint(x, y);
      if (!위) continue;
      if (e === 위 || e.contains(위) || 위.contains(e)) continue;
      // **떠 있는 것에 덮인 것만** 센다.
      // 옛 판(md 전용 마크업)이 고정판 밑에 통째로 깔려 있어서, 안 보이는
      // 단추까지 「덮였다」고 나온다. 진짜 문제는 늘 **위에 뜬 것**이다 —
      // 아래 염주 띠, 설치 띠, 서랍. 그것들만 본다.
      const 뜬것 = 위.closest(".hip-mala, .hip-mala-track, .install-banner, .hip-sheet, .mobile-tabbar");
      if (!뜬것) continue;
      // 안 보이는 것에 덮인 것은 덮인 게 아니다 — 설치 띠는 숨어 있을 때도
      // DOM 에 남아 있다. 정말 보이는 놈만 센다.
      const tc = getComputedStyle(뜬것);
      if (+tc.opacity < 0.05 || tc.visibility === "hidden" || tc.pointerEvents === "none") continue;
      나쁜.push({
        내가: (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 14),
        덮은놈: (위.closest(".hip-mala, .hip-mala-track, .install-banner, .hip-sheet, .mobile-tabbar")||위).className.toString().split(" ")[0],
        y,
      });
    }
    return 나쁜;
  });
  if (덮인것.length) { 탈++; console.log("🔴", r); 덮인것.slice(0, 6).forEach((x) => console.log("   ", JSON.stringify(x))); }
  else console.log("🟢", r);
}
console.log(탈 ? `\n덮인 판 ${탈}곳` : "\n전부 깨끗 — 덮인 단추 없음");
await br.close();
