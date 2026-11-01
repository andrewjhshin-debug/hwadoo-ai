const stoneNames = ["연꽃", "코끼리", "초", "연등", "보리잎", "좌불", "합장", "범종", "법륜"] as const;
const zodiacNames = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;
export const STONE_MALA_SYMBOLS = stoneNames.map((name, i) => ({ name, src: `/obj/mala-stone-v5/${i}.webp` }));
export const ZODIAC_MALA_SYMBOLS = zodiacNames.map((name, i) => ({ name, src: `/obj/mala-zodiac-v4/${i}.webp` }));

/** Shared artwork keeps every engraved groove registered as gold fills. */
export default function StoneMalaBead({ fill, index, baseFilter, goldFilter, zodiac = false }: {
  base?: string; gold?: string; fill: number; index: number; baseFilter?: string; goldFilter?: string; zodiac?: boolean;
}) {
  const amount = Math.max(0, Math.min(1, fill));
  const motifs = zodiac ? ZODIAC_MALA_SYMBOLS : STONE_MALA_SYMBOLS;
  const symbol = motifs[((index % motifs.length) + motifs.length) % motifs.length];
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={symbol.src} width={920} height={920} alt="" draggable={false} decoding="async" className="block w-full" style={{ filter: baseFilter }} />
    {/* The same pixels prevent engraving jumps during partial gold fill. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={symbol.src} width={920} height={920} alt="" aria-hidden draggable={false} decoding="async" className="absolute inset-0 block w-full" style={{ filter: `grayscale(1) sepia(1) saturate(2.5) brightness(1.12) ${goldFilter ?? ""}`, opacity: amount, transition: "opacity .16s ease-out" }} />
  </>;
}
