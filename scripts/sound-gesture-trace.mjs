// 손짓 → resume() 사이가 **동기인가**를 실제 크롬에서 잰다.
//   node scripts/sound-gesture-trace.mjs [주소]   (안 주면 실서버)
//
// 모바일 크롬은 「사용자 활성화」 안에서 부른 resume() 만 받는다.
// 그래서 resume()·start() 가 불리는 그 순간의
//   navigator.userActivation.isActive   (지금 손짓 안인가)
//   navigator.userActivation.hasBeenActive (한 번이라도 손짓이 있었나 — 끈끈한 활성화)
//   window.event.type                    (어느 이벤트 처리 중인가)
// 를 적는다. isActive=false 인 resume() 은 크롬이 그냥 버린다.
//
// 갈래마다 **새 판(새 컨텍스트)** 에서 첫 손짓을 넣는다 — 끈끈한 활성화가
// 앞 갈래에서 넘어오면 측정이 거짓이 된다.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const 집 = process.argv[2] || "https://www.hwa-du.com";
const UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

const br = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, // 헤드리스는 출력 장치가 없어 통이 영영 suspended 다 — 창을 띄운다
  args: ["--autoplay-policy=document-user-activation-required"],
});

async function 새판() {
  const ctx = await br.newContext({
    viewport: { width: 412, height: 860 },
    isMobile: true,
    hasTouch: true,
    userAgent: UA,
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__log = [];
    window.__lastInput = { type: "-", t: 0 };
    for (const ev of ["pointerdown", "touchstart", "touchend", "pointerup", "click", "keydown"]) {
      document.addEventListener(ev, () => { window.__lastInput = { type: ev, t: performance.now() }; }, true);
    }
    const 적기 = (what, ctx) => {
      const ua = navigator.userActivation;
      window.__log.push({
        what,
        isActive: ua ? ua.isActive : null,
        hasBeen: ua ? ua.hasBeenActive : null,
        evt: window.event ? window.event.type : "(없음)",
        state: ctx.state,
        sinceInput: Math.round(performance.now() - window.__lastInput.t),
        lastInput: window.__lastInput.type,
      });
    };
    const AC = window.AudioContext;
    const 원래ctor = AC;
    // 통이 만들어지는 순간도 적는다
    window.AudioContext = function (...a) {
      const c = new 원래ctor(...a);
      적기("new AudioContext", c);
      return c;
    };
    window.AudioContext.prototype = 원래ctor.prototype;
    const r = AC.prototype.resume;
    AC.prototype.resume = function () {
      적기("resume()", this);
      const pr = r.call(this);
      pr.then(() => 적기("resume 풀림", this), () => 적기("resume 거절", this));
      return pr;
    };
    // AudioBufferSourceNode 는 제 start 를 따로 가진다(IDL) — 둘 다 감싼다
    for (const K of [AudioScheduledSourceNode, AudioBufferSourceNode]) {
      const s = K.prototype.start;
      if (!Object.prototype.hasOwnProperty.call(K.prototype, "start")) continue;
      K.prototype.start = function (...a) { 적기(K === AudioBufferSourceNode ? "buffer.start()" : "osc.start()", this.context); return s.apply(this, a); };
    }
    // 스피커로 가는 세기
    window.__tap = null;
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (t, ...rest) {
      try {
        if (t === this.context.destination) {
          if (!window.__tap) { const a = this.context.createAnalyser(); a.fftSize = 2048; window.__tap = a; }
          conn.call(this, window.__tap);
        }
      } catch {}
      return conn.call(this, t, ...rest);
    };
    window.__peak = () => {
      if (!window.__tap) return -1;
      const d = new Uint8Array(window.__tap.frequencyBinCount);
      window.__tap.getByteFrequencyData(d);
      return Math.max(...d);
    };
  });
  return { ctx, p };
}

async function 재기(p, ms = 500) {
  let peak = 0;
  for (let i = 0; i < ms / 40; i++) {
    await p.waitForTimeout(40);
    peak = Math.max(peak, await p.evaluate(() => window.__peak()));
  }
  return peak;
}

function 보고(이름, log, peak, state) {
  console.log(`\n■ ${이름}`);
  if (!log.length) console.log("  (resume/start 가 한 번도 안 불림)");
  for (const l of log) {
    const ok = l.what === "resume()" ? (l.isActive || l.hasBeen ? "✅" : "❌ 버려짐") : "";
    console.log(
      `  ${l.what.padEnd(18)} evt=${String(l.evt).padEnd(12)} isActive=${l.isActive} hasBeen=${l.hasBeen} 통=${l.state} 마지막입력=${l.lastInput}+${l.sinceInput}ms ${ok}`
    );
  }
  console.log(`  → 끝 상태 통=${state} · 스피커 세기=${peak} ${peak > 0 ? "✅ 나간다" : "❌ 0"}`);
}

async function 갈래(lane, selector, 이름) {
  const { ctx, p } = await 새판();
  await p.goto(`${집}/moktak?lane=${lane}`, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(3500);
  const el = p.locator(selector).first();
  if (!(await el.count())) { console.log(`\n■ ${이름} — ${selector} 못 찾음`); await ctx.close(); return; }
  await p.evaluate(() => { window.__log = []; });
  await el.tap();
  const peak = await 재기(p, 600);
  const { log, state } = await p.evaluate(() => ({ log: window.__log, state: window.__ac?.state ?? "?" }));
  보고(이름, log, peak, log.at(-1)?.state ?? "?");
  await ctx.close();
}

await 갈래("moktak", '.hip-obj[aria-label="목탁 치기"]', "목탁 — onClick → hit → strikeMoktak (첫 손짓)");
await 갈래("keycap", ".hip-keycap", "키캡 — onPointerDown → pressKey → clickKeycap (첫 손짓)");
await 갈래("yeomju", '.hip-obj-sq[aria-label^="염주"]', "염주 — 톡 → onPointerUp → advance → clickBead (첫 손짓)");
await 갈래("bowl", '[aria-label="싱잉볼 치기"]', "싱잉볼 — onClick → ringBowl → strikeBowl (첫 손짓)");

// 백팔배 — 폰에서는 손짓 없이 기울기만으로 센다. 손짓 없이 통이 깨어나는가?
{
  const { ctx, p } = await 새판();
  await p.goto(`${집}/bae`, { waitUntil: "load", timeout: 60000 });
  // 3초 안에 표본이 없으면 센서를 「없음」으로 접는다 — 그 전에 흔든다
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__log = []; });
  // 기울기 흉내 — 선 자세 1.1초(표본 15) → 숙임 30도 0.4초 → 되돌림 → onBow
  await p.evaluate(async () => {
    const fire = (beta) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { alpha: 0, beta, gamma: 0 }));
    for (let i = 0; i < 15; i++) { fire(0); await new Promise((d) => setTimeout(d, 75)); }
    for (let i = 0; i < 6; i++) { fire(40); await new Promise((d) => setTimeout(d, 70)); }
    for (let i = 0; i < 4; i++) { fire(0); await new Promise((d) => setTimeout(d, 70)); }
  });
  const peak = await 재기(p, 600);
  const log = await p.evaluate(() => window.__log);
  보고("백팔배 — 기울기(deviceorientation) → onBow → strikeJukbi (손짓 없음)", log, peak, log.at(-1)?.state ?? "?");
  await ctx.close();
}

await br.close();
