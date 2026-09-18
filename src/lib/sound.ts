// ─────────────────────────────────────────────────────────────
// 도량의 소리 — Web Audio 로 그 자리에서 빚는다. 음원 파일이 없다.
// 목탁·염주·죽비를 목탁 방과 백팔배 방이 함께 쓴다.
// 첫 터치에서 AudioContext 를 깨운다(브라우저 정책).
// ─────────────────────────────────────────────────────────────

// ── 소리 — 나무를 빚는다 ────────────────────────────────────

let actx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!actx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

// 짧은 백색소음 버퍼 — 나무 결의 재료
let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 절 마당의 울림 — 목탁 소리 뒤에 남는 꼬리.
// 노이즈로 임펄스를 빚어 컨볼버에 물린다(음원 파일 없이 만드는 잔향).
let hallNode: ConvolverNode | null = null;
let hallGain: GainNode | null = null;
function hall(ac: AudioContext): GainNode {
  if (!hallNode || !hallGain) {
    const secs = 1.4;
    const n = Math.floor(ac.sampleRate * secs);
    const ir = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i++) {
        // 앞쪽은 성기게, 뒤로 갈수록 촘촘하게 — 나무 마루 깔린 방의 결
        const decay = Math.pow(1 - i / n, 3.2);
        d[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    hallNode = ac.createConvolver();
    hallNode.buffer = ir;
    // 잔향은 어둡게 — 나무 울림이지 유리가 아니다
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    hallGain = ac.createGain();
    hallGain.gain.value = 1;
    hallGain.connect(lp);
    lp.connect(hallNode);
    const wet = ac.createGain();
    wet.gain.value = 0.85;
    hallNode.connect(wet);
    wet.connect(ac.destination);
  }
  return hallGain;
}

// 귀가 아프지 않게 — 세게 쳐도 찌그러지지 않도록 한 번 눌러 준다
let bus: DynamicsCompressorNode | null = null;
function master(ac: AudioContext): DynamicsCompressorNode {
  if (!bus) {
    bus = ac.createDynamicsCompressor();
    bus.threshold.value = -12;
    bus.knee.value = 20;
    bus.ratio.value = 6;
    bus.attack.value = 0.002;
    bus.release.value = 0.18;
    bus.connect(ac.destination);
  }
  return bus;
}

// ── 목탁 한 방 ──────────────────────────────────────────────
//
// 코드로 빚어 봤지만 나무는 나무다. 실제로 친 소리를 쓴다 —
//   공유마당 「목탁2」 · 김용배 · CC BY (한국저작권위원회)
//   20초 녹음에서 첫 타 한 번(0.9초)만 잘라 냈다. public/sfx/moktak.wav
// 표기는 /about 도량 안내에 남겨 두었다.
//
// 음원은 한 번만 받아 두고(AudioBuffer), 칠 때마다 새 소스를 물린다.
// 아직 안 받아졌으면 아래 synthMoktak 이 대신 운다 — 첫 타를 놓치지 않게.

//
// **음원이 둘이다.** 한 번 치는 소리와 잔발로 구르는 소리는 다른 소리다 —
// 필터로 흉내 내 봤지만, 진짜는 채가 나무에 얹히는 그 순간의 「닫힘」이
// 파형에 새겨져 있어서 깎아서는 안 나온다. 그래서 둘 다 떠 왔다.
//   moktak.wav       한 번 툭 — 1.05초, 통이 다 울고 꺼진다 (「똥」)
//   moktak-roll.wav  잔발 한 알 — 0.2초, 백 밀리초 만에 죽는다 (「똑」)
// 형이 준 녹음(목탁2.wav · 목탁소리(이미지)2.wav)은 느린 단타에서
// 시작해 점점 빨라지는 한 판이라, 같은 목탁의 두 얼굴이 한 파일에 있었다.
const MOKTAK_URL = "/sfx/moktak.wav";
const MOKTAK_ROLL_URL = "/sfx/moktak-roll.wav";
let moktakBuf: AudioBuffer | null = null;
let moktakRollBuf: AudioBuffer | null = null;
let moktakAsked = false;

function loadMoktak(ac: AudioContext) {
  if (moktakAsked) return;
  moktakAsked = true;
  const get = (url: string) =>
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("no file"))))
      .then((b) => ac.decodeAudioData(b));
  get(MOKTAK_URL)
    .then((buf) => {
      moktakBuf = buf;
    })
    .catch(() => {
      // 못 받았으면 빚은 소리로 간다 — 조용히
    });
  get(MOKTAK_ROLL_URL)
    .then((buf) => {
      moktakRollBuf = buf;
    })
    .catch(() => {
      // 잔발 음원이 없으면 단타를 깎아 쓴다 — 아래가 알아서 돌아간다
    });
}

