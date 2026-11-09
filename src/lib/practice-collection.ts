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
) {
  const t = degrees * Math.PI / 180;
  // 타원 접선에 용의 양 끝을 맞춘다. 앞쪽에서는 얼굴이 오른쪽을 향한다.
  const dx = -radiusX * (Math.cos(t) + (perspective ? 1 / perspective : 0));
  const dy = -radiusY * Math.sin(t);
  const tangent = Math.atan2(dy, dx);
  const raw = tangent * 180 / Math.PI;
  // atan2의 ±180° 경계를 넘을 때도 반대 방향으로 감기지 않는다.
  const rotation = raw + 360 * Math.round((degrees - 180 - raw) / 360);
  const footprint = Math.abs(Math.cos(tangent)) + (244 / 448) * Math.abs(Math.sin(tangent));
  const width = Math.min(beadWidth * 1.9, 2 * Math.min(x, 100 - x) / footprint);
  return { width: `${width}%`, transform: `translate(-50%, -50%) rotate(${rotation}deg)` };
}
