const root = '/obj/practice-collection-v1';
const solid = '/obj/practice-collection-v2';
const round = '/obj/round-mala-v1';
const seed = '/obj/seedwood-mala-v2';
const seedTones = ['honey', 'chestnut', 'amber'];
export const JADE_DRAGON = {
  id: 'jade-dragon',
  count: 21,
  bead: '/obj/jade-dragon-mala-v1/jade-plain.webp',
  master: '/obj/jade-dragon-mala-v1/gold-dragon.webp',
};
export const NEW_MALA_SKINS = [
  { id: 'ebony', name: '흑단', dot: '#30231f' },
  { id: 'blackgold', name: '흑금', dot: '#312c23' },
  { id: 'lotuswood', name: '연화목', dot: '#b66c31', image: `${solid}/lotuswood-solid.webp` },
  // 연꽃나무(seedwood) 걷음 — 형: 「청룡 왼쪽 아티초크 같은 거 지우라고」
  { id: JADE_DRAGON.id, name: '청옥 금룡', dot: '#2c8b82', image: JADE_DRAGON.bead },
].map(s => {
  const folder = s.id === 'blackgold' ? '/obj/practice-collection-v2' : root;
  const image = s.image ?? (s.id === 'ebony' ? '/obj/practice-collection-v2/ebony-smooth.webp' : `${folder}/${s.id}.webp`);
  return { id: s.id, name: s.name, dot: s.dot, src: image, one: image, lit: image, wide: true as const };
});
export const isNewMala = (id: string) => NEW_MALA_SKINS.some(s => s.id === id);
export function malaBeadImage(id: string, index: number, fallback: string) {
  if (id === 'seedwood') {
    const tone = index % 2 === 0 ? seedTones[Math.floor(index / 2) % seedTones.length] : 'spacer';
    return `${seed}/${tone}.webp`;
  }
  if (id === 'ebony' && index === 0) return `${solid}/ebony-master-solid.webp`;
  if (id === 'whitejade' && index >= 14 && index <= 16) return `${round}/taupe.webp`;
  if (id === 'flowerwood' && index === 15) return `${round}/flower.webp`;
  if (id === 'flowerwood' && index === 12) return `${round}/celadon.webp`;
  if (id === 'flowerwood' && index >= 9 && index <= 11) return `${round}/darkwood.webp`;
  return fallback;
}
export function malaCharmImage(id: string, index: number) {
  if (id === 'whitejade' && index === 13) return `${round}/green-charm.webp`;
  if (id === 'flowerwood' && index === 12) return `${round}/white-charm.webp`;
  return null;
}
export function malaBeadScale(id: string, index: number) {
  if (id === 'seedwood') return index % 2 === 0 ? 1.32 : 0.64;
  if (id === 'ebony' && index === 0) return 1.2;
  if (id === 'flowerwood' && index === 15) return 1.48;
  return 1;
}
export function malaGoldFilter(id: string) {
  if (['ebony', 'blackgold', 'silverom'].includes(id)) return 'hip-ebony-gold';
  if (['whitejade', 'flowerwood', JADE_DRAGON.id].includes(id)) return 'hip-jade-gold';
  return 'hip-wood-gold';
}

export function jadeDragonBeadPose(
  degrees: number,
  x: number,
  beadWidth: number,
  radiusX: number,
  radiusY: number,
  perspective = 0,
  span = 0,
) {
  // 형: 「돌릴 때 존나 밤티. 용대가리 쪽 자연스럽게」.
  // 전에는 금룡을 타원 접선대로 **돌렸다** — 뒤(위)로 가면 180° 돌아 용이 거꾸로 매달렸고,
  // 옆에선 세로로 섰고, 가장자리에선 폭을 깎아 갑자기 쪼그라들었다.
  // 진짜 팔찌를 돌리면 용은 거꾸로 서지 않는다 — 옆으로 가며 **짧아지고(원근)**,
  // 뒤로 넘어가면 **반대쪽 얼굴**이 보인다. 그래서 동전처럼 가로로 접는다:
  //   가로 = cos(자리) — 앞 1 → 옆 0.74 → 뒤 −1(좌우 뒤집힘). 얇은 순간에 뒤집혀 튀지 않는다.
  //   기울기는 접선을 따르되 ±72° 안에서만 — 거꾸로 서는 일은 없다.
  //   span(양옆 옥알 사이 빈 길이)을 주면 짧아진 용이 그 틈을 다 메울 만큼은 남긴다 — 옆에서 고리가 끊겨 보이지 않게.
  const t = degrees * Math.PI / 180;
  const c = -Math.cos(t); // 앞(아래) 1 · 뒤(위) −1
  const dx = radiusX * (Math.abs(Math.cos(t)) + (perspective ? 1 / perspective : 0));
  const dy = -radiusY * Math.sin(t) * Math.sign(c || 1);
  const raw = Math.atan2(dy, dx) * 180 / Math.PI;
  const tilt = Math.max(-72, Math.min(72, raw));
  // 가장자리에서 판 밖으로 나갈까 폭을 깎던 것이 옆에서 용을 쪼그라뜨렸다 — 깎는 건 보이는 폭(접힌 뒤)으로만
  const width = beadWidth * 1.9;
  const need = span > 0 ? span / Math.max(0.5, Math.cos((raw - tilt) * Math.PI / 180)) / width : 0;
  const fold = (c < 0 ? -1 : 1) * Math.min(1, Math.max(0.74 + 0.26 * Math.abs(c), need));
  void x;
  return { width: `${width}%`, transform: `translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg) scaleX(${fold.toFixed(3)})` };
}
