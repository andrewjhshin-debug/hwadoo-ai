"use client";
import "./inyeon-thread.css";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#356ba4" : g === "f" ? "#c64655" : "#a08550";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

/** The same woven knot is used in the card and its public, accepted-match badge. */
export function SilkKnot({ compact = false, left = "#c64655", right = "#356ba4" }: { compact?: boolean; left?: string; right?: string }) {
  const paths = [
    "M8 30C62 26 106 57 143 44C155 39 151 29 143 32C132 37 140 50 151 44C158 40 160 34 158 31",
    "M292 30C238 26 194 57 157 44C145 39 149 29 157 32C168 37 160 50 149 44C142 40 140 34 142 31",
  ];
  return <svg viewBox={compact ? "128 24 44 31" : "0 0 300 84"} className={compact ? "silk-knot-small" : "silk-knot"} aria-hidden="true">
    {paths.map((d, i) => <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#473735" strokeWidth="3" opacity=".12" transform="translate(0 .45)"/>
      <path d={d} stroke={i ? right : left} strokeWidth="2.45"/>
      <path d={d} stroke="#fff1df" strokeWidth=".45" opacity=".32" transform="translate(0 -.35)"/>
      <path d={d} stroke="#fff3df" strokeWidth="1.2" strokeDasharray=".3 1.15" opacity=".22"/>
      <path d={d} stroke="#342b2e" strokeWidth=".4" strokeDasharray=".25 1.2" opacity=".24"/>
    </g>)}
    <g fill="none" strokeLinecap="round">
      <path d="M143.7 44.3Q150 44.8 153.1 40.5" stroke="#44312a" strokeWidth="2.9" opacity=".16"/>
      <path d="M143.7 44Q150 44.5 153.1 40.2" stroke={left} strokeWidth="2.45"/>
      <path d="M144.2 43.5Q149.8 43.9 152.5 40.4" stroke="#fce7d4" strokeWidth=".45" opacity=".65"/>
      <path d="M147.2 43.8l3.9 2.1m-2.9-3.4 4 2.1m-2.9-3.4 3.8 2.1" stroke="#d5af65" strokeWidth=".62"/>
    </g>
  </svg>;
}
export function InyeonThreadBadge() {
  return <span className="silk-match-badge" role="img" aria-label="맺어진 인연" title="맺어진 인연"><SilkKnot compact/></span>;
}
export default function InyeonThread({ leftName, rightName, leftGender, rightGender, className = "", 낮 = false }: {
  leftName: string; rightName: string; leftGender?: G; rightGender?: G; className?: string; 낮?: boolean;
}) {
  return <div className={`inyeon-silk-card ${낮 ? "inyeon-silk-day" : ""} ${className}`}>
    <SilkKnot left={silk(leftGender)} right={silk(rightGender)}/>
    <div className="inyeon-silk-names"><span>{leftName}<small style={{color:silk(leftGender)}}>{label(leftGender,rightGender)}</small></span><span><small style={{color:silk(rightGender)}}>{label(rightGender,leftGender)}</small>{rightName}</span></div>
  </div>;
}
