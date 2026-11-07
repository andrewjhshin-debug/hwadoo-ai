const root = '/obj/practice-collection-v1';
export const NEW_MALA_SKINS = [
  { id: 'ebony', name: '흑단', dot: '#30231f' },
  { id: 'carved', name: '목각', dot: '#c78a52' },
  { id: 'blackgold', name: '흑금', dot: '#312c23' },
  { id: 'lotuswood', name: '연화목', dot: '#b66c31' },
  { id: 'flowerwood', name: '꽃목', dot: '#e3bd86' },
].map(s => {
  const folder = ['blackgold', 'whitejade', 'flowerwood', 'silverom'].includes(s.id) ? '/obj/practice-collection-v2' : root;
  const image = s.id === 'ebony' ? '/obj/practice-collection-v2/ebony-smooth.webp' : `${folder}/${s.id}.webp`;
  return { ...s, src: image, one: image, lit: image, wide: true as const };
});
export const isNewMala = (id: string) => NEW_MALA_SKINS.some(s => s.id === id);
export function malaBeadImage(id: string, index: number, fallback: string) {
  if (id === 'ebony' && index === 0) return `${root}/ebony-master.webp`;
  if (id === 'whitejade' && index >= 14 && index <= 16) return '/obj/practice-collection-v2/olivejade.webp';
  if (id === 'flowerwood' && index === 15) return '/obj/practice-collection-v2/flower-master.webp';
  if (id === 'flowerwood' && index === 12) return '/obj/practice-collection-v2/celadon.webp';
  return fallback;
}
export function malaCharmImage(id: string, index: number) {
  if (id === 'whitejade' && index === 13) return '/obj/practice-collection-v2/green-charm.webp';
  if (id === 'flowerwood' && index === 12) return '/obj/practice-collection-v2/white-charm.webp';
  return null;
}
export function malaGoldFilter(id: string) {
  if (['ebony', 'blackgold', 'silverom'].includes(id)) return 'hip-ebony-gold';
  if (['whitejade', 'flowerwood'].includes(id)) return 'hip-jade-gold';
  return 'hip-wood-gold';
}