/** 미리 받아 둔다 — 목탁 방에 들어서는 순간 부르면 첫 타가 늦지 않는다 */
export function warmMoktak() {
  const ac = audio();
  if (ac) loadMoktak(ac);
}

// ── 죽비(竹篦) 음원 ────────────────────────────────────────────
//
// 코드로 빚은 소리를 오래 썼는데, 형 말대로 얇았다. 마른 파열음은
// 대나무가 갈라지는 **결**이 있어야 하는데 잡음을 걸러 만든 소리로는
// 그 결이 안 나온다. 진짜 죽비 한 방을 떼어다 놓는다.
// 못 받았거나 아직 안 받아졌으면 아래 synthJukbi 가 대신 친다.
const JUKBI_URL = "/sfx/jukbi.wav";
let jukbiBuf: AudioBuffer | null = null;
let jukbiAsked = false;

function loadJukbi(ac: AudioContext) {
  if (jukbiAsked) return;
  jukbiAsked = true;
  fetch(JUKBI_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("no file"))))
    .then((b) => ac.decodeAudioData(b))
    .then((buf) => {
      jukbiBuf = buf;
    })
    .catch(() => {
      // 못 받았으면 빚은 소리로 간다 — 조용히
    });
}

/** 미리 받아 둔다 — 삼배·백팔배 방에 들어서는 순간 */
export function warmJukbi() {
  const ac = audio();
  if (ac) loadJukbi(ac);
}

// ── 빠르기가 소리를 바꾼다 ──────────────────────────────────
//
// 진짜 목탁은 한 번 칠 때와 잔발로 굴릴 때가 딴 소리다. 까닭은 셋이다.
//   ① 채가 몸통을 막는다. 잔발은 채가 나무 위에 자주 얹히니 속 빈 통이
//      낮은 소리를 다 울 틈이 없다 — 「똥」이 아니라 「똑」이 된다.
//   ② 잔발은 손목만 쓴다. 약하게 치니 낮은 마디가 덜 살고, 상대적으로
//      채가 닿는 「딱」이 도드라져 소리가 높게 들린다.
//   ③ 앞 소리가 채 가시기 전에 다음이 온다. 꼬리가 잘린다.
//
// 그래서 친 간격(IOI)을 재어 그대로 옮긴다.
//   느리게  = 낮고 굵고 길게, 방 울림도 넉넉히
//   잔발    = 높고 마르고 짧게, 방 울림은 거의 없이, 앞 소리는 눌러 끈다
// 잔발이 이어질수록 한 눈금씩 더 조인다(또-또-도-도-도).

/** 마지막으로 친 때 (ac.currentTime) */
let lastHit = -99;
/** 이번 잔발에서 몇 번째인가 */
let rollN = 0;
/** 지금 울고 있는 소리 — 잔발이면 눌러 끈다 */
let ringing: { g: GainNode; src: AudioBufferSourceNode } | null = null;

/** 이 간격이면 잔발로 친다 */
const ROLL_GAP = 0.34;
/** 가장 빠른 잔발 */
const FAST_GAP = 0.07;

