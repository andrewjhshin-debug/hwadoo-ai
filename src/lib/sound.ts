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
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 절 마당의 울림 — 목탁 소리 뒤에 남는 꼬리.
// 노이즈로 임펄스를 빚어 컨볼버에 물린다(음원 파일 없이 만드는 잔향).
let hallIR: AudioBuffer | null = null;
let hallNode: ConvolverNode | null = null;
let hallGain: GainNode | null = null;
function hall(ac: AudioContext): GainNode {
  if (!hallNode || !hallGain) {
    const secs = 1.9;
    const n = Math.floor(ac.sampleRate * secs);
    hallIR = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = hallIR.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const decay = Math.pow(1 - i / n, 2.6);
        d[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    hallNode = ac.createConvolver();
    hallNode.buffer = hallIR;
    // 잔향은 어둡게 — 나무 울림이지 유리가 아니다
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2100;
    hallGain = ac.createGain();
    hallGain.gain.value = 1;
    hallGain.connect(lp);
    lp.connect(hallNode);
    const wet = ac.createGain();
    wet.gain.value = 0.9;
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
    bus.threshold.value = -14;
    bus.knee.value = 22;
    bus.ratio.value = 7;
    bus.attack.value = 0.003;
    bus.release.value = 0.22;
    bus.connect(ac.destination);
  }
  return bus;
}

// 목탁 한 방 —
//   딱(치는 순간) + 몸통(피치 내려가는 톡) + 속울림 두 겹 + 마당 잔향.
//   작은 나무토막이 아니라 법당에서 울리는 소리라야 한다.
export function strikeMoktak(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  const out = ac.createGain();
  out.gain.value = vol * 1.75; // 크게 — 울리도록
  out.connect(master(ac));

  // 잔향으로 보내는 몫
  const send = ac.createGain();
  send.gain.value = vol * 0.5;
  out.connect(send);
  send.connect(hall(ac));

  const base = 520 + Math.random() * 46; // 매 방 미세하게 다른 나무

  // ── 몸통 — 치는 순간 높다가 뚝 떨어지는 '톡'
  const o1 = ac.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(base * 1.28, t);
  o1.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.13);
  const g1 = ac.createGain();
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o1.connect(g1);
  g1.connect(out);
  o1.start(t);
  o1.stop(t + 0.6);

  // ── 속울림 두 겹 — 나무는 배음이 어긋난다. 길게 남는 건 이쪽.
  ([
    [base * 0.44, 0.34, 1.5],
    [base * 0.67, 0.2, 1.05],
  ] as const).forEach(([hz, amp, dur], i) => {
    const o = ac.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.setValueAtTime(hz * (0.995 + Math.random() * 0.01), t);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  });

  // ── 딱 — 채가 닿는 순간
  const o2 = ac.createOscillator();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(1420 + Math.random() * 240, t);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.34, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
  o2.connect(g2);
  g2.connect(out);
  o2.start(t);
  o2.stop(t + 0.06);

  // ── 결 — 나무 표면
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 950;
  bp.Q.value = 1.1;
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.26, t);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
  src.connect(bp);
  bp.connect(g3);
  g3.connect(out);
  src.start(t);
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

// 죽비(竹篦) — 대나무를 쳐서 내는 마른 딱 소리. 절의 박자를 이끈다.
export function strikeJukbi(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(ac.destination);

  // 마른 파열음 — 높은 대역 노이즈를 아주 짧게
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2300 + Math.random() * 400;
  bp.Q.value = 0.8;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
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
  g2.gain.exponentialRampToValueAtTime(0.34, t + 0.003);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.12);
}
