// 일원상(一圓相) — 금·적·청으로 물든 열린 원, 가운데 연꽃 한 송이.
// 원을 일부러 닫지 않은 것은 선(禪)의 오랜 상징 — 완전함은 비움에 있다.
// 연꽃은 사실적 묘사가 아니라, 세 획으로 압축한 상징.
export default function Enso({ size = 150 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="breathe relative"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 150 150"
        fill="none"
        className="h-full w-full"
        style={{ transform: "rotate(-80deg)" }}
      >
        <defs>
          <linearGradient id="enso-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E9CD82" />
            <stop offset=".5" stopColor="#C1553B" />
            <stop offset="1" stopColor="#5E7FB2" />
          </linearGradient>
        </defs>
        <circle
          cx="75"
          cy="75"
          r="66"
          stroke="url(#enso-g)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="382 33"
        />
      </svg>
      {/* 연꽃 — 세 획의 상징. 가운데 꽃잎 하나, 좌우로 벌어진 두 획. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="h-[42%] w-[42%]"
          stroke="#D9B45B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 가운데 꽃잎 — 물방울 하나 */}
          <path d="M24 13c2.6 3.4 3.9 6.4 3.9 9.2 0 3-1.7 5.2-3.9 6.6-2.2-1.4-3.9-3.6-3.9-6.6 0-2.8 1.3-5.8 3.9-9.2z" />
          {/* 좌우 두 획 — 벌어진 꽃잎 */}
          <path d="M20.4 27.8c-2.8-1-5-3.2-5.6-6.4" />
          <path d="M27.6 27.8c2.8-1 5-3.2 5.6-6.4" />
        </svg>
      </div>
    </div>
  );
}
