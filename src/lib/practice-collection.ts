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
  { id: 'seedwood', name: '연꽃나무', dot: '#9f6339', image: `${seed}/honey.webp` },
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

// 옥알이 금룡 뒤를 지나갈 때만 실루엣 속으로 사라진다.
export function jadeDragonBeadOpacity(degrees: number) {
  const distanceFromDragon = Math.abs(((degrees % 360) + 360) % 360 - 180);
  return Math.max(0, Math.min(1, (distanceFromDragon - 7) / 10));
}
