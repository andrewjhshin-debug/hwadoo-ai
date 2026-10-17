// 소리의 **대역 분포**를 잰다 — 폰 스피커는 400~500Hz 아래를 거의 못 낸다.
//   node scripts/spectrum-check.mjs [주소]   (안 주면 http://localhost:3100)
//
// ac.destination 으로 들어오는 신호를 AnalyserNode(fftSize 4096)에 갈라 물리고,
// 물건마다 한 번 두드린 뒤 0–300 / 300–600 / 600–1500 / 1500+ Hz 몫을 센다.
// 바이트(dB 눈금) 합 몫과 선형 파워 합 몫을 둘 다 적는다 — 파워 몫이 「귀에 들리는 몫」에 가깝다.
import { chromium } from "playwright-core";
import { rmSync } from "node:fs";

const 집 = process.argv[2] || "http://localhost:3100";
const DIR = "./.chromeprof3";
try { rmSync(DIR, { recursive: true, force: true }); } catch {}

const ctx = await chromium.launchPersistentContext(DIR, {
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, viewport: { width: 412, height: 860 }, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  args: ["--window-size=430,900", "--autoplay-policy=document-user-activation-required"],
});

const BANDS = [[0, 300], [300, 600], [600, 1500], [1500, 1e9]];

async function 재기(이름, path, 셀렉터, { ms = 1500, pre = (p) => p, blockSfx = false, ls = {} } = {}) {
  const p = await ctx.newPage();
  if (blockSfx) await p.route("**/sfx/**", (r) => r.abort());
  await p.addInitScript((ls) => {
    for (const [k, v] of Object.entries(ls)) try { localStorage.setItem(k, v); } catch {}
    window.__spec = { an: null, hold: null, pow: null, frames: 0, timer: 0, rate: 0 };
    const 원래 = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (t, ...r) {
      try {
        const ac = this.context;
        if (t === ac.destination && !window.__spec.an) {
          const a = ac.createAnalyser();
          a.fftSize = 4096;
          a.smoothingTimeConstant = 0;
          a.minDecibels = -100; a.maxDecibels = -30;
          window.__spec.an = a;
          window.__spec.rate = ac.sampleRate;
          window.__spec.hold = new Uint8Array(a.frequencyBinCount);
          window.__spec.pow = new Float64Array(a.frequencyBinCount);
        }
        if (t === ac.destination) 원래.call(this, window.__spec.an);
      } catch {}
      return 원래.call(this, t, ...r);
    };
    window.__arm = () => {
      const s = window.__spec;
      if (!s.an) return false;
      s.hold.fill(0); s.pow.fill(0); s.frames = 0;
      const d = new Uint8Array(s.an.frequencyBinCount);
      s.timer = setInterval(() => {
        s.an.getByteFrequencyData(d);
        s.frames++;
        for (let i = 0; i < d.length; i++) {
          if (d[i] > s.hold[i]) s.hold[i] = d[i];
          if (d[i]) { const db = -100 + (d[i] / 255) * 70; s.pow[i] += Math.pow(10, db / 10); }
        }
      }, 8);
      return true;
    };
    window.__report = (bands) => {
      const s = window.__spec;
      clearInterval(s.timer);
      if (!s.an) return null;
      const hz = s.rate / s.an.fftSize; // bin 폭
      const byte = bands.map(() => 0), pow = bands.map(() => 0);
      let peakByte = 0, peakHz = 0, peakPow = 0, peakPowHz = 0, byteAll = 0, powAll = 0;
      for (let i = 0; i < s.hold.length; i++) {
        const f = i * hz;
        const b = bands.findIndex(([lo, hi]) => f >= lo && f < hi);
        if (b < 0) continue;
        byte[b] += s.hold[i]; pow[b] += s.pow[i]; byteAll += s.hold[i]; powAll += s.pow[i];
        if (s.hold[i] > peakByte) { peakByte = s.hold[i]; peakHz = f; }
        if (s.pow[i] > peakPow) { peakPow = s.pow[i]; peakPowHz = f; }
      }
      return {
        rate: s.rate, binHz: hz, frames: s.frames, peakByte, peakHz: Math.round(peakHz), peakPowHz: Math.round(peakPowHz),
        bytePct: byte.map((v) => byteAll ? Math.round(1000 * v / byteAll) / 10 : 0),
        powPct: pow.map((v) => powAll ? Math.round(1000 * v / powAll) / 10 : 0),
        sfx: performance.getEntriesByType("resource").filter((e) => e.name.includes("/sfx/")).map((e) => e.name.replace(/^.*\/sfx\//, "")),
      };
    };
  }, ls);
  await p.goto(집 + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);
  await pre(p);
  const el = p.locator(셀렉터).first();
  if (!(await el.count())) { console.log(`\n[${이름}] 못 찾음: ${셀렉터}`); await p.close(); return; }
  // 첫 손짓으로 통을 깨우고 그래프를 만든다(분석기가 그때 생긴다) — 소리는 두 번째 탭을 잰다
  await el.tap();
  await p.waitForTimeout(1800);
  const armed = await p.evaluate(() => window.__arm());
  if (!armed) { console.log(`\n[${이름}] 분석기가 안 생겼다 — destination 으로 가는 connect 가 없다`); await p.close(); return; }
  await el.tap();
  await p.waitForTimeout(ms);
  const r = await p.evaluate((b) => window.__report(b), BANDS);
  console.log(`\n[${이름}] ${셀렉터}`);
  console.log(`  sampleRate ${r.rate} · bin ${r.binHz.toFixed(2)}Hz · frames ${r.frames} · 받은 음원: ${r.sfx.join(", ") || "없음"}`);
  console.log(`  peak byte ${r.peakByte} @ ${r.peakHz}Hz · 파워 최대 bin @ ${r.peakPowHz}Hz`);
  const lab = ["0–300", "300–600", "600–1500", "1500+"];
  console.log(`  바이트 합 몫 : ` + lab.map((l, i) => `${l} ${r.bytePct[i]}%`).join(" | "));
  console.log(`  파워 합 몫   : ` + lab.map((l, i) => `${l} ${r.powPct[i]}%`).join(" | "));
  console.log(`  600Hz 아래 : 바이트 ${(r.bytePct[0] + r.bytePct[1]).toFixed(1)}% · 파워 ${(r.powPct[0] + r.powPct[1]).toFixed(1)}%`);
  await p.close();
}

const 목탁 = '.hip-obj[aria-label="목탁 치기"]';
const 키캡 = 'button.hip-keycap[aria-label="눌러서 한 번"]';
const 염주 = '[aria-label^="염주 굴리기"]';
const 그릇 = 'button[aria-label="싱잉볼 치기"]';

console.log(`집: ${집}`);
await 재기("목탁 · 공유마당 음원(기본)", "/moktak?lane=moktak", 목탁, { ms: 1600 });
await 재기("목탁 · 형 음원(hyung)", "/moktak?lane=moktak", 목탁, { ms: 1600, ls: { "hwadu.moktak-sfx.v1": "hyung" } });
await 재기("목탁 · 빚은 소리(음원 차단)", "/moktak?lane=moktak", 목탁, { ms: 1200, blockSfx: true });
await 재기("키캡", "/moktak?lane=keycap", 키캡, { ms: 600 });
await 재기("염주", "/moktak?lane=yeomju", 염주, { ms: 600 });
await 재기("싱잉볼(중간 그릇)", "/moktak?lane=bowl", 그릇, { ms: 3000 });
await ctx.close();
