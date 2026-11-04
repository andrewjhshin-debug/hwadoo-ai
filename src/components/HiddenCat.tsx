"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { meow } from "@/lib/sound";

// ─────────────────────────────────────────────────────────────
// 숨은 고양이 — 형: 「랜덤으로 고양이 한 마리를 앱 전반에 히든으로. 나왔다가 좀 걸어 다니다가 다양한 모습」
// 화면을 열 때 자주(셋 중 하나꼴, 하루 많아야 여덟 번) 버튼·카드 윗변에 올라와 걷고, 앉고, 하품하고, 그루밍하고 사라진다.
// 누르면 「야옹」(형: 「그냥 야옹 소리만」). 화면을 옮기면 사라지고, 스크롤하면 올라선 자리와 함께 움직인다.
// 그림: public/obj/cat/*.webp (제미나이 한 장에서 오린 여덟 자세, 모두 오른쪽을 본다)
// 시험: 주소 뒤에 ?cat=1 이면 확률·하루 횟수 없이 곧바로 나온다
// ─────────────────────────────────────────────────────────────

type Pose = "walk1" | "walk2" | "sit" | "loaf" | "sleep" | "stretch" | "groom" | "yawn";
const SIZE: Record<Pose, [number, number]> = {
  walk1: [216, 182], walk2: [210, 179], sit: [152, 212], loaf: [186, 137],
  sleep: [204, 119], stretch: [213, 221], groom: [184, 207], yawn: [178, 211],
};
const SCALE = 0.27; // 걷는 키가 약 49px
const SPEED = 42; // px/초
const CHANCE = 0.35; // 화면 하나 열 때 나올 확률 — 형: 「좀 자주 나오게」
const PER_DAY = 8;
const DAY_KEY = "hwadu.cat.day.v1";

type Step = { pose: Pose | "walk"; dur: number; x0: number; x1: number };

const 오늘 = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
function 오늘횟수(): number {
  try { const v = JSON.parse(localStorage.getItem(DAY_KEY) ?? "{}"); return v.d === 오늘() ? v.n ?? 0 : 0; } catch { return 0; }
}
function 횟수더하기() {
  try { localStorage.setItem(DAY_KEY, JSON.stringify({ d: 오늘(), n: 오늘횟수() + 1 })); } catch {}
}

// 올라설 자리 — 화면 안에 다 보이고 폭이 넉넉한 버튼·카드의 윗변
function 자리찾기(): { el: HTMLElement; l: number; r: number } | null {
  const H = innerHeight, W = innerWidth;
  const 후보 = [...document.querySelectorAll<HTMLElement>("button, a, [class*='card'], [class*='box']")]
    .map((el) => ({ el, b: el.getBoundingClientRect() }))
    .filter(({ el, b }) => {
      if (b.width < 150 || b.top < 120 || b.top > H - 150 || b.left < 0 || b.right > W) return false;
      const 위 = document.elementFromPoint(b.left + b.width / 2, b.top + 3);
      return !!위 && (위 === el || el.contains(위));
    });
  if (!후보.length) return null;
  const { el, b } = 후보[Math.floor(Math.random() * 후보.length)];
  return { el, l: b.left + 18, r: b.right - 18 };
}

// 걷다 — 쉬다 — 걷다 … 끝은 다시 가장자리로 걸어 나간다
function 각본(l: number, r: number): Step[] {
  const 쉼: [Pose, number][] = [["sit", 2.2], ["yawn", 1.3], ["groom", 2.6], ["stretch", 1.7], ["loaf", 4], ["sleep", 6]];
  const 시작왼쪽 = Math.random() < 0.5;
  let x = 시작왼쪽 ? l : r;
  const steps: Step[] = [];
  const 걷기 = (to: number) => { steps.push({ pose: "walk", dur: Math.max(0.6, Math.abs(to - x) / SPEED), x0: x, x1: to }); x = to; };
  const 몇번 = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < 몇번; i++) {
    걷기(l + (r - l) * (0.2 + Math.random() * 0.6));
    const [pose, dur] = 쉼[Math.floor(Math.random() * 쉼.length)];
    steps.push({ pose, dur: dur * (0.8 + Math.random() * 0.4), x0: x, x1: x });
  }
  걷기(시작왼쪽 ? r : l);
  return steps;
}