export function strikeMoktak(vol: number) {
  const ac = audio();
  if (!ac) return;
  loadMoktak(ac);

  const t = ac.currentTime;
  const gap = t - lastHit;
  lastHit = t;

  // 0 = 한 번 툭 · 1 = 가장 빠른 잔발
  const speed = Math.max(0, Math.min(1, (ROLL_GAP - gap) / (ROLL_GAP - FAST_GAP)));
  rollN = gap < ROLL_GAP ? Math.min(rollN + 1, 10) : 0;
  const roll = rollN / 10; // 잔발이 얼마나 이어졌나

  if (!moktakBuf) {
    synthMoktak(ac, vol, speed);
    return;
  }

  // 앞 소리 누르기 — 채가 나무에 얹히는 그 순간.
  //
  // 예전엔 빠를수록 **매몰차게** 끊었다(4ms). 그래서 잔발이 「똑똑똑」
  // 하는 마른 점의 나열이 됐다. 진짜 목탁은 그렇지 않다 —
  // 채가 얹혀 **앞 소리의 머리만** 눌릴 뿐, 통 안의 울림은 계속 산다.
  // 오히려 빨리 칠수록 울림이 겹쳐 쌓인다. 끊는 시간을 늘리고,
  // 완전히 죽이지 않고 한 겹 남긴다.
  if (ringing && speed > 0.2) {
    const { g } = ringing;
    const off = 0.05 + 0.06 * (1 - speed);
    const leave = 0.18; // 다 죽이지 않는다 — 이 한 겹이 공명이 된다
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, g.gain.value * leave),
        t + off
      );
    } catch {
      /* 이미 끝난 소리 */
    }
  }

  // 어느 얼굴로 울 것인가 — 반 넘게 빠르면 잔발 음원으로 갈아탄다.
  // 갈아타는 자리에서 소리가 툭 바뀌지 않도록, 깎는 정도(아래 hp·rate)는
  // 어느 쪽을 쓰느냐에 따라 달리 준다. 잔발 음원은 이미 짧고 마른 소리라
  // 거의 안 깎아도 된다.
  const useRoll = !!moktakRollBuf && speed > 0.5;
  const src = ac.createBufferSource();
  src.buffer = useRoll ? moktakRollBuf : moktakBuf;
  // 나무는 칠 때마다 조금씩 다르다(±3%). 거기에 빠르기를 얹는다 —
  // 빠를수록 짧고 높게. 잔발이 이어지면 반 눈금 더.
  src.playbackRate.value = useRoll
    ? (0.985 + Math.random() * 0.03) * (1 + 0.06 * (speed - 0.5) * 2 + 0.03 * roll)
    : (0.985 + Math.random() * 0.03) * (1 + 0.2 * speed + 0.055 * roll);

  // 낮은 통울림을 깎는다 — 잔발은 「딱」만 남는다.
  // 잔발 음원은 통울림이 애초에 없으니 살짝만 건드린다.
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = useRoll ? 150 + 90 * roll : 80 + 520 * speed + 140 * roll;
  hp.Q.value = 0.7;

  const out = ac.createGain();
  // 잔발은 손목만 쓴다 — 여리되, 너무 죽이면 몸통이 사라진다.
  // 아래에 통울림 한 겹을 따로 깔기 때문에 여기서 덜 깎아도 된다.
  out.gain.value = vol * 1.15 * (1 - 0.3 * speed) * (1 - 0.1 * roll);

  src.connect(hp);
  hp.connect(out);
  out.connect(master(ac));

  // ── 몸통 한 겹 ──
  // 잔발 음원은 0.2초라 「딱」만 있고 통이 없다. 그래서 빨리 치면
  // 나무 조각 두드리는 소리가 됐다. 진짜 목탁은 빨리 칠수록 통 안에
  // 울림이 **쌓인다.** 그래서 잔발일 때 단타 음원을 여리게 한 겹 깔아
  // 몸통을 만든다. 높이만 맞추고 소리는 뒤로 물린다.
  if (useRoll && moktakBuf) {
    const body = ac.createBufferSource();
    body.buffer = moktakBuf;
    body.playbackRate.value = src.playbackRate.value * 1.06;
    const bodyHp = ac.createBiquadFilter();
    bodyHp.type = "highpass";
    bodyHp.frequency.value = 110; // 바닥만 걷는다 — 통은 남긴다
    const bg = ac.createGain();
    // 잔발이 이어질수록 조금씩 더 깐다 — 울림이 겹쳐 쌓이는 결
    bg.gain.value = vol * (0.2 + 0.16 * roll);
    body.connect(bodyHp);
    bodyHp.connect(bg);
    bg.connect(master(ac));
    bg.connect(hall(ac));
    body.start(t);
  }

  // 방의 울림 — 잔발이라고 끊지 않는다.
  // 예전엔 82%를 깎아 잔발이 마른 소리가 됐다. 빨리 칠수록 울림이
  // 쌓이는 게 맞다 — 조금만 눌러 죽이 되지 않을 만큼만 둔다.
  const send = ac.createGain();
  send.gain.value = vol * 0.3 * (1 - 0.25 * speed);
  out.connect(send);
  send.connect(hall(ac));

  src.start(t);

  // 꼬리 자르기 — 빠르면 다음 타가 오기 전에 스스로 잦아든다
  const tail = 0.62 - 0.44 * speed;
  out.gain.setValueAtTime(out.gain.value, t + tail * 0.55);
  out.gain.exponentialRampToValueAtTime(0.0001, t + tail);
  src.stop(t + tail + 0.03);

  ringing = { g: out, src };
  src.onended = () => {
    if (ringing?.src === src) ringing = null;
  };
}

