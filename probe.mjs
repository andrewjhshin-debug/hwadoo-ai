import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })).newPage();
await p.goto("http://localhost:3000/moktak", { waitUntil: "domcontentloaded" });
await p.evaluate(() => localStorage.setItem("hwadoo.sound-muted.v1", "1"));
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000);
await p.locator('.hip-obj[aria-label="목탁 치기"]').first().tap();
await p.waitForTimeout(500);
console.log(await p.evaluate(() => {
  const btn = document.querySelector(".hip-soundoff button");
  if (!btn) return "알림 없음";
  const r = btn.getBoundingClientRect();
  const x = r.left + r.width/2, y = r.top + r.height/2;
  const top = document.elementFromPoint(x, y);
  const note = document.querySelector(".hip-soundoff");
  const screen = document.querySelector(".hip-screen");
  const cs = (e) => e ? `${e.className}`.slice(0,34) + ` z=${getComputedStyle(e).zIndex} pos=${getComputedStyle(e).position} pe=${getComputedStyle(e).pointerEvents}` : "없음";
  return [
    `단추 자리 (${Math.round(x)},${Math.round(y)})`,
    `그 점의 맨 위 = ${top?.tagName}.${`${top?.className}`.slice(0,40)}`,
    `알림 부모 = ${note?.parentElement?.tagName}#${note?.parentElement?.id || ""}`,
    `알림   ${cs(note)}`,
    `화면   ${cs(screen)}`,
    `scroll-box z=${getComputedStyle(document.getElementById("scroll-box")).zIndex} transform=${getComputedStyle(document.getElementById("scroll-box")).transform.slice(0,20)} isolation=${getComputedStyle(document.getElementById("scroll-box")).isolation}`,
  ].join("\n  ");
}));
await b.close();
