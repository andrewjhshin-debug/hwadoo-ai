// 일원상(一圓相) — 금·적·청으로 물든 열린 원, 가운데 연꽃.
// 시안의 엔소를 그대로 옮겼다.
import { Lotus } from "./icons";

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
      <div className="absolute inset-0 flex items-center justify-center">
        <Lotus className="h-[37%] w-[37%]" stroke="#D9B45B" />
      </div>
    </div>
  );
}
