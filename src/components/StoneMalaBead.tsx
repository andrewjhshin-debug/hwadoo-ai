import type { CSSProperties } from "react";

export const STONE_MALA_SYMBOLS = [
  { name: "연꽃", path: "M12 19C5 19 2.5 15 2 10c5 0 8 3 10 9Zm0 0c7 0 9.5-4 10-9-5 0-8 3-10 9Zm0-1C6 14 7 7 12 3c5 4 6 11 0 15ZM5 21q7 2 14 0" },
  { name: "법륜", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 1v22M1 12h22M4.2 4.2l15.6 15.6M4.2 19.8 19.8 4.2M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" },
  { name: "보리잎", path: "M12 2C9 6 3 7 3 13c0 5 4 8 9 8s9-3 9-8c0-6-6-7-9-11ZM12 6v17M7 10l5 4 5-4M6 15l6 4 6-4" },
  { name: "탑", path: "M12 1v4M9 5h6l2 4H7l2-4ZM6 11h12l2 4H4l2-4ZM3 17h18l1 5H2l1-5ZM8 9v2m8-2v2M7 15v2m10-2v2" },
  { name: "매듭", path: "m12 2 5 5-5 5-5-5 5-5Zm-5 5-5 5 5 5 5-5-5-5Zm10 0 5 5-5 5-5-5 5-5ZM7 17l5 5 5-5-5-5-5 5Z" },
  { name: "향로", path: "M8 2q-3 2 0 4m4-5q-3 3 0 5m4-4q-3 2 0 4M5 9h14v3H5V9ZM4 14h16v3c0 3-4 5-8 5s-8-2-8-5v-3ZM4 15H2v3h3m15-3h2v3h-3M8 21l-1 2m9-2 1 2" },
  { name: "보리수", path: "M10 22v-8m4 8v-8M6 22h12M12 3C7-1 4 5 7 8c-6-1-7 6-2 8 3 2 6-1 7-3 1 2 4 5 7 3 5-2 4-9-2-8 3-3 0-9-5-5ZM12 6v7m-5-2 5 2 5-2" },
  { name: "코끼리", path: "M8 7C8 1 16 1 16 7v8M8 7v9M8 7C0 1-1 17 6 17l2-3m8-7c8-6 9 10 2 10l-2-3M8 15l2 2v3c0 4 6 3 5-1M8 6q4-3 8 0M10 9v1m4-1v1M6 15l1 4 2-2m9-2-1 4-2-2" },
  { name: "금강저", path: "M10 9h4v6h-4V9ZM9 9h6m-6 6h6M12 9V1m0 22v-8M10 8C4 6 6 2 8 2q-1 3 4 6 5-3 4-6c2 0 4 4-2 6M10 16c-6 2-4 6-2 6q-1-3 4-6 5 3 4 6c2 0 4-4-2-6" },
  { name: "목어", path: "M4 9C0 13 3 21 12 21c7 0 11-4 10-9-1-5-9-7-13-4L5 3 2 4l2 5ZM5 12q7 6 14 0M8 13q4-7 9-3M17 8v1M11 18l6-2M8 4l7-2" },
  { name: "범종", path: "M10 5V3q2-3 4 0v2M6 12c0-9 12-9 12 0v6l3 3H3l3-3v-6ZM4 18h16M10 21v2h4v-2M9 9h6m-6 4h6" },
  { name: "소라", path: "M18 4C9-2 1 6 4 14c1 4 5 6 9 5l7 3 2-4-4-8c2-1 2-4 0-6ZM17 7C12 3 5 7 8 12c2 3 7 1 5-2q-2-2-3 0M4 14l6-1m3 6 5-9m-2 8 4 1" },
  { name: "보개", path: "M12 2v2M2 11c2-10 18-10 20 0H2ZM12 4v16q0 3 3 1M3 11v4m6-4v4m6-4v4m6-4v4M3 16v1m6-1v1m6-1v1m6-1v1" },
  { name: "승리의 깃발", path: "M7 23V2m-2 0h4M7 4h12l-2 4 2 4H7m0 3h12l-2 4 2 3H7M10 5v6m4-6v6M10 16v5m4-5v5" },
  { name: "보병", path: "M8 3h8v3H8V3ZM10 6v3C0 12 5 22 12 22s12-10 2-13V6M7 13q5 3 10 0M8 21h8M12 3V1m-4 9 4 3 4-3" },
  { name: "쌍어", path: "M8 4C0 7 1 16 8 19c5-4 5-11 0-15Zm8 0c8 3 7 12 0 15-5-4-5-11 0-15ZM8 19l-3 3h6l-3-3Zm8 0-3 3h6l-3-3ZM6 8v1m12-1v1M4 13l4-2m12 2-4-2" },
  { name: "발우", path: "M2 9h20v3c0 7-20 7-20 0V9ZM3 9q9-5 18 0M8 17v4h8v-4M9 6V3m6 3V3M6 12q6 3 12 0" },
  { name: "석장", path: "M12 9v14M12 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 7C2 3 2 13 7 12m9-5c6-4 6 6 1 5M7 8v5m10-5v5M10 17h4m-4 3h4" },
  { name: "지혜의 검", path: "M12 2 8 7l2 8h4l2-8-4-5ZM12 5v10M6 16q6 3 12 0M11 18v3m2-3v3M10 22h4M5 8q-3-3 0-6m14 6q3-3 0-6" },
  { name: "여의주", path: "M12 2C9 7 3 8 3 15a9 7 0 0 0 18 0c0-5-3-7-5-9q1 5-2 6 1-6-2-10ZM12 12c-6 3-5 8 0 8s6-5 0-8Z" },
  { name: "불족적", path: "M8 9c-4 3-3 7-1 9l1 4h7l1-4c2-5 1-9-3-10M14 4a2 3 0 1 0 4 0 2 3 0 1 0-4 0ZM9 3a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0ZM5 5a1.2 1.6 0 1 0 2.4 0 1.2 1.6 0 1 0-2.4 0ZM3 8h1M11 12v6m-3-3h6m-5-2 4 4m-4 0 4-4" },
  { name: "좌불", path: "M10 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM11 1h2M8 10q4-5 8 0l1 5 4 3q3 4-3 4H6q-6 0-3-4l4-3 1-5ZM9 12v5h6v-5M6 20l6-3 6 3M10 15h4" },
  { name: "염주", path: "M10 2a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM4 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM1 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM3 16a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM16 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM19 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM17 16a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM10 19h4v3h-4v-3ZM12 22v2" },
  { name: "경전", path: "M3 3h16v17H5c-4 0-4-5 0-5h14M5 3v12m14-9h2v16H5M8 6h8M8 9h8M8 12h5" },
  { name: "합장", path: "M11 17V3c0-3-3-2-3 1L6 9l-2 5 4 5m5-2V3c0-3 3-2 3 1l2 5 2 5-4 5M11 7 8 12m5-5 3 5M3 17l5 2 3 3-3 2-6-4 1-3Zm18 0-5 2-3 3 3 2 6-4-1-3Z" },
  { name: "공양등", path: "M12 2C5 9 10 13 12 11c4-1 4-5 0-9ZM3 14h18c-1 5-17 5-18 0ZM12 18v3M7 22h10M9 12h6" },
  { name: "사찰", path: "M12 2v3M4 9q8-8 16 0l3 1H1l3-1ZM5 10v10m14-10v10M3 14h18M9 20v-6h6v6M2 21h20M7 6l-2-2m12 2 2-2" },
] as const;

export const ZODIAC_MALA_SYMBOLS = [
  { name: "쥐", path: "M7 7C0 6 2 0 7 2q4 1 3 5m7 0c7-1 5-7 0-5q-4 1-3 5M5 12c0-9 14-9 14 0v3c0 8-14 8-14 0v-3ZM8 13v1m8-1v1m-5 3h2m-1 0v2m-4 1q4 2 8 0" },
  { name: "소", path: "M7 7Q1 7 2 1q2 4 6 3m9 3q6 0 5-6-2 4-6 3M5 12c0-9 14-9 14 0v5c0 6-14 6-14 0v-5ZM8 12v1m8-1v1M8 16q4-3 8 0v4H8v-4Zm2 1v1m4-1v1" },
  { name: "호랑이", path: "M5 8Q0 3 5 2l4 4m10 2q5-5 0-6l-4 4M4 13c0-10 16-10 16 0v3c0 8-16 8-16 0v-3ZM9 13v1m6-1v1m-5 4 2 1 2-1M12 5v5M9 7h6M8 9h8M4 13l3 1m-3 2 3 1m13-4-3 1m3 2-3 1" },
  { name: "토끼", path: "M7 10C-1-4 11-2 10 9m7 1c8-14-4-12-3-1M4 15c0-9 16-9 16 0v2c0 7-16 7-16 0v-2ZM8 15v1m8-1v1m-6 3 2 1 2-1M7 4l1 4m9-4-1 4" },
  { name: "용", path: "M7 8 4 3l4 1 1-3 3 5m5 2 3-5-4 1-1-3-3 5M5 12C2 6 0 10 3 14m16-2c3-6 5-2 2 2M5 12c0-7 14-7 14 0v5c0 6-14 6-14 0v-5ZM8 13l2 1m6-1-2 1M8 18q4 3 8 0M5 18l-3 2m17-2 3 2M10 5l2 3 2-3" },
  { name: "뱀", path: "M8 12C1 11 4 2 11 2c8 0 9 8 3 10-7 3-8 5-3 6 7 1 9 4 2 5H5m5-16v1m5-1v1M10 10q3 1 5 0m-2 1v3m0-1 2 2m-2-2-2 2M5 21h12" },
  { name: "말", path: "M7 8 5 1l5 3m7 4 2-7-5 3M6 9c0-8 12-8 12 0l2 9c0 6-16 6-16 0l2-9ZM8 11v1m8-1v1M8 17q4-2 8 0m-6 1v1m4-1v1M10 4l2 5 2-5" },
  { name: "양", path: "M7 9C1 10 0 2 5 2q6 0 4 7m8 0c6 1 7-7 2-7q-6 0-4 7M7 6Q2 3 4 7m13-1q5-3 3 1M6 11q-2-4 1-5 0-4 4-3 3-2 5 1 4 0 2 6v7c0 7-12 7-12 0v-6ZM9 13v1m6-1v1m-5 4 2 1 2-1" },
  { name: "원숭이", path: "M6 10C-1 4-1 18 6 17m12-7c7-6 7 8 0 7M4 12c0-14 16-14 16 0v4c0 8-16 8-16 0v-4ZM6 12C5 5 11 6 12 9c1-3 7-4 6 3l-1 6q-5 5-10 0l-1-6ZM9 13v1m6-1v1m-6 4q3 2 6 0" },
  { name: "닭", path: "M9 7C4 4 7 0 10 3c0-5 5-3 4 0 5-3 6 3 2 5M5 13c0-10 14-10 14 0v3c0 8-14 8-14 0v-3ZM8 12v1m8-1v1m-6 3 2 3 2-3h-4ZM10 20q-4 4 2 3 6 1 2-3" },
  { name: "개", path: "M7 7Q0 3 2 17q2 4 5-1m10-9q7-4 5 10-2 4-5-1M6 11c0-9 12-9 12 0v6c0 7-12 7-12 0v-6ZM9 12v1m6-1v1m-5 4 2 1 2-1m-2 1v2m-3 0q3 2 6 0" },
  { name: "돼지", path: "M6 9 3 2q5-2 6 4m9 3 3-7q-5-2-6 4M4 13c0-11 16-11 16 0v3c0 8-16 8-16 0v-3ZM8 12v1m8-1v1M8 17q4-4 8 0v3H8v-3Zm2 0v1m4-1v1" },
] as const;

/** Exactly overlays the existing cat-bead sprite: same 920px canvas and 802px body. */
export default function StoneMalaBead({ base, gold, fill, index, baseFilter, goldFilter, zodiac = false }: { base: string; gold: string; fill: number; index: number; baseFilter?: string; goldFilter?: string; zodiac?: boolean }) {
  const amount = Math.max(0, Math.min(1, fill)), motifs = zodiac ? ZODIAC_MALA_SYMBOLS : STONE_MALA_SYMBOLS, symbol = motifs[index % motifs.length];
  const engraving: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" };
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={base} alt="" draggable={false} className="block w-full" style={{ filter: baseFilter }} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={gold} alt="" aria-hidden draggable={false} className="absolute inset-0 block w-full" style={{ filter: goldFilter, opacity: amount, transition: "opacity .16s ease-out" }} />
    <svg viewBox="0 0 920 920" aria-hidden="true" focusable="false" style={engraving}>
      <g transform="translate(225 225) scale(19.58)" fill="none" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <path d={symbol.path} stroke="#f6f1df" strokeOpacity={zodiac ? .38 : .4} transform="translate(.35 .35)" />
        <path d={symbol.path} stroke={zodiac ? "#4f2d15" : "#353b39"} strokeOpacity={(zodiac ? .59 : .86) * (1 - amount)} />
        <path d={symbol.path} stroke="#805d24" strokeOpacity={(zodiac ? .7 : .9) * amount} />
      </g>
    </svg>
  </>;
}
