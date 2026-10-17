// 실서버 /moktak 에서 안드로이드 UA 로 목탁을 치고, ac.destination 에 떨어지는
// **시간영역 샘플 피크**(0~1)를 읽는다. 삼켜지는 예외도 전부 적는다.
//   node scripts/sound-live-peak.mjs [주소]
import { chromium } from "playwright-core";
import { rmSync } from "node:fs";
const 집 = process.argv[2] || "https://www.hwa-du.com";
const DIR = "./.chromeprof3";
try { rmSync(DIR, { recursive: true, force: true }); } catch {}
const ctx = await chromium.launchPersistentContext(DIR, {
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  viewport: { width: 412, height: 860 },
  hasTouch: true,
  isMobile: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  args: ["--window-size=430,900", "--autoplay-policy=document-user-activation-required"],
});
const p = ctx.pages()[0] ?? await ctx.newPage();
await p.addInitScript(() => {
  window.__log = { contexts: 0, thrown: [], decoded: [], sources: [] };
  const AC = window.AudioContext;
  window.AudioContext = function (...a) {
    window.__log.contexts++;
    try {
      const ac = new AC(...a);
      window.__ac = ac;
      return ac;
    } catch (e) {
      window.__log.thrown.push("new AudioContext: " + e);
      throw e;
    }
  };
  window.AudioContext.prototype = AC.prototype;
  for (const m of Object.getOwnPropertyNames(BaseAudioContext.prototype)) {
    if (!/^create|^decodeAudioData$/.test(m)) continue;
    const o = BaseAudioContext.prototype[m];
    if (typeof o !== "function") continue;
    BaseAudioContext.prototype[m] = function (...a) {
      try {
        const r = o.apply(this, a);
        if (m === "decodeAudioData" && r && r.then) {
          r.then((b) => window.__log.decoded.push({ dur: +b.duration.toFixed(3), sr: b.sampleRate }), (e) => window.__log.thrown.push("decodeAudioData: " + e));
        }
        return r;
      } catch (e) {
        window.__log.thrown.push(m + ": " + e);
        throw e;
      }
    };
  }
  const 원래 = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (t, ...r) {
    try {
      const ac = this.context;
      if (t === ac.destination) {
        if (!window.__tap) {
          const a = ac.createAnalyser();
          a.fftSize = 32768; // 0.68초 창 — 폴링 사이에 피크를 놓치지 않게
          window.__tap = a;
          window.__tapNodes = [];
        }
        window.__tapNodes.push(this.constructor.name + (this.gain ? "(gain=" + this.gain.value + ")" : ""));
        원래.call(this, window.__tap);
      }
    } catch (e) {
      window.__log.thrown.push("connect: " + e);
    }
    return 원래.call(this, t, ...r);
  };
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    try { window.__log.sources.push(this.buffer ? +this.buffer.duration.toFixed(3) : null); } catch {}
    return st.apply(this, a);
  };
  window.__peak = () => {
    const a = window.__tap;
    if (!a) return -1;
    const d = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(d);
    let pk = 0;
    for (const v of d) pk = Math.max(pk, Math.abs(v));
    return pk;
  };
});
await p.goto(집 + "/moktak", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(7000);
const 목탁 = p.locator('.hip-obj[aria-label="목탁 치기"]').first();
if (!(await 목탁.count())) {
  console.log("목탁을 못 찾음");
  await ctx.close();
  process.exit(0);
}
const 한번 = async (label) => {
  await 목탁.tap();
  let pk = 0;
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(100);
    pk = Math.max(pk, await p.evaluate(() => window.__peak()));
  }
  console.log(`  ${label} → destination 샘플 피크 ${pk.toFixed(4)} (${pk > 0 ? (20 * Math.log10(pk)).toFixed(1) + " dBFS" : "무음"})`);
  return pk;
};
await 한번("첫 타(음원 로드 전이면 빚은 소리)");
await p.waitForTimeout(1500);
await 한번("둘째 타");
await 한번("셋째 타");
await p.waitForTimeout(3000);
await 한번("3초 쉬고 넷째 타");
await p.waitForTimeout(6000);
await 한번("6초 쉬고 다섯째 타");
await 한번("바로 여섯째 타");
const 상태 = await p.evaluate(() => ({
  ...window.__log,
  sampleRate: window.__ac?.sampleRate,
  state: window.__ac?.state,
  baseLatency: window.__ac?.baseLatency,
  outputLatency: window.__ac?.outputLatency,
  tapNodes: window.__tapNodes,
  muted: localStorage.getItem("hwadoo.sound-muted.v1"),
  dpr: devicePixelRatio,
}));
console.log(`집: ${집}`);
console.log(JSON.stringify(상태, null, 1));
await ctx.close();
