// 오디오 그래프를 수치로 잰다 — OfflineAudioContext 로 44100/48000 둘 다.
//   node scripts/sound-graph-measure.mjs
// sound.ts 의 master()/hall()/strikeMoktak()/strikeJukbi()/strikeBell()/clickBead() 사슬을
// 그대로 옮겨 놓고 ac.destination 에 떨어지는 샘플 피크·RMS 를 읽는다.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await (await b.newContext()).newPage();
await p.goto("about:blank");
const wavs = {
  moktak: [...readFileSync("public/sfx/moktak.wav")],
  moktak2: [...readFileSync("public/sfx/moktak2.wav")],
  jukbi: [...readFileSync("public/sfx/jukbi.wav")],
};
const out = await p.evaluate(async (wavs) => {
  const toAB = (arr) => Uint8Array.from(arr).buffer;
  const db = (x) => (x > 0 ? +(20 * Math.log10(x)).toFixed(1) : -999);
  const stats = (buf) => {
    let peak = 0;
    const n = buf.length;
    let nan = false;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        if (!Number.isFinite(d[i])) nan = true;
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
      }
    }
    let sq1 = 0;
    const w = Math.floor(buf.sampleRate * 0.1);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < w; i++) sq1 += d[i] * d[i];
    }
    const rms = Math.sqrt(sq1 / (w * buf.numberOfChannels));
    return { peak: +peak.toFixed(4), peakDb: db(peak), rms100ms: +rms.toFixed(4), rms100msDb: db(rms), nan };
  };
  const makeMaster = (ac, withComp) => {
    const mg = ac.createGain();
    mg.gain.value = 1;
    mg.connect(ac.destination);
    if (!withComp) return mg;
    const bus = ac.createDynamicsCompressor();
    bus.threshold.value = -12;
    bus.knee.value = 20;
    bus.ratio.value = 6;
    bus.attack.value = 0.002;
    bus.release.value = 0.18;
    bus.connect(mg);
    return bus;
  };
  const makeHall = (ac, master) => {
    const secs = 1.4;
    const n = Math.floor(ac.sampleRate * secs);
    const ir = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    const conv = ac.createConvolver();
    conv.buffer = ir;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    const hg = ac.createGain();
    hg.gain.value = 1;
    hg.connect(lp);
    lp.connect(conv);
    const wet = ac.createGain();
    wet.gain.value = 0.85;
    conv.connect(wet);
    wet.connect(master);
    return hg;
  };
  const results = {};
  for (const sr of [44100, 48000]) {
    const R = (results[sr] = {});
    // 압축기 전달 특성 — 440Hz 사인, 1.5초, 뒤 0.5초 정상상태 피크
    R.compressor = {};
    for (const amp of [0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0]) {
      const ac = new OfflineAudioContext(1, sr * 1.5, sr);
      const m = makeMaster(ac, true);
      const o = ac.createOscillator();
      o.frequency.value = 440;
      const g = ac.createGain();
      g.gain.value = amp;
      o.connect(g);
      g.connect(m);
      o.start(0);
      const buf = await ac.startRendering();
      const d = buf.getChannelData(0);
      let pk = 0;
      for (let i = sr; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
      R.compressor[amp] = { outPeak: +pk.toFixed(4), gainDb: +(20 * Math.log10(pk / amp)).toFixed(1) };
    }
    // 잔향 IR — 단위 임펄스 → hall → master(압축기 없이)
    {
      const ac = new OfflineAudioContext(2, sr * 2, sr);
      const m = makeMaster(ac, false);
      const h = makeHall(ac, m);
      const imp = ac.createBuffer(1, 1, sr);
      imp.getChannelData(0)[0] = 1;
      const s = ac.createBufferSource();
      s.buffer = imp;
      s.connect(h);
      s.start(0);
      const buf = await ac.startRendering();
      let e = 0;
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (const v of d) e += v * v;
      }
      R.hallImpulse = { ...stats(buf), energy: +e.toFixed(5), irLen: Math.floor(sr * 1.4) };
    }
    const strikes = {};
    const decode = async (ac, name) => await ac.decodeAudioData(toAB(wavs[name]));
    for (const [name, vol] of [
      ["moktak", 0.5],
      ["moktak", 0.8],
      ["moktak2", 0.8],
      ["jukbi", 0.8],
    ]) {
      for (const comp of [true, false])
        for (const withHall of [true, false]) {
          const ac = new OfflineAudioContext(2, sr * 2.5, sr);
          const m = makeMaster(ac, comp);
          const buf0 = await decode(ac, name);
          const src = ac.createBufferSource();
          src.buffer = buf0;
          src.playbackRate.value = 1;
          const outG = ac.createGain();
          outG.gain.value = vol;
          if (name === "jukbi") {
            const rg = ac.createGain();
            rg.gain.value = 0.95;
            src.connect(rg);
            rg.connect(outG);
          } else {
            const hp = ac.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 70;
            hp.Q.value = 0.7;
            src.connect(hp);
            hp.connect(outG);
          }
          outG.connect(m);
          if (withHall && name !== "jukbi") {
            const send = ac.createGain();
            send.gain.value = vol * 0.28;
            outG.connect(send);
            send.connect(makeHall(ac, m));
          }
          src.start(0);
          const buf = await ac.startRendering();
          const key = name + " vol=" + vol + " comp=" + (comp ? "on" : "off") + " hall=" + (withHall ? "on" : "off") + " decodedSr=" + buf0.sampleRate + " dur=" + buf0.duration.toFixed(3);
          strikes[key] = stats(buf);
        }
    }
    // 경쇠 vol=0.62 (sambae)
    for (const comp of [true, false]) {
      const ac = new OfflineAudioContext(2, sr * 1.5, sr);
      const m = makeMaster(ac, comp);
      const t = 0;
      const vol = 0.62;
      const o0 = ac.createGain();
      o0.gain.value = vol * 0.58;
      o0.connect(m);
      const send = ac.createGain();
      send.gain.value = vol * 0.4;
      o0.connect(send);
      send.connect(makeHall(ac, m));
      const f0 = 404;
      const life = 4.4;
      const parts = [
        [1, 1, 1, 0.7],
        [2, 0.6, 0.8, 1.1],
        [2.42, 0.42, 0.62, 1.7],
        [3.36, 0.3, 0.48, 2.3],
        [4.55, 0.2, 0.36, 3.1],
        [5.9, 0.12, 0.26, 4.2],
        [8.2, 0.06, 0.16, 5.5],
      ];
      for (const [ratio, amp, tail, beat] of parts)
        for (const d of [-beat / 2, beat / 2]) {
          const o = ac.createOscillator();
          o.frequency.value = f0 * ratio + d;
          const g = ac.createGain();
          const peak = amp * 0.26;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + life * tail);
          o.connect(g);
          g.connect(o0);
          o.start(t);
          o.stop(t + life * tail + 0.1);
        }
      const buf = await ac.startRendering();
      strikes["bell(0.62,0) comp=" + (comp ? "on" : "off")] = stats(buf);
    }
    // 염주 vol=0.55 (draw)
    for (const comp of [true, false]) {
      const ac = new OfflineAudioContext(2, sr * 0.5, sr);
      const m = makeMaster(ac, comp);
      const t = 0;
      const vol = 0.55;
      const o0 = ac.createGain();
      o0.gain.value = vol * 1.15;
      o0.connect(m);
      const nb = ac.createBuffer(1, sr * 0.5, sr);
      {
        const d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ac.createBufferSource();
      src.buffer = nb;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2400;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.8, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      src.connect(hp);
      hp.connect(g);
      g.connect(o0);
      src.start(t);
      const o = ac.createOscillator();
      const f = 1800;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.035);
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g2);
      g2.connect(o0);
      o.start(t);
      o.stop(t + 0.08);
      const o3 = ac.createOscillator();
      o3.frequency.setValueAtTime(440, t);
      const g3 = ac.createGain();
      g3.gain.setValueAtTime(0.0001, t);
      g3.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
      g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o3.connect(g3);
      g3.connect(o0);
      o3.start(t);
      o3.stop(t + 0.08);
      const buf = await ac.startRendering();
      strikes["bead(0.55) comp=" + (comp ? "on" : "off")] = stats(buf);
    }
    R.strikes = strikes;
  }
  return results;
}, wavs);
console.log(JSON.stringify(out, null, 1));
await b.close();
