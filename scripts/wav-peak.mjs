// WAV 파일의 샘플 피크·RMS 를 잰다. node scripts/wav-peak.mjs public/sfx/*.wav
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f);
  if (b.toString("ascii", 0, 4) !== "RIFF") { console.log(f, "not RIFF"); continue; }
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4); const sz = b.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { tag: b.readUInt16LE(p+8), ch: b.readUInt16LE(p+10), sr: b.readUInt32LE(p+12), bits: b.readUInt16LE(p+22) };
    if (id === "data") { data = { off: p + 8, len: Math.min(sz, b.length - p - 8) }; }
    p += 8 + sz + (sz & 1);
  }
  if (!fmt || !data) { console.log(f, "no fmt/data"); continue; }
  const bytes = fmt.bits / 8; const n = Math.floor(data.len / bytes);
  let peak = 0, sq = 0, peakIdx = 0;
  const win = Math.floor(fmt.sr * fmt.ch * 0.05); // 50ms 창의 최대 RMS
  let winSq = 0, winMax = 0; const ring = new Float64Array(win); let ri = 0;
  for (let i = 0; i < n; i++) {
    let v;
    const o = data.off + i * bytes;
    if (fmt.tag === 3 && fmt.bits === 32) v = b.readFloatLE(o);
    else if (fmt.bits === 16) v = b.readInt16LE(o) / 32768;
    else if (fmt.bits === 24) v = ((b[o] | (b[o+1] << 8) | (b[o+2] << 16)) << 8 >> 8) / 8388608;
    else if (fmt.bits === 32) v = b.readInt32LE(o) / 2147483648;
    else if (fmt.bits === 8) v = (b[o] - 128) / 128;
    const a = Math.abs(v);
    if (a > peak) { peak = a; peakIdx = i; }
    sq += v * v;
    winSq += v * v - ring[ri]; ring[ri] = v * v; ri = (ri + 1) % win;
    if (i >= win) winMax = Math.max(winMax, winSq / win);
  }
  const dur = n / fmt.ch / fmt.sr;
  console.log(JSON.stringify({ file: f, fmt, durSec: +dur.toFixed(3), peak: +peak.toFixed(4), peakDbFS: +(20*Math.log10(peak)).toFixed(1), peakAtSec: +(peakIdx/fmt.ch/fmt.sr).toFixed(3), rms: +Math.sqrt(sq/n).toFixed(4), rmsDbFS: +(20*Math.log10(Math.sqrt(sq/n))).toFixed(1), max50msRms: +Math.sqrt(winMax).toFixed(4), max50msRmsDbFS: +(20*Math.log10(Math.sqrt(winMax))).toFixed(1) }));
}
