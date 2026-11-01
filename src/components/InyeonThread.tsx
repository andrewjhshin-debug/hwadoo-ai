"use client";
import "./inyeon-thread.css";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#3b4a8f" : g === "f" ? "#b0233f" : "#a08550";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

// 형이 고른 끈 — 왼쪽 청실·오른쪽 홍실이 가운데서 느슨하게 꼬인다. 끝은 둥근 매듭 + 술(「너의 이름은」 끈).
// 제미나이로 비단 땋은 끈 결로 뽑아 바탕만 걷었다(public/obj/silk-cord.webp, 915×102, 바탕 투명 — 가운데는 매듭 없이 두 바퀴 반 느슨히 감김(형: 6번째 줄 결))
export function SilkKnot({ compact = false }: { compact?: boolean; left?: string; right?: string }) {
  if (compact) {
    // 목록·글 머리의 작은 표 — 같은 끈의 가운데 꼬인 자리만
    return <svg viewBox="372 26 176 56" className="silk-knot-small" aria-hidden="true">
      <image href="/obj/silk-cord.webp" width="915" height="102" />
    </svg>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/obj/silk-cord.webp" alt="" className="silk-knot" draggable={false} />;
}
// 목록·글 머리의 작은 표 — 끈을 줄이면 얼룩이 된다(형: 「존나 별로네」). 청·홍 두 점이 겹친 알약 + 「이어짐」
export function InyeonThreadBadge() {
  // 형: 「걍 없애」 — 목록·글 머리의 작은 표는 걷는다. 이어진 글은 글 안 끈 카드로만 보인다
  return null;
}
export default function InyeonThread({ leftName, rightName, leftGender, rightGender, className = "", 낮 = false }: {
  leftName: string; rightName: string; leftGender?: G; rightGender?: G; className?: string; 낮?: boolean;
}) {
  return <div className={`inyeon-silk-card ${낮 ? "inyeon-silk-day" : ""} ${className}`}>
    {/* 끈은 늘 왼쪽 청실·오른쪽 홍실 — 왼쪽 사람이 여자고 오른쪽이 남자면 끈을 뒤집는다 */}
    <div style={leftGender === "f" && rightGender === "m" ? { transform: "scaleX(-1)" } : undefined}><SilkKnot /></div>
    <div className="inyeon-silk-names"><span>{leftName}<small style={{color:silk(leftGender)}}>{label(leftGender,rightGender)}</small></span><span><small style={{color:silk(rightGender)}}>{label(rightGender,leftGender)}</small>{rightName}</span></div>
  </div>;
}
