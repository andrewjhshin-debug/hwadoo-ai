// 압축기가 시간에 따라 어떻게 구는지 — 목탁 음원을 1.5초 간격으로 네 번,
// 그 다음 0.18초 간격(빠른 연타)으로 여섯 번 치고, 각 타의 피크를 압축기
// 있을 때/없을 때로 비교한다. 48000 Hz (폰).
//   node scripts/sound-compressor-time.mjs
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
  const res = {};
  for (const sr of [48000]) {
    for (const comp of [true, false]) {
      const times = [0.5, 2.0, 3.5, 5.0, 6.5, 6.68, 6.86, 7.04, 7.22, 7.4];
      const ac = new OfflineAudioContext(2, sr * 9, sr);
      const mg = ac.createGain();
      mg.connect(ac.destination);
      let m = mg;
      if (comp) {
        const bus = ac.createDynamicsCompressor();
        bus.threshold.value = -12;
        bus.knee.value = 20;
        bus.ratio.value = 6;
        bus.attack.value = 0.002;
        bus.release.value = 0.18;
        bus.connect(mg);
        m = bus;
      }
      const buf0 = await ac.decodeAudioData(Uint8Array.from(wav).buffer);
      for (const t of times) {
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
      }
      const buf = await ac.startRendering();
      const d = buf.getChannelData(0);
      const peaks = times.map((t) => {
        let pk = 0;
        const a = Math.floor(t * sr), z = Math.min(d.length, a + Math.floor(0.15 * sr));
        for (let i = a; i < z; i++) pk = Math.max(pk, Math.abs(d[i]));
        return +(20 * Math.log10(pk)).toFixed(1);
      });
      res[(comp ? "comp " : "nocomp ") + sr] = peaks;
    }
  }
  return res;
}, wav);
console.log("타별 피크 dBFS (앞 넷은 1.5초 간격, 뒤 여섯은 0.18초 연타):");
console.log(JSON.stringify(out, null, 1));
await b.close();
