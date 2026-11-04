const root = '/obj/practice-collection-v1';
export const NEW_MALA_SKINS = [
  { id: 'ebony', name: '흑단', dot: '#30231f' },
  { id: 'carved', name: '목각', dot: '#c78a52' },
  { id: 'blackgold', name: '흑금', dot: '#312c23' },
  { id: 'lotuswood', name: '연화목', dot: '#b66c31' },
].map(s => ({ ...s, src: `${root}/${s.id}.webp`, one: `${root}/${s.id}.webp`, lit: `${root}/${s.id}.webp`, wide: true as const }));
export const isNewMala = (id: string) => NEW_MALA_SKINS.some(s => s.id === id);
export function malaBeadImage(id: string, index: number, fallback: string) {
  if (id === 'ebony' && index === 0) return `${root}/ebony-master.webp`;
  if (id === 'lotuswood' && index % 2 === 1) return `${root}/wood-spacer.webp`;
  return fallback;
}