// ── 빚은 목탁 — 음원이 없을 때만 ────────────────────────────
// 딱(채가 닿는 표면) + 퍽(때리는 힘) + 통(속 빈 구멍) + 어긋난 배음 넷.
// 나무는 짧게 끝난다 — 길게 끌면 종이 된다.
function synthMoktak(ac: AudioContext, vol: number, speed = 0) {
  const t = ac.currentTime;

  const out = ac.createGain();
  // 잔발은 여리게 — 음원 있을 때와 같은 결(strikeMoktak 주석 참고)
  out.gain.value = vol * 1.5 * (1 - 0.42 * speed);
  out.connect(master(ac));

  const send = ac.createGain();
  send.gain.value = vol * 0.34 * (1 - 0.82 * speed);
  out.connect(send);
  send.connect(hall(ac));

  // 빠를수록 높고 짧게 — 속 빈 통이 낮은 소리를 다 울 틈이 없다
  const drift = (0.96 + Math.random() * 0.08) * (1 + 0.22 * speed);
  const shrink = 1 - 0.5 * speed;
  const burst = (dur: number) => {
    const s = ac.createBufferSource();
    s.buffer = noise(ac);
    s.loop = true;
    s.start(t);
    s.stop(t + dur + 0.02);
    return s;
  };

  {
    const s = burst(0.03);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
    s.connect(hp);
    hp.connect(g);
    g.connect(out);
  }
  {
    const s = burst(0.06);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1150 * drift;
    bp.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.034);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
  }
  {
    const s = burst(0.3);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 248 * drift;
    bp.Q.value = 7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * (1 - 0.55 * speed), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24 * shrink);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
  }

  const base = 452 * drift;
  ([
    [1, 0.5, 0.3],
    [1.58, 0.34, 0.19],
    [2.71, 0.2, 0.11],
    [4.36, 0.1, 0.06],
  ] as const).forEach(([mul, amp, dur]) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(base * mul, t);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
  });
}

