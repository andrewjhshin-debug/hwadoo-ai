"use client";
import { useId } from "react";
import "./inyeon-thread.css";
type G = "m" | "f" | null | undefined;
const silk = (g: G) => g === "m" ? "#597fae" : g === "f" ? "#d45c65" : "#ad9360";
const label = (g: G, other: G) => g && g === other ? "도반" : g === "m" ? "청실" : g === "f" ? "홍실" : "실";

/** The same woven knot is used in the card and its public, accepted-match badge. */
export function SilkKnot({ compact = false, left = "#d45c65", right = "#597fae" }: { compact?: boolean; left?: string; right?: string }) {
  const id = useId().replaceAll(":", "");
  const paths = [
    "M8 30C62 26 106 57 143 44C155 39 151 29 143 32C132 37 140 50 151 44C158 40 160 34 158 31",
    "M292 30C238 26 194 57 157 44C145 39 149 29 157 32C168 37 160 50 149 44C142 40 140 34 142 31",
  ];
  return <svg viewBox={compact ? "128 24 44 31" : "0 0 300 84"} className={compact ? "silk-knot-small" : "silk-knot"} aria-hidden="true">
    <defs>{[left, right].map((color, i) => <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color}/><stop offset=".42" stopColor={color}/><stop offset=".51" stopColor="#fff4e4"/><stop offset=".64" stopColor={color}/><stop offset="1" stopColor={color}/></linearGradient>)}</defs>
    {paths.map((d, i) => <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#44312a" strokeWidth="2.7" opacity=".1" transform="translate(0 .6)"/>
      <path d={d} stroke={i ? right : left} strokeWidth="2.2"/>
      <path d={d} stroke={`url(#${id}-${i})`} strokeWidth="1.65"/>
      <path d={d} stroke="#fff5e9" strokeWidth="1.8" strokeDasharray=".35 1.35" opacity=".38"/>
      <path d={d} stroke="#4b3028" strokeWidth=".5" strokeDasharray=".3 1.4" opacity=".2"/>
    </g>)}
    <path d="M147.8 43.5l4.4-2.7m-3.4 4.5 4.3-2.7" stroke="#ead5aa" strokeWidth=".7" strokeLinecap="round"/>
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
