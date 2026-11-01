"use client";
import { useId } from "react";
import { meritLotusPose } from "@/lib/merit-lotus";
import "./merit-lotus.css";

export default function MeritLotus({ progress }: { progress: number }) {
  const pose = meritLotusPose(progress), id = useId().replaceAll(":", "");
  const petal = "M22 33C9 26 12 15 22 6c10 9 13 20 0 27Z";
  return <svg className="merit-lotus" viewBox="0 0 44 42" aria-hidden="true" data-open={pose.progress}>
    <defs>
      <linearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbd4df" /><stop offset="1" stopColor="#e893b2" /></linearGradient>
      <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1f5" /><stop offset=".45" stopColor="#f4afc7" /><stop offset="1" stopColor="#e48eae" /></linearGradient>
    </defs>
    <path d="M8 33q14 10 28 0-4 9-14 8T8 33" fill="#bad9c6" />
    {[-1, 1].map(side => <g className="merit-lotus-petal" key={`outer${side}`} style={{ transform: `rotate(${side * pose.outer}deg)` }}><path d={petal} fill={`url(#${id}-back)`} /><path d="M22 10q-5 12 0 21" fill="none" stroke="#ffe8ef" strokeWidth="1" opacity=".65" /></g>)}
    {[-1, 1].map(side => <g className="merit-lotus-petal" key={`inner${side}`} style={{ transform: `rotate(${side * pose.inner}deg) scale(.94)` }}><path d={petal} fill={`url(#${id}-front)`} /></g>)}
    <g className="merit-lotus-petal" style={{ transform: `scale(1,${pose.centerY})` }}><path d={petal} fill={`url(#${id}-front)`} /><path d="M22 10c-5 9-5 16 0 20" fill="none" stroke="#ffeaf1" strokeWidth="1.8" strokeLinecap="round" /></g>
  </svg>;
}
