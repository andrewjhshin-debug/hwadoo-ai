// 일원상(一圓相) — 금·적·청으로 물든 열린 원, 그 안에 활짝 핀 연꽃.
// 원을 일부러 닫지 않은 것은 선(禪)의 오랜 상징 — 완전함은 비움에 있다.
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

      {/* 활짝 핀 연꽃 — 다섯 앞잎 + 뒤로 벌어진 잎, 크고 또렷하게 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          className="h-[64%] w-[64%]"
          stroke="#D9B45B"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 가운데 꽃잎 */}
          <path d="M50 24c6 8 9 15 9 22 0 8-4 14-9 18-5-4-9-10-9-18 0-7 3-14 9-22z" />
          {/* 안쪽 좌우 꽃잎 */}
          <path d="M50 64c-4-6-11-9-18-8-1 8 3 15 10 18" />
          <path d="M50 64c4-6 11-9 18-8 1 8-3 15-10 18" />
          {/* 바깥 좌우 꽃잎 — 넓게 벌어진 */}
          <path
            d="M41 66c-6-5-15-6-23-2 1 8 8 14 17 14"
            opacity="0.85"
          />
          <path
            d="M59 66c6-5 15-6 23-2-1 8-8 14-17 14"
            opacity="0.85"
          />
          {/* 수면 받침 */}
          <path d="M30 82c6 3 13 4 20 4s14-1 20-4" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
