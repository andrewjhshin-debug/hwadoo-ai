"use client";
import { meritLotusPose } from "@/lib/merit-lotus";
import "./merit-lotus.css";

// 형: 「개화 안 했다가 퍼센티지 차면서 연꽃으로 펼쳐지는 거, 비율마다 몇 개 더 만들어서」
// 봉오리에서 만개까지 여섯 장(public/obj/lotus-stage-1~6.webp). 오늘 공덕이 차는 만큼 한 장씩 핀다.
// 다 차면(1) 만개. 앱 곳곳의 연꽃 표시(LotusBloom)는 꽃만 따로 뜬 lotus-icon 을 쓴다.
export default function MeritLotus({ progress, className = "" }: { progress: number; className?: string }) {
  const pose = meritLotusPose(progress);
  const 장 = pose.progress >= 1 ? 6 : Math.min(5, 1 + Math.floor(pose.progress * 5));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/obj/lotus-stage-${장}.webp`} alt="" aria-hidden="true" draggable={false} className={`merit-lotus merit-lotus-img ${className}`.trim()} data-open={pose.progress} />;
}

/** 작은 자리용 연꽃 — 만개한 꽃만(줄기 없이) */
export function LotusIcon({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/obj/lotus-icon.webp" alt="" aria-hidden="true" draggable={false} className={`merit-lotus merit-lotus-img ${className}`.trim()} />;
}
