// 소리를 파일로 굽는다 — `node scripts/render-sfx.mjs [주소]`
// /dev/render-sfx 를 열어 window.__sfx(base64 wav) 를 걷어 public/sfx/ 에 쓴다.
// 종·염주·키캡·싱잉볼·돌 — 엔진과 **같은 코드**로 OfflineAudioContext 에 그린 것.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const 집 = process.argv[2] || "http://localhost:3100";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage();
const err = [];
p.on("pageerror", (e) => err.push(String(e).slice(0, 120)));
await p.goto(집 + "/dev/render-sfx", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
const { sfx, log } = await p.evaluate(() => ({ sfx: window.__sfx, log: window.__log }));
let n = 0;
for (const [name, base64] of Object.entries(sfx)) {
  writeFileSync(`public/sfx/${name}.wav`, Buffer.from(base64, "base64"));
  n++;
}
for (const l of log) console.log("  " + l);
console.log(`구움: ${n}개 → public/sfx/`);
if (err.length) console.log("오류:", err);
await b.close();
