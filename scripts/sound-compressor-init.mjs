// 압축기가 **갓 만들어진 직후**에만 소리를 누르는지 본다.
// 목탁(vol 0.8)을 압축기 생성 뒤 0 / 0.05 / 0.1 / 0.2 / 0.3 / 0.5 / 1.0 초에 한 번 치고
// 피크를 잰다. 염주(0.55)도 0 초와 0.5 초에서 비교한다. 48000 Hz.
//   node scripts/sound-compressor-init.mjs
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await (await b.newContext()).newPage();
await p.goto("about:blank");
const wav = [...readFileSync("public/sfx/moktak.wav")];
const out = await p.evaluate(async (wav) => {
  const sr = 48000;
  const db = (x) => +(20 * Math.log10(x)).toFixed(1);
  const master = (ac, comp) => {
    const mg = ac.createGain();
    mg.connect(ac.destination);
    if (!comp) return mg;
    const bus = ac.createDynamicsCompressor();
    bus.threshold.value = -12;
    bus.knee.value = 20;
    bus.ratio.value = 6;
    bus.attack.value = 0.002;
    bus.release.value = 0.18;
    bus.connect(mg);
    return bus;
  };
  const peakFrom = (buf, t) => {
    const d = buf.getChannelData(0);
    let pk = 0;
    for (let i = Math.floor(t * sr); i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    return pk;
  };
  const res = { moktak: {}, bead: {} };
  for (const t of [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0]) {
    const ac = new OfflineAudioContext(1, sr * 2.5, sr);
    const m = master(ac, true);
    const buf0 = await ac.decodeAudioData(Uint8Array.from(wav).buffer);
    const src = ac.createBufferSource();
    src.buffer = buf0;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;
    hp.Q.value = 0.7;
    const g = ac.createGain();
    g.gain.value = 0.8;
    src.connect(hp);
    hp.connect(g);
    g.connect(m);
    src.start(t);
    const buf = await ac.startRendering();
    res.moktak["start@" + t + "s"] = db(peakFrom(buf, t));
  }
  for (const t of [0, 0.5])
    for (const comp of [true, false]) {
      const ac = new OfflineAudioContext(1, sr * 1.5, sr);
      const m = master(ac, comp);
      const vol = 0.55;
      const o0 = ac.createGain();
      o0.gain.value = vol * 1.15;
      o0.connect(m);
      const nb = ac.createBuffer(1, sr * 0.5, sr);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(1800 * 0.78, t + 0.035);
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
      res.bead["start@" + t + "s comp=" + (comp ? "on" : "off")] = db(peakFrom(buf, t));
    }
  return res;
}, wav);
console.log("피크 dBFS:");
console.log(JSON.stringify(out, null, 1));
await b.close();
