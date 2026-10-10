// 공덕표를 엑셀로 굽는다 — `node scripts/merit-xlsx.mjs`
//
// 형: 「공덕 차는 거 고친 건 다시 폴더에 엑셀로 거쳐서 덮어쓰기 해 둬.
//      얼마가 몇 개씩 차는지」
//
// 숫자를 손으로 옮겨 적지 않는다. **merit.ts 를 읽어서** 만든다 —
// 값을 고칠 때마다 표가 저절로 따라오고, 둘이 어긋날 길이 없다.
// (앞서 있던 scripts/build-merit-ledger.mjs 는 손으로 적은 표였고,
//  오늘 값을 두 배로 올리자 그대로 낡았다.)
//
// 엑셀 라이브러리를 새로 들이지 않는다. .xlsx 는 XML 몇 장을 담은
// 집(zip)일 뿐이라, 눌러 담지 않고(store) 그대로 넣으면 집 하나
// 엮는 것으로 끝난다.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// ── merit.ts 에서 숫자를 읽어 온다 ─────────────────────────
const ts = readFileSync("src/lib/merit.ts", "utf8");
function 표뽑기(머리) {
  const i = ts.indexOf(머리);
  const j = ts.indexOf("\n};", i);
  const out = {};
  for (const m of ts.slice(i, j).matchAll(/^ {2}([a-z]+): (\d+)/gm)) out[m[1]] = Number(m[2]);
  return out;
}
const 값 = 표뽑기("export const MERIT_VALUE: Record<MeritSource, number> = {");
const 천장 = 표뽑기("export const DAILY_CAP: Record<MeritSource, number> = {");
const 하루 = Number(ts.match(/DAILY_TOTAL_CAP = (\d+)/)[1]);

// ── 사람 말 — 코드가 모르는 것만 여기 둔다 ─────────────────
// 초(秒)는 한 번 하는 데 걸리는 시간. 분당 환산과 상한 기준을 여기서 센다.
const 결 = [
  ["bow", "절", "1배", 4],
  ["breath", "호흡 명상", "한 식", 10],
  ["sutra", "경전 외우기", "한 마디", 30],
  ["moktak", "목탁", "1타", 0.8],
  ["bead", "염주", "한 알", 1],
  ["keycap", "키캡", "1회", 1],
  ["bowl", "싱잉볼", "1회", 15],
  ["mandala", "만다라", "1장", 1200],
  ["hasim", "하심", "1회", 120],
  ["mung", "멍", "1분", 60],
  ["tower", "돌탑", "여섯 돌 완주", 60],
  ["walking", "포행", "100m", 72],
  ["hwadu", "화두 회향", "1회", 180],
  ["daily", "오늘의 세 가지", "완료", 900],
  ["temple", "절 다녀오기", "1회", null],
  ["gathering", "인연", "글·댓글", 40],
  ["moment", "시절인연", "사진 1장", null],
  ["candle", "초 공양", "손 모음", 60],
  ["fortune", "오늘의 운세", "1장", null],
  ["inyeon", "인연 닿음", "1번", null],
];

const 꼴 = (초) =>
  초 == null ? "—" : 초 < 60 ? `약 ${초}초` : `약 ${Math.round(초 / 60)}분`;
const 걸림 = (분) =>
  분 == null ? "—" : 분 < 60 ? `약 ${Math.round(분)}분` : `약 ${(분 / 60).toFixed(1)}시간`;

const 줄 = 결.map(([k, 이름, 단위, 초]) => {
  const v = 값[k] ?? 0;
  const c = 천장[k] ?? 0;
  const 분당 = 초 ? Math.round(v * (60 / 초)) : null;
  const 횟수 = v ? Math.ceil(c / v) : 0;
  // 이 갈래만으로 하루치를 채우려면 — 천장에 막히면 못 채운다
  const 하루까지 = 분당 ? (c >= 하루 ? 하루 / 분당 : null) : null;
  return [
    이름, 단위, v, 꼴(초), 분당 ?? "—", c, `${횟수.toLocaleString("ko-KR")}회`,
    하루까지 ? 걸림(하루까지) : "혼자서는 못 채움",
  ];
});

// ── 집(zip) 하나 엮기 ──────────────────────────────────────
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function zip(파일들) {
  const 조각 = [], 가운데 = [];
  let off = 0;
  for (const [이름, 글] of 파일들) {
    const n = Buffer.from(이름, "utf8");
    const d = Buffer.from(글, "utf8");
    const crc = CRC(d);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(0, 8); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22);
    h.writeUInt16LE(n.length, 26);
    조각.push(h, n, d);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    가운데.push(c, n);
    off += h.length + n.length + d.length;
  }
  const 몸 = Buffer.concat(조각);
  const 끝목록 = Buffer.concat(가운데);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(파일들.length, 8); e.writeUInt16LE(파일들.length, 10);
  e.writeUInt32LE(끝목록.length, 12); e.writeUInt32LE(몸.length, 16);
  return Buffer.concat([몸, 끝목록, e]);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const 칸 = (c, r, v) =>
  typeof v === "number"
    ? `<c r="${c}${r}"><v>${v}</v></c>`
    : `<c r="${c}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const 글자 = "ABCDEFGH".split("");

const 머리 = ["수행", "적립 단위", "1회 공덕", "한 번 걸림", "분당 공덕", "갈래 하루 상한", "상한까지 횟수", "혼자 하루치 채우기"];
const 판 = [
  ["화두 — 공덕표"],
  [`하루 전체 상한 ${하루.toLocaleString("ko-KR")} = 연꽃 한 송이 · ${new Date().toISOString().slice(0, 10)} 기준`],
  [],
  머리,
  ...줄,
  [],
  ["하루 전체 상한", 하루],
  ["연꽃 한 송이", 하루],
];

const xml = 판
  .map((r, i) => `<row r="${i + 1}">${r.map((v, j) => 칸(글자[j], i + 1, v)).join("")}</row>`)
  .join("");

mkdirSync("공덕표", { recursive: true });
writeFileSync(
  "공덕표/화두_공덕표.xlsx",
  zip([
    ['[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ['_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ['xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="공덕표" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/worksheets/sheet1.xml',
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="16"/><col min="2" max="2" width="13"/><col min="3" max="8" width="15"/></cols><sheetData>${xml}</sheetData></worksheet>`],
  ])
);

console.log("공덕표/화두_공덕표.xlsx — 줄", 줄.length, "· 하루 상한", 하루);
for (const r of 줄) console.log(`  ${r[0]} ${r[2]} / 분당 ${r[4]} / 상한 ${r[5]} (${r[6]}) → ${r[7]}`);
