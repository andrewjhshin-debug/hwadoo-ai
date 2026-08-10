// 일원상(一圓相) — 금·적·청으로 물든 열린 원, 가운데 연꽃.
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
      {/* 연꽃 — 삼중 꽃잎, 은은한 금빛 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="h-[52%] w-[52%]"
          stroke="#D9B45B"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 가운데 꽃잎 */}
          <path d="M24 38c-4.4-2.9-7-7.4-7-12.2 0-4.2 2.6-9.4 7-13 4.4 3.6 7 8.8 7 13 0 4.8-2.6 9.3-7 12.2z" />
          {/* 안쪽 좌우 꽃잎 */}
          <path d="M14.5 20.5c-3.2 1.6-5.6 4.3-6 8.2 4.1 2.6 8.6 2.3 11.7.2M33.5 20.5c3.2 1.6 5.6 4.3 6 8.2-4.1 2.6-8.6 2.3-11.7.2" />
          {/* 바깥 좌우 꽃잎 — 받치는 잎 */}
          <path d="M8.5 30.5c-1.9 1.9-3 4.4-3.1 7.3 3.4 1.3 6.9.7 9.6-1M39.5 30.5c1.9 1.9 3 4.4 3.1 7.3-3.4 1.3-6.9.7-9.6-1" opacity="0.75" />
          {/* 꽃심 */}
          <circle cx="24" cy="27" r="1.1" fill="#D9B45B" stroke="none" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
}
