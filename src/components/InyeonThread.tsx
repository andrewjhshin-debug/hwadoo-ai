"use client";
import { useId } from "react";
import "./inyeon-thread.css";
import { SILK_HOOK } from "./silkHook";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#3b4a8f" : g === "f" ? "#b0233f" : "#a08550";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

// 형이 고른 끈 — 청실은 왼쪽 매듭에서 한 번 솟았다 길게 흘러와, 홍실과 가운데서 네모난 끝을 닿을 듯 말 듯 마주 댄다.
// 두 끝이 숨 쉬듯 다가갔다 멀어지고, 가장 가까울 때 빛이 한 번 번진다(inyeon-thread.css 의 .silk-hook)
export function SilkKnot() {
  const id = useId().replaceAll(":", "");
  return <svg viewBox="0 0 1000 150" className="silk-knot silk-hook" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: SILK_HOOK.replaceAll("__ID__", id) }} />;
}
// 목록·글 머리의 작은 표 — 끈을 줄이면 얼룩이 된다(형: 「존나 별로네」). 청·홍 두 점이 겹친 알약 + 「이어짐」
export function InyeonThreadBadge() {
  // 형: 「걍 없애」 — 목록·글 머리의 작은 표는 걷는다. 이어진 글은 글 안 끈 카드로만 보인다
  return null;
}
export default function InyeonThread({ leftName, rightName, leftGender, rightGender, className = "", 낮 = false }: {
  leftName: string; rightName: string; leftGender?: G; rightGender?: G; className?: string; 낮?: boolean;
}) {
  // 형: 「실만 띡 하는 것보다 처음처럼 신비로운 느낌, 매칭이 됐다를 보여주는 느낌」
  // 「너의 이름은」 포스터의 하늘 — 위는 새벽 파랑, 아래는 해질 녘 분홍. 두 끈이 양끝에서 그려져 들어와
  // 가운데서 만나는 순간 빛이 한 번 번지고, 그 자리에서 빛 티끌이 천천히 올라간다
  return <div className={`inyeon-silk-card inyeon-silk-sky ${낮 ? "inyeon-silk-day" : ""} ${className}`}>
    <p className="inyeon-silk-say">인연이 닿았습니다</p>
    <div className="inyeon-silk-stage">
      <span className="inyeon-silk-glow" aria-hidden />
      {Array.from({ length: 9 }, (_, i) => <i key={i} className="inyeon-silk-mote" style={{ "--k": i } as React.CSSProperties} aria-hidden />)}
      {/* 끈은 늘 왼쪽 청실·오른쪽 홍실 — 왼쪽 사람이 여자고 오른쪽이 남자면 끈을 뒤집는다 */}
      <div className="inyeon-silk-draw" style={leftGender === "f" && rightGender === "m" ? { transform: "scaleX(-1)" } : undefined}><SilkKnot /></div>
    </div>
    <div className="inyeon-silk-names"><span>{leftName}<small style={{color:silk(leftGender)}}>{label(leftGender,rightGender)}</small></span><span><small style={{color:silk(rightGender)}}>{label(rightGender,leftGender)}</small>{rightName}</span></div>
  </div>;
}