// 염주 한 알 — 알끼리 부딪는 또렷한 딸깍 (묵직한 속살 한 점 포함)
export function clickBead(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol * 1.15;
  out.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);

  const o = ac.createOscillator();
  o.type = "sine";
  const f = 1700 + Math.random() * 200;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.035);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.08);

  // 알의 속살 — 낮은 나무 울림 아주 짧게 (소리에 무게를 준다)
  const o3 = ac.createOscillator();
  o3.type = "sine";
  o3.frequency.setValueAtTime(420 + Math.random() * 40, t);
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.0001, t);
  g3.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o3.connect(g3);
  g3.connect(out);
  o3.start(t);
  o3.stop(t + 0.08);
}

// ── 싱잉볼(magic bowl) — 한 번 치면 오래 운다 ─────────────────
//
// 목탁은 나무라 녹음을 썼다. 싱잉볼은 반대다 — 금속 그릇의 소리는
// **몇 개의 배음과 아주 긴 감쇠**가 거의 전부라, 빚는 편이 녹음보다 낫다.
// 녹음은 30초짜리라 파일이 무겁고 자르면 꼬리가 뚝 끊긴다.
//
// 싱잉볼의 결 세 가지를 그대로 옮겼다 —
//  ① 배음이 정수배가 아니다. 1 : 2.74 : 5.40 : 8.93 — 종·그릇의 비율이다.
//     정수배로 깔면 오르간이 된다.
//  ② **울렁임(beating)**. 그릇은 완벽한 동그라미가 아니어서 같은 모드가
//     아주 조금 어긋난 두 주파수로 갈린다. 그 차(0.7~2Hz)가 「우- 웅- 우- 웅-」
//     하는 맥놀이다. 이게 없으면 그냥 신시사이저 소리다.
//  ③ 높은 배음일수록 먼저 죽는다. 그래서 시간이 갈수록 소리가 둥글어진다.
//
// 채로 때린 순간의 「탁」도 아주 짧게 얹는다 — 그게 없으면 소리가
// 어디선가 스르륵 생겨난 것처럼 들린다.

/** 배음 비율 · 처음 세기 · 감쇠(초) · 갈라짐(Hz) */
const BOWL_MODES: [ratio: number, gain: number, decay: number, split: number][] = [
  [1, 0.42, 14, 0.7],
  [2.74, 0.3, 9.5, 1.1],
  [5.4, 0.16, 5.5, 1.7],
  [8.93, 0.075, 3.2, 2.3],
  [13.3, 0.03, 1.8, 3.1],
];

/** 그릇의 기본음 — 큰 그릇일수록 낮다. 셋을 돌려 쓴다(작은·중간·큰) */
export const BOWL_TONES = [
  { id: "small", label: "작은 그릇", hz: 288 },
  { id: "mid", label: "중간 그릇", hz: 210 },
  { id: "big", label: "큰 그릇", hz: 146 },
] as const;

export type BowlTone = (typeof BOWL_TONES)[number]["id"];

/** 지금 울고 있는 그릇 — 다시 치면 앞 소리를 부드럽게 재운다 */
let bowlStop: (() => void) | null = null;

/** 울고 있는가 — 화면이 「그치기」 단추를 보일지 정한다 */
export function bowlRinging(): boolean {
  return bowlStop !== null;
}

/** 여운을 남기고 그친다 (손바닥으로 그릇을 감싸 쥐듯) */
export function hushBowl(sec = 1.1) {
  bowlStop?.();
  bowlStop = null;
  void sec;
}

/**
 * 싱잉볼을 한 번 친다. 이미 울고 있으면 앞 소리를 재우고 새로 친다.
 * 돌려주는 값은 이 소리가 몇 초쯤 갈지 — 화면이 여운을 그릴 때 쓴다.
 */
