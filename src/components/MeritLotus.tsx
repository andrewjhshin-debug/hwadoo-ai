"use client";
import { meritLotusPose } from "@/lib/merit-lotus";
import "./merit-lotus.css";

// 형: 「개화 안 했다가 퍼센티지 차면서 연꽃으로 펼쳐지는 거, 비율마다 몇 개 더 만들어서」
// 봉오리에서 만개까지 여섯 장(public/obj/lotus-bloom-1~6.webp). 오늘 공덕이 차는 만큼 한 장씩 핀다.
// 다 차면(1) 만개. 앱 곳곳의 연꽃 표시(LotusBloom)는 꽃만 따로 뜬 lotus-icon 을 쓴다.
export default function MeritLotus({ progress, className = "" }: { progress: number; className?: string }) {
  const pose = meritLotusPose(progress);
  const 장 = pose.progress >= 1 ? 6 : Math.min(5, 1 + Math.floor(pose.progress * 5));
  // Align visible artwork, independent of transparent sprite margins.
  const bounds = [[102,115,54,108],[89,101,80,121],[83,93,92,130],[64,79,128,137],[15,66,229,150],[14,66,230,149]][장 - 1];
  const scale = Math.min(32 / bounds[2], 24 / bounds[3]);
  const width = bounds[2] * scale, height = bounds[3] * scale;
  const baseWidth = Math.max(12, Math.min(30, width * .95));
  const baseLeft = 20 - baseWidth / 2, baseRight = 20 + baseWidth / 2;
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className={`merit-lotus merit-lotus-gauge ${className}`.trim()} data-open={pose.progress}>
      <path className="merit-lotus-base" fill="#adc989" d={`M${baseLeft} 25Q20 28 ${baseRight} 25Q${baseRight - 2} 30 20 30Q${baseLeft + 2} 30 ${baseLeft} 25Z`} />
      <path d={`M${baseLeft + 1} 25.5Q20 28 ${baseRight - 1} 25.5`} fill="none" stroke="#cddda9" strokeWidth=".6" />
      <svg x={(40 - width) / 2} y={28 - height} width={width} height={height} style={{ width, height, overflow: "hidden" }} viewBox={bounds.join(" ")}>
        <image href={`/obj/lotus-bloom-${장}.webp`} width="256" height="256" />
      </svg>
    </svg>
  );
}

/** 작은 자리용 연꽃 — 만개한 꽃만(줄기 없이) */
export function LotusIcon({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/obj/lotus-bloom-icon.webp" alt="" aria-hidden="true" draggable={false} className={`merit-lotus merit-lotus-img ${className}`.trim()} />;
}
