"use client";
import "./inyeon-thread.css";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#3b4a8f" : g === "f" ? "#b0233f" : "#a08550";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

// 형이 고른 끈 — 왼쪽 청실·오른쪽 홍실이 가운데서 느슨하게 한 번 꼬인다(public/obj/silk-cord.webp, 1024×99, 바탕 투명).
// 끈 그림을 양끝에서 40씩 안으로 들이고, 비운 자리에 「너의 이름은」 끈처럼 둥근 매듭 + 술 몇 가닥을 단다.
const 들임 = 40, 배율 = (1024 - 들임 * 2) / 1024, 위 = 4;
const 왼끝 = { x: 들임, y: 위 + 59.5 * 배율 }, 오른끝 = { x: 1024 - 들임, y: 위 + 20.5 * 배율 };

function 매듭({ x, y, 쪽, 빛 }: { x: number; y: number; 쪽: -1 | 1; 빛: string }) {
  // 쪽 -1 = 왼끝(술이 왼쪽 위로), 1 = 오른끝(오른쪽 위로)
  const 술 = [-28, -12, 4].map((각) => {
    const r = ((쪽 === 1 ? 0 : 180) + 쪽 * 각) * Math.PI / 180;
    return `M${x + Math.cos(r) * 7} ${y + Math.sin(r) * 7}l${Math.cos(r) * 13} ${Math.sin(r) * 13}`;
  });
  return <g>
    {술.map((d) => <path key={d} d={d} stroke={빛} strokeWidth="1.6" strokeLinecap="round" opacity=".85" />)}
    <circle cx={x} cy={y} r="7.5" fill={빛} />
    <path d={`M${x - 6} ${y - 2}h12M${x - 6.5} ${y + 2}h13`} stroke="#fff" strokeWidth=".9" opacity=".28" />
    <circle cx={x - 2.4} cy={y - 2.6} r="2" fill="#fff" opacity=".35" />
  </g>;
}

export function SilkKnot({ compact = false }: { compact?: boolean; left?: string; right?: string }) {
  if (compact) {
    // 목록·글 머리의 작은 표 — 같은 끈의 가운데 꼬인 자리만
    return <svg viewBox="430 22 164 34" className="silk-knot-small" aria-hidden="true">
      <image href="/obj/silk-cord.webp" width="1024" height="99" />
    </svg>;
  }
  return <svg viewBox="0 0 1024 99" className="silk-knot" aria-hidden="true">
    <image href="/obj/silk-cord.webp" x={들임} y={위} width={1024 - 들임 * 2} height={99 * 배율} />
    <매듭 x={왼끝.x} y={왼끝.y} 쪽={-1} 빛="#2f3f8f" />
    <매듭 x={오른끝.x} y={오른끝.y} 쪽={1} 빛="#a8203c" />
  </svg>;
}
export function InyeonThreadBadge() {
  return <span className="silk-match-badge" role="img" aria-label="맺어진 인연" title="맺어진 인연"><SilkKnot compact/></span>;
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