export function strikeBowl(vol: number, tone: BowlTone = "mid"): number {
  const ac = audio();
  if (!ac) return 0;
  const base = BOWL_TONES.find((b) => b.id === tone)?.hz ?? 210;
  const t = ac.currentTime;

  // 앞 소리는 짧게 재운다 — 뚝 끊지 않는다
  bowlStop?.();

  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(master(ac));
  // 잔향 — 법당 울림을 조금만 태운다
  const send = ac.createGain();
  send.gain.value = 0.5;
  out.connect(send);
  send.connect(hall(ac));

  const nodes: { osc: OscillatorNode[]; g: GainNode } = { osc: [], g: out };
  let longest = 0;

  for (const [ratio, gain, decay, split] of BOWL_MODES) {
    longest = Math.max(longest, decay);
    // 한 모드를 두 갈래로 — 이 미세한 어긋남이 맥놀이를 만든다
    for (const side of [-0.5, 0.5]) {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = base * ratio + side * split;
      const g = ac.createGain();
      // 때린 순간 솟았다가 길게 사그라든다
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012 + ratio * 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
      nodes.osc.push(o);
    }
  }

  // 채가 닿는 순간 — 아주 짧은 금속 긁힘
  const hit = ac.createBufferSource();
  hit.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = base * 6;
  bp.Q.value = 1.1;
  const hg = ac.createGain();
  hg.gain.setValueAtTime(0.5, t);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  hit.connect(bp);
  bp.connect(hg);
  hg.connect(out);
  hit.start(t);

  // 그치기 — 소리를 1초쯤에 걸쳐 재우고 발을 뺀다
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    const now = ac.currentTime;
    try {
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      for (const o of nodes.osc) o.stop(now + 1.2);
    } catch {
      /* 이미 끝난 소리 */
    }
    if (bowlStop === stop) bowlStop = null;
  };
  bowlStop = stop;
  // 제 수명을 다하면 스스로 물러난다
  window.setTimeout(() => {
    if (bowlStop === stop) bowlStop = null;
  }, (longest + 0.3) * 1000);

  return longest;
}

export function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* 진동이 없는 기기 */
  }
}


