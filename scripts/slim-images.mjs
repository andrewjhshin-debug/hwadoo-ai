// 그림 다이어트 — 배포 저장고가 차는 진짜 까닭.
//
// Vercel: 「free tier Deployment Storage (10GB) 100%」
//
// 배포마다 public 한 벌이 통째로 복사된다. 우리 public 은 43MB 고, 그중
// 41MB 가 그림이다. 여덟 번 올리면 330MB 다. 배포를 줄일 게 아니라
// **그림을 줄여야** 한다.
//
// 왜 이렇게 컸나 — 제미나이가 1024~2048 로 뽑아 준 원본을 그대로 넣었다.
// 실제로 화면에서 쓰는 크기는 400~460px 다. 넉넉히 두 배(920px)만 있으면
// 고해상도 화면에서도 또렷하다. 그 위는 전부 버리는 무게다.
//
// 무엇을 하나 —
//   ① 쓰는 곳이 없는 그림은 건드리지 않는다(지우는 건 형이 볼 일이다).
//      다만 **줄이기는** 한다 — 어차피 배포에는 다 따라간다
//   ② 긴 변이 기준보다 크면 줄인다. 알파는 그대로 지킨다
//   ③ 줄여도 안 작아지면 원본을 둔다(손해 보는 짓은 안 한다)
//
// 쓰는 법:  node scripts/slim-images.mjs          (재 보기만)
//           node scripts/slim-images.mjs --apply  (실제로 줄이기)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// 경로에 빈칸이 있으면 URL 은 %20 으로 적는다 — 그대로 쓰면 폴더를 못 찾는다
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUB = join(ROOT, "public");
const 할까 = process.argv.includes("--apply");

/** 자리별 천장 — 화면에서 쓰는 크기의 두 배쯤 */
const 천장 = (p) => {
  const f = p.replace(/\\/g, "/");
  if (/\/og|og-v\d|\/brand\//.test(f)) return 1200;   // 공유 썸네일은 크게
  if (/icon-512|maskable/.test(f)) return 512;
  if (/\/obj\//.test(f)) return 920;                   // 공양 물건 — 460×2
  if (/\/dudu\/|\/sticker\/|\/twin\//.test(f)) return 720;
  return 900;
};

const 그림들 = [];
(function 걷기(d) {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, f.name);
    if (f.isDirectory()) 걷기(p);
    else if (/^\.(png|jpg|jpeg)$/i.test(extname(f.name))) 그림들.push(p);
  }
})(PUB);

const br = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await br.newPage();
await page.setContent("<canvas id=c></canvas>");

let 전 = 0, 후 = 0, 손댄 = 0;
for (const p of 그림들) {
  const before = statSync(p).size;
  전 += before;
  const max = 천장(p);
  const b64 = readFileSync(p).toString("base64");
  const 잰것 = await page.evaluate(
    async ({ b64, max, png }) => {
      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = "data:image/" + (png ? "png" : "jpeg") + ";base64," + b64;
      });
      const W = img.naturalWidth, H = img.naturalHeight;
      const 긴 = Math.max(W, H);
      if (긴 <= max) return { W, H, url: null };
      const k = max / 긴;
      const c = document.getElementById("c");
      c.width = Math.round(W * k);
      c.height = Math.round(H * k);
      const g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = "high";
      g.drawImage(img, 0, 0, c.width, c.height);
      return { W, H, w: c.width, h: c.height, url: c.toDataURL(png ? "image/png" : "image/jpeg", 0.92) };
    },
    { b64, max, png: /\.png$/i.test(p) }
  );

  if (!잰것.url) {
    후 += before;
    continue;
  }
  const buf = Buffer.from(잰것.url.split(",")[1], "base64");
  if (buf.length >= before) {
    // 줄였는데 더 커졌다 — 원본이 이미 잘 눌려 있다. 그냥 둔다
    후 += before;
    continue;
  }
  손댄++;
  후 += buf.length;
  const 짧 = p.slice(PUB.length + 1).replace(/\\/g, "/");
  console.log(
    `${할까 ? "줄임" : "줄일 것"}  ${짧.padEnd(34)} ${잰것.W}×${잰것.H} → ${잰것.w}×${잰것.h}   ` +
      `${(before / 1024) | 0}KB → ${(buf.length / 1024) | 0}KB`
  );
  if (할까) writeFileSync(p, buf);
}
await br.close();

console.log(
  `\n그림 ${그림들.length} 장 · 손댈 것 ${손댄} 장\n` +
    `${(전 / 1048576).toFixed(1)}MB → ${(후 / 1048576).toFixed(1)}MB ` +
    `(${(((전 - 후) / 전) * 100).toFixed(0)}% 줄어듦)` +
    (할까 ? "" : "\n\n실제로 줄이려면:  node scripts/slim-images.mjs --apply")
);