export default function HiddenCat() {
  const path = usePathname();
  const [run, setRun] = useState<{ el: HTMLElement; steps: Step[]; key: number } | null>(null);
  const img = useRef<HTMLImageElement>(null);

  // 화면이 바뀔 때마다 가끔 부른다
  useEffect(() => {
    setRun(null);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const 시험 = new URLSearchParams(location.search).get("cat") === "1";
    if (!시험 && (오늘횟수() >= PER_DAY || Math.random() > CHANCE)) return;
    // 화면이 막 열려 자리가 아직 안 잡혔으면 3초 뒤 두 번 더 둘러본다
    let t = 0, 남은 = 3;
    const 둘러보기 = () => {
      const 자리 = 자리찾기();
      if (!자리 || 자리.r - 자리.l < 110) { if (--남은 > 0) t = window.setTimeout(둘러보기, 3000); return; }
      if (!시험) 횟수더하기();
      setRun({ el: 자리.el, steps: 각본(자리.l, 자리.r), key: Date.now() });
    };
    t = window.setTimeout(둘러보기, 시험 ? 1200 : 4000 + Math.random() * 8000);
    return () => clearTimeout(t);
  }, [path]);

  // 움직임 — 올라선 자리를 매 장면 다시 재서 함께 스크롤된다. 자리가 사라지거나 화면 밖으로 나가면 고양이도 간다
  useEffect(() => {
    if (!run) return;
    const el = img.current!;
    const 전체 = run.steps.reduce((a, s) => a + s.dur, 0);
    const 시작 = performance.now();
    let raf = 0;
    const 그리기 = (now: number) => {
      const t = (now - 시작) / 1000;
      const 자리 = run.el.getBoundingClientRect();
      if (t >= 전체 || !run.el.isConnected || 자리.top < 60 || 자리.top > innerHeight - 60) { setRun(null); return; }
      let 앞 = 0, s = run.steps[run.steps.length - 1];
      for (const q of run.steps) { if (t < 앞 + q.dur) { s = q; break; } 앞 += q.dur; }
      const k = (t - 앞) / s.dur;
      const x = s.x0 + (s.x1 - s.x0) * k;
      const 걷는중 = s.pose === "walk";
      const pose: Pose = 걷는중 ? (Math.floor(t / 0.22) % 2 ? "walk2" : "walk1") : (s.pose as Pose);
      const [w, h] = SIZE[pose];
      const 왼쪽봄 = 걷는중 ? s.x1 < s.x0 : (el.dataset.left === "1");
      el.dataset.left = 왼쪽봄 ? "1" : "0";
      const 들썩 = 걷는중 ? Math.abs(Math.sin((t * Math.PI) / 0.22)) * 1.5 : 0;
      const src = `/obj/cat/${pose}.webp`;
      if (!el.src.endsWith(src)) el.src = src;
      el.style.width = `${w * SCALE}px`;
      el.style.transform = `translate(${x - (w * SCALE) / 2}px, ${자리.top - h * SCALE - 들썩 + 1}px) scaleX(${왼쪽봄 ? -1 : 1})`;
      el.style.opacity = String(Math.min(1, t / 0.4, (전체 - t) / 0.4));
      raf = requestAnimationFrame(그리기);
    };
    raf = requestAnimationFrame(그리기);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  if (!run) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={run.key} ref={img} alt="" draggable={false} className="hidden-cat"
      onClick={(e) => { e.stopPropagation(); meow(); }} />
  );
}
