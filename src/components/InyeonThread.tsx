"use client";
import "./inyeon-thread.css";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#3b4a8f" : g === "f" ? "#b0233f" : "#a08550";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

// 형이 고른 끈 — 왼쪽 청실·오른쪽 홍실이 가운데서 느슨하게 꼬인다. 끝은 둥근 매듭 + 술(「너의 이름은」 끈).
// 형: 「탄성 있는 느낌보다 납작이 더 나아, 애니처럼」 — 미츠하 머리끈 같은 납작한 띠(public/obj/silk-ribbon-v2.webp, 915×104, 바탕 투명)
export function SilkKnot({ compact = false }: { compact?: boolean; left?: string; right?: string }) {
  if (compact) {
    // 목록·글 머리의 작은 표 — 같은 끈의 가운데 꼬인 자리만
    return <svg viewBox="372 26 176 56" className="silk-knot-small" aria-hidden="true">
      <image href="/obj/silk-ribbon-v2.webp" width="915" height="102" />
    </svg>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/obj/silk-ribbon-v2.webp" alt="" className="silk-knot" draggable={false} />;
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
