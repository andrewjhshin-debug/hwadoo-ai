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
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className={`merit-lotus merit-lotus-gauge ${className}`.trim()} data-open={pose.progress}>
      <path fill="#a6c98d" d="M20 27C15 24 8 25 4 27C8 32 15 33 20 29C25 33 32 32 36 27C32 25 25 24 20 27Z" />
      <path d="M6 27.5Q13 30 20 28Q27 30 34 27.5" fill="none" stroke="#cbdcae" strokeWidth=".6" />
      <svg x={(40 - width) / 2} y={28 - height} width={width} height={height} viewBox={bounds.join(" ")}>
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