// ── 숨소리 — 들숨·날숨 ─────────────────────────────────────────
// 목탁은 한 방이라 0.06초 버퍼로 족했지만, 숨은 몇 초를 이어 간다.
// 짧은 버퍼를 돌리면 그 반복 주기가 '웅—' 하는 음으로 들리므로,
// 한 호흡을 통째로 덮을 만큼 길게(8초) 한 번만 빚어 두고 돌려 쓴다.
// 백색이 아니라 핑크 노이즈 — 높은 대역이 눌려 사람 숨결에 가깝다.
let breathBuf: AudioBuffer | null = null;
function breathNoise(ac: AudioContext): AudioBuffer {
  if (!breathBuf) {
    const len = Math.floor(ac.sampleRate * 8);
    breathBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = breathBuf.getChannelData(0);
    // Paul Kellet 근사 — 필터 여럿을 겹쳐 1/f 기울기를 만든다
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return breathBuf;
}

// 한 호흡을 빚는다. 들숨은 밝아지며 차오르고, 날숨은 어두워지며 잦아든다.
// 돌려주는 함수를 부르면 곧바로 숨을 거둔다 — 마디가 바뀌거나 판을 마칠 때.
function breathe(kind: "in" | "out", sec: number, vol: number): () => void {
  const ac = audio();
  // vol 0 으로 부르면 소리는 내지 않고 오디오 문만 연다(첫 터치에서 깨우기)
  if (!ac || sec <= 0 || vol <= 0) return () => {};
  try {
    const t = ac.currentTime;
    const dur = Math.max(0.3, sec);
    const rise = kind === "in";

    const out = ac.createGain();
    out.gain.value = rise ? vol : vol * 0.8; // 날숨은 들숨보다 조금 낮게
    out.connect(ac.destination);

    const src = ac.createBufferSource();
    src.buffer = breathNoise(ac);
    src.loop = true; // 8초를 넘겨 부르는 일은 드물지만, 끊기지는 않게

    // 코를 지나는 바람의 자리 — 이 통과 대역이 '스으—' 를 만든다
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.85;
    if (rise) {
      bp.frequency.setValueAtTime(420, t);
      bp.frequency.exponentialRampToValueAtTime(1250, t + dur * 0.7);
      bp.frequency.exponentialRampToValueAtTime(880, t + dur);
    } else {
      bp.frequency.setValueAtTime(1050, t);
      bp.frequency.exponentialRampToValueAtTime(360, t + dur);
    }

    // 바닥의 웅웅거림은 걷어낸다 — 숨은 가벼워야 한다
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 170;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    if (rise) {
      // 들숨 — 천천히 차올라 끝자락에서 멎는다
      g.gain.exponentialRampToValueAtTime(0.95, t + dur * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      // 날숨 — 처음에 툭 터지고 길게 놓아 준다
      g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    src.connect(bp);
    bp.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.1);

    let hushed = false;
    return () => {
      if (hushed) return;
      hushed = true;
      try {
        const now = ac.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12); // 뚝 끊기면 '툭' 한다
        src.stop(now + 0.16);
      } catch {
        /* 이미 멎은 숨 */
      }
    };
  } catch {
    return () => {}; // 소리는 곁가지다 — 조용히 삼킨다
  }
}

// 들숨 — sec 초 동안 차오른다
export function breatheIn(sec: number, vol = 0.45) {
  return breathe("in", sec, vol);
}

// 날숨 — sec 초 동안 잦아든다
export function breatheOut(sec: number, vol = 0.45) {
  return breathe("out", sec, vol);
}

// 첫 터치에서 오디오 문을 미리 열어 둔다 — 첫 들숨이 늦지 않게
export function wakeBreath() {
  audio();
}

// 죽비(竹篦) + 종울림 — 삼배의 소리.
//
// 처음엔 마른 딱 소리 하나였다. 절 한 번에 0.1초짜리 잡음 한 점이라,
// 큰절을 올리는 몸짓에 견주면 너무 가벼웠다 — 소리가 손톱 튕기는 것 같았다.
//
// 그래서 두 겹으로 앉혔다.
//   ① 죽비  마른 파열음. 박자를 이끄는 것은 여전히 이쪽이다(짧게, 여리게).
//   ② 울림  낮은 범종 한 점. 배음을 정수배가 아니라 **살짝 어긋나게** 쌓는다 —
//           실제 종은 배음이 어긋나 있어서 그 어긋남이 맥놀이(beating)를 만들고,
//           그게 「신비롭다」고 느끼는 소리의 정체다. 정수배로 쌓으면 오르간이 된다.
//   꼬리는 2초 가까이 끈다. 절 한 번에 걸리는 시간이 그쯤이라, 다음 절을
//   시작할 즈음 앞 소리가 막 사라진다.
export function strikeJukbi(vol: number) {
  const ac = audio();
  if (!ac) return;
  loadJukbi(ac);
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(ac.destination);

  // ① 죽비 — 진짜 한 방. 칠 때마다 아주 조금씩 다르게 울려야
  //    기계가 아니라 사람이 치는 것처럼 들린다(빠르기 ±3%).
  if (jukbiBuf) {
    const real = ac.createBufferSource();
    real.buffer = jukbiBuf;
    real.playbackRate.value = 0.97 + Math.random() * 0.06;
    const rg = ac.createGain();
    rg.gain.value = 0.95;
    real.connect(rg);
    rg.connect(out);
    real.start(t);
  } else {
    // 아직 안 받아졌다 — 빚은 소리로 첫 타를 놓치지 않는다
    const src = ac.createBufferSource();
    src.buffer = noise(ac);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2300 + Math.random() * 400;
    bp.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);

    // 대나무의 속 — 짧게 떨어지는 울림 한 점
    const o = ac.createOscillator();
    o.type = "triangle";
    const f = 880 + Math.random() * 120;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.07);
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.22, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2);
    g2.connect(out);
    o.start(t);
    o.stop(t + 0.12);
  }

  // ② 범종 한 점 — 어긋난 배음 넷.
  //   2.76·5.40·8.93 은 실제 종(종형 진동체)의 배음비에 가깝다.
  //   딱 떨어지지 않는 수라 서로 맥놀이를 만든다.
  const base = 108 + Math.random() * 4; // 낮게 — 가슴에 닿는 자리
  const PARTIALS: Array<[number, number, number]> = [
    [1, 0.5, 2.1],     // [배음비, 크기, 꼬리(초)]
    [2.0, 0.26, 1.7],
    [2.76, 0.2, 1.35],
    [5.4, 0.1, 0.85],
    [8.93, 0.05, 0.5],
  ];
  // 진짜 죽비가 두툼해서, 뒤에 깔리는 범종은 한 뼘 눌러 둔다.
  // 그래도 빼지는 않는다 — 「웅장하고 신비롭게」의 팔 할이 이 한 점이다.
  const bell = ac.createGain();
  bell.gain.value = jukbiBuf ? 0.42 : 0.62;
  bell.connect(out);
  for (const [ratio, amp, tail] of PARTIALS) {
    const p = ac.createOscillator();
    p.type = "sine";
    p.frequency.setValueAtTime(base * ratio, t);
    // 아주 조금 처진다 — 금속이 식듯이
    p.frequency.exponentialRampToValueAtTime(base * ratio * 0.995, t + tail);
    const pg = ac.createGain();
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + tail);
    p.connect(pg);
    pg.connect(bell);
    p.start(t);
    p.stop(t + tail + 0.05);
  }

  // 맥놀이 한 겹 — 같은 음을 아주 조금 어긋나게 겹쳐 둔다.
  // 이 한 줄이 「신비롭다」의 팔 할이다.
  const beat = ac.createOscillator();
  beat.type = "sine";
  beat.frequency.value = base * 2.0 + 0.7;
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  beat.connect(bg);
  bg.connect(bell);
  beat.start(t);
  beat.stop(t + 1.8);
}

