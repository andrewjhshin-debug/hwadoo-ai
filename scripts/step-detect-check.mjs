// 걸음 세기 확인 — `node --experimental-strip-types scripts/step-detect-check.mjs`
//
// 가짜 센서 흔적(50Hz, 중력 9.81 이 비스듬히 실림)을 만들어 모듈에 먹이고 센 수를 기대와 견준다.
// 형: 「진짜 한 걸음으로 카운팅 되도록 해야 해」 — 걸으면 세고, 안 걸으면 안 세야 한다.
import { createStepDetector } from "../src/lib/stepDetect.ts";

const HZ = 50;
const DT = 1000 / HZ;

// 결정적 난수 — 돌릴 때마다 같은 흔적
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// 백색 잡음 — 가우시안 비슷하게(균등 셋 합)
const 잡음 = (r, 폭) => (r() + r() + r() - 1.5) * 폭 * 1.6;

// 폰이 비스듬히 — 중력이 세 축에 나뉘어 실린다
const 중력 = (() => {
  const v = [0.35, 0.8, 0.49];
  const n = Math.hypot(...v);
  return v.map((c) => (c / n) * 9.81);
})();
const 위 = 중력.map((c) => c / 9.81); // 걸음 충격은 대개 중력 방향(위아래)

/** 흔적 한 표본을 만드는 함수 f(t초, r) → [ax, ay, az] (중력 없이) 를 받아 돌린다 */
function 돌리기(초, f, seed = 7) {
  const r = rng(seed);
  let 센 = 0;
  const d = createStepDetector({ onStep: (n) => (센 += n) });
  const n = Math.round(초 * HZ);
  for (let i = 0; i < n; i++) {
    const t = i / HZ;
    const [x, y, z] = f(t, r);
    d.feed(중력[0] + x, 중력[1] + y, 중력[2] + z, i * DT);
  }
  return 센;
}

/**
 * 걸음 충격 — 발이 닿을 때 반 사인(120ms) 으로 올라갔다가 작게 되튄다.
 * 걸음마다 세기가 ±15% 흔들리고, 간격도 ±6% 흔들린다 — 사람은 메트로놈이 아니다.
 */
function 걷기(hz, 진폭, 잡음폭, 걸음수, { 시작 = 0.5 } = {}) {
  const 간격 = 1 / hz;
  const 걸음들 = [];
  let t = 시작;
  const r0 = rng(99);
  for (let i = 0; i < 걸음수; i++) {
    걸음들.push({ t, a: 진폭 * (0.85 + r0() * 0.3) });
    t += 간격 * (0.94 + r0() * 0.12);
  }
  const 끝 = t + 1.5;
  const f = (t, r) => {
    let p = 0;
    for (const s of 걸음들) {
      const u = t - s.t;
      if (u >= 0 && u < 0.12) p += s.a * Math.sin((u / 0.12) * Math.PI);
      else if (u >= 0.12 && u < 0.24) p -= 0.4 * s.a * Math.sin(((u - 0.12) / 0.12) * Math.PI);
    }
    // 옆으로도 조금 — 몸은 좌우로도 흔들린다
    return [
      위[0] * p + 0.15 * p + 잡음(r, 잡음폭),
      위[1] * p + 잡음(r, 잡음폭),
      위[2] * p - 0.1 * p + 잡음(r, 잡음폭),
    ];
  };
  return { f, 끝 };
}

// 가만히 손에 들고 떨기 — 8~12Hz 가 흔들리는 불규칙 떨림
function 떨림(진폭) {
  let 위상 = 0;
  let hz = 10;
  return (t, r) => {
    hz += (r() - 0.5) * 1.5;
    hz = Math.min(12, Math.max(8, hz));
    위상 += 2 * Math.PI * hz / HZ;
    const a = 진폭 * (0.6 + r() * 0.8);
    return [a * Math.sin(위상), a * 0.5 * Math.cos(위상 * 1.3), 잡음(r, 0.02)];
  };
}

const 흔적 = [];