// ── 소리 내어 읽기(音聲) ───────────────────────────────────────
//
// 삼귀의는 원래 **소리 내어** 하는 것이다. 글로만 떠 있으면 눈으로 읽고 만다.
//
// 지금은 브라우저가 가진 목소리(Web Speech)를 쓴다. 안드로이드·아이폰의
// 기본 한국어 목소리라 길 안내 톤이고, 스님 목소리가 아니다 —
// **음원(mp3)이 들어오면 이 함수만 갈아 끼우면 된다.** 부르는 쪽은 그대로 둔다.
//   public/voice/sambae-1.mp3 … 를 놓고 여기서 new Audio(...).play() 로 바꾼다.
//
// 브라우저가 못 읽으면 조용히 지나간다 — 절은 소리가 없어도 절이다.

let voiceOn = true;

export function setVoice(on: boolean) {
  voiceOn = on;
  if (!on) hushVoice();
}

export function voiceReady(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** 읽던 것을 멈춘다 — 다음 절이 앞말을 밟지 않게 */
export function hushVoice() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* 없으면 없는 대로 */
  }
}

/** 한 줄을 읽는다. 느리게, 낮게 — 예불의 결에 맞춘다. */
export function speak(text: string) {
  if (!voiceOn || !voiceReady() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.82; // 또박또박
    u.pitch = 0.9; // 조금 낮게
    u.volume = 1;
    // 한국어 목소리가 여럿이면 기본을 쓴다 — 고르기 시작하면 기기마다 달라진다
    const ko = synth.getVoices().find((v) => v.lang?.startsWith("ko"));
    if (ko) u.voice = ko;
    synth.speak(u);
  } catch {
    /* 못 읽어도 절은 이미 했다 */
  }
}