// ① 손에 들고 천천히 걷기
{
  const w = 걷기(1.6, 0.35, 0.05, 30);
  흔적.push({ 이름: "① 손에 들고 천천히 걷기 (1.6Hz, 0.35)", 초: w.끝, f: w.f, 기대: [27, 33] });
}
// ② 주머니 속 빠른 걷기
{
  const w = 걷기(2.2, 2.5, 0.3, 40);
  흔적.push({ 이름: "② 주머니 속 빠른 걷기 (2.2Hz, 2.5)", 초: w.끝, f: w.f, 기대: [37, 43] });
}
// ③ 가방 속 보통 걷기 — 2초 멈췄다 다시 (15+15)
{
  const a = 걷기(1.9, 1.2, 0.1, 15);
  const b = 걷기(1.9, 1.2, 0.1, 15, { 시작: a.끝 - 1.5 + 2 });
  흔적.push({ 이름: "③ 가방 속 보통 걷기, 2초 멈춤 (15+15)", 초: b.끝, f: (t, r) => a.f(t, r).map((v, i) => v + b.f(t, r)[i] - 잡음(r, 0.1)), 기대: [27, 33] });
}
// ④ 가만히 손에 들고 떨기
흔적.push({ 이름: "④ 가만히 손에 들고 떨기 (8~12Hz, 0.12)", 초: 20, f: 떨림(0.12), 기대: [0, 1] });
// ⑤ 탁자 위
흔적.push({ 이름: "⑤ 탁자 위 (잡음 0.02)", 초: 20, f: (t, r) => [잡음(r, 0.02), 잡음(r, 0.02), 잡음(r, 0.02)], 기대: [0, 0] });
// ⑥ 버스 안 앉아서 — 0.3Hz 큰 흔들림
흔적.push({
  이름: "⑥ 버스 안 앉아서 (0.3Hz, 0.8)",
  초: 20,
  f: (t, r) => {
    const s = 0.8 * Math.sin(2 * Math.PI * 0.3 * t);
    return [s * 0.7 + 잡음(r, 0.1), s * 0.3 + 잡음(r, 0.1), s * 0.5 + 잡음(r, 0.1)];
  },
  기대: [0, 2],
});
// ⑦ 폰 집어 들었다 내려놓기 — 큰 충격 둘, 1초 간격
흔적.push({
  이름: "⑦ 폰 집었다 내려놓기 (3 m/s² 둘, 1초)",
  초: 10,
  f: (t, r) => {
    let p = 0;
    for (const at of [4, 5]) {
      const u = t - at;
      if (u >= 0 && u < 0.08) p += 3 * Math.sin((u / 0.08) * Math.PI);
    }
    return [p * 0.6 + 잡음(r, 0.02), p * 0.8 + 잡음(r, 0.02), 잡음(r, 0.02)];
  },
  기대: [0, 0],
});
// ⑧ 걷다가 서서 폰 보기 — 15걸음, 5초 떨림, 15걸음
{
  const a = 걷기(1.6, 0.35, 0.05, 15);
  const 멈춤 = a.끝 - 1.5;
  const b = 걷기(1.6, 0.35, 0.05, 15, { 시작: 멈춤 + 5 });
  const 떨 = 떨림(0.12);
  흔적.push({
    이름: "⑧ 걷다 서서 폰 보기 (15 + 5초 떨림 + 15)",
    초: b.끝,
    f: (t, r) => {
      const 걸 = t < 멈춤 ? a.f(t, r) : b.f(t, r);
      if (t >= 멈춤 && t < 멈춤 + 5) {
        const d = 떨(t, r);
        return 걸.map((v, i) => v + d[i]);
      }
      return 걸;
    },
    기대: [27, 33],
  });
}

let ok = 0;
console.log("흔적                                              센   기대      판정");
for (const h of 흔적) {
  const 센 = 돌리기(h.초, h.f);
  const 맞음 = 센 >= h.기대[0] && 센 <= h.기대[1];
  if (맞음) ok += 1;
  const 기대글 = h.기대[0] === h.기대[1] ? `${h.기대[0]}` : `${h.기대[0]}~${h.기대[1]}`;
  console.log(`${h.이름.padEnd(44, " ")} ${String(센).padStart(4)}   ${기대글.padEnd(8)}  ${맞음 ? "✅" : "❌"}`);
}
console.log(`\n✅ ${ok} / ${흔적.length}`);
process.exitCode = ok === 흔적.length ? 0 : 1;
