"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ─────────────────────────────────────────────────────────────
// 숨은 고양이 — 형: 「랜덤으로 고양이 한 마리를 앱 전반에 히든으로. 나왔다가 좀 걸어 다니다가 다양한 모습」
// 앱을 보고 있는 동안 8~14분마다 다시 기회를 잡는다. 하루 최대 세 번.
// 누르면 소리 없이 깜짝 놀라 다른 자리로 총총 옮겨 간다(형: 「야옹 소리 지우고 눌리면 그냥 움직이는 걸로」). 화면을 옮기면 사라지고, 스크롤하면 올라선 자리와 함께 움직인다.
// 그림: motions-v2.webp. 윗줄은 왼쪽을 향해 걷는 여섯 장, 아랫줄은 휴식 동작 여섯 장.
// 시험: 주소 뒤에 ?cat=1 이면 확률·하루 횟수 없이 곧바로 나온다
// ─────────────────────────────────────────────────────────────

type Pose = "sit" | "groom" | "stretch" | "sleep";
const SPRITE_SIZE = 60;
const SPRITE_COLUMNS = 6;
const MOTIONS: Record<Pose, readonly number[]> = {
  sit: [6, 7, 6, 6],
  groom: [8, 9, 8, 9, 6],
  stretch: [10],
  sleep: [11],
};
const SPEED = 42; // px/초
const PER_DAY = 3;
const DAY_KEY = "hwadu.cat.day.v1";
const 다음간격 = () => (8 + Math.random() * 6) * 60_000;

type Point = { x: number; y: number };
type Step = { pose: Pose | "walk" | "hop"; dur: number; from: Point; to: Point };
type Perch = { el: HTMLElement; kind: "counter" | "ledge" | "open"; height?: number };
type Track = { l: number; r: number; floor: number };

const 오늘 = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
function 오늘횟수(): number {
  try { const v = JSON.parse(localStorage.getItem(DAY_KEY) ?? "{}"); return v.d === 오늘() ? v.n ?? 0 : 0; } catch { return 0; }
}
function 횟수더하기() {
  try { localStorage.setItem(DAY_KEY, JSON.stringify({ d: 오늘(), n: 오늘횟수() + 1 })); } catch {}
}

function 걸을자리({ el, kind, height }: Perch): Track | null {
  if (!el.isConnected) return null;
  const b = (kind === "counter" ? el.querySelector(".hip-big") : el)?.getBoundingClientRect();
  if (!b || b.width <= 0) return null;

  let l = b.left + 18, r = b.right - 18, floor = b.top + 1;
  if (kind === "counter") {
    const center = b.left + b.width / 2;
    l = center - 105;
    r = center + 105;
    floor = b.bottom - b.height * 0.08;
  } else if (kind === "open") {
    // 카드가 없는 법당 같은 화면에서도 본문 한쪽을 지나갈 수 있다.
    const left = Math.max(0, b.left), right = Math.min(innerWidth, b.right);
    const span = Math.min(right - left, 440);
    l = (left + right - span) / 2 + 20;
    r = (left + right + span) / 2 - 20;
    const top = Math.max(0, b.top), bottom = Math.min(innerHeight, b.bottom);
    floor = top + (bottom - top) * (height ?? 0.5);
  }
  l = Math.max(SPRITE_SIZE / 2 + 4, l);
  r = Math.min(innerWidth - SPRITE_SIZE / 2 - 4, r);
  return floor >= 115 && floor <= innerHeight - 110 && r - l >= 110 ? { l, r, floor } : null;
}

// 먼저 보이는 본문 안의 카드와 버튼을 살핀다. 숫자 앞도 여러 자리 중 하나다.
function 자리찾기(): (Perch & Track) | null {
  const main = document.querySelector<HTMLElement>("#scroll-box main");
  if (!main) return null;
  const 후보: (Perch & Track)[] = [];
  const 추가 = (perch: Perch) => {
    const track = 걸을자리(perch);
    if (!track) return;
    const y = track.floor + (perch.kind === "ledge" ? 2 : -12);
    const hit = document.elementFromPoint((track.l + track.r) / 2, y);
    if (hit && perch.el.contains(hit)) 후보.push({ ...perch, ...track });
  };
  for (const el of main.querySelectorAll<HTMLElement>("button, a, article, [class*='card'], [class*='box']")) {
    추가({ el, kind: "ledge" });
  }
  const counter = main.querySelector<HTMLElement>("[data-cat-counter]");
  if (counter) 추가({ el: counter, kind: "counter" });
  // 카드가 없는 화면에도 여유 있는 높이 두 곳을 후보로 둔다.
  추가({ el: main, kind: "open", height: 0.32 });
  추가({ el: main, kind: "open", height: 0.68 });
  return 후보[Math.floor(Math.random() * 후보.length)] ?? null;
}

function 걷기(from: Point, to: Point): Step {
  return { pose: "walk", dur: Math.max(0.6, Math.hypot(to.x - from.x, to.y - from.y) / SPEED), from, to };
}

// 화면 가장자리에서 비스듬히 들어와 한 번 쉬고, 다른 높이로 옮겨 간다.
function 각본({ l, r, floor }: Track): Step[] {
  const 쉼: [Pose, number][] = [["sit", 2.2], ["groom", 2.6], ["stretch", 1.7], ["sleep", 4]];
  const 시작왼쪽 = Math.random() < 0.5;
  const 위 = Math.max(-48, 90 - floor);
  const 아래 = Math.min(48, innerHeight - 100 - floor);
  const 위에서 = 아래 < 28 || (위 <= -28 && Math.random() < 0.5);
  const 시작 = { x: 시작왼쪽 ? l : r, y: 위에서 ? 위 : 아래 };
  const 첫쉼 = { x: l + (r - l) * (시작왼쪽 ? 0.32 : 0.68), y: 0 };
  const 둘째쉼 = { x: l + (r - l) * (시작왼쪽 ? 0.7 : 0.3), y: 위에서 ? 아래 : 위 };
  const 끝 = { x: 시작왼쪽 ? r : l, y: 둘째쉼.y * 0.4 };
  const 쉬기 = (at: Point): Step => {
    const [[pose, dur]] = 쉼.splice(Math.floor(Math.random() * 쉼.length), 1);
    return { pose, dur, from: at, to: at };
  };
  return [걷기(시작, 첫쉼), 쉬기(첫쉼), 걷기(첫쉼, 둘째쉼), 쉬기(둘째쉼), 걷기(둘째쉼, 끝)];
}

export default function HiddenCat() {
  const path = usePathname();
  const 다음등장 = useRef<number | null>(null);

  return <CatScene key={path} 다음등장={다음등장} />;
}

function CatScene({ 다음등장 }: { 다음등장: { current: number | null } }) {
  const [run, setRun] = useState<(Perch & Track & { steps: Step[]; 이어서?: boolean }) | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const sprite = useRef<HTMLSpanElement>(null);
  const 지금 = useRef<Point>({ x: 0, y: 0 });

  // 화면을 옮겨도 다음 등장 시각은 이어진다.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const 시험 = new URLSearchParams(location.search).get("cat") === "1";
    다음등장.current ??= Date.now() + 다음간격();
    let t = 0, 남은 = 3;
    const 둘러보기 = () => {
      if (document.visibilityState === "visible" && (시험 || 오늘횟수() < PER_DAY)) {
        const 자리 = 자리찾기();
        if (자리) {
          const steps = 각본(자리);
          지금.current = steps[0].from;
          if (!시험) 횟수더하기();
          setRun({ ...자리, steps });
        } else if (--남은 > 0) {
          t = window.setTimeout(둘러보기, 3000);
          return;
        }
      }
      if (!시험) {
        남은 = 3;
        const 간격 = 다음간격();
        다음등장.current = Date.now() + 간격;
        t = window.setTimeout(둘러보기, 간격);
      }
    };
    t = window.setTimeout(둘러보기, 시험 ? 1200 : Math.max(1200, 다음등장.current - Date.now()));
    return () => clearTimeout(t);
  }, [다음등장]);

  // 움직임 — 올라선 자리를 매 장면 다시 재서 함께 스크롤된다. 자리가 사라지거나 화면 밖으로 나가면 고양이도 간다
  useEffect(() => {
    const el = button.current, 그림 = sprite.current;
    if (!run || !el || !그림) return;
    const 전체 = run.steps.reduce((a, s) => a + s.dur, 0);
    const 시작 = performance.now();
    let raf = 0;
    const 그리기 = (now: number) => {
      const t = Math.max(0, (now - 시작) / 1000);
      const 자리 = 걸을자리(run);
      if (t >= 전체 || !자리) { setRun(null); return; }
      let 앞 = 0, s = run.steps[run.steps.length - 1];
      for (const q of run.steps) { if (t < 앞 + q.dur) { s = q; break; } 앞 += q.dur; }
      const k = (t - 앞) / s.dur;
      const x = s.from.x + (s.to.x - s.from.x) * k;
      const 뛰는중 = s.pose === "hop";
      const y = s.from.y + (s.to.y - s.from.y) * k - (뛰는중 ? 24 * 4 * k * (1 - k) : 0);
      const 발높이 = Math.max(90, Math.min(innerHeight - 100, 자리.floor + y));
      지금.current = { x, y: 발높이 - 자리.floor };
      const 움직이는중 = s.pose === "walk" || 뛰는중;
      const 동작시간 = t - 앞;
      const frames = s.pose === "walk" || s.pose === "hop" ? null : MOTIONS[s.pose];
      const frame = 뛰는중 && k > 0.2 && k < 0.72
        ? 10
        : frames
          ? frames[Math.floor(동작시간 / 0.28) % frames.length]
          : Math.floor(동작시간 / (뛰는중 ? 0.07 : 0.12)) % SPRITE_COLUMNS;
      const 왼쪽봄 = 움직이는중 ? s.to.x < s.from.x : el.dataset.left === "1";
      el.dataset.left = 왼쪽봄 ? "1" : "0";
      그림.style.backgroundPosition = `-${frame % SPRITE_COLUMNS * SPRITE_SIZE}px -${Math.floor(frame / SPRITE_COLUMNS) * SPRITE_SIZE}px`;
      const 화면x = 자리.l + (x - run.l) / (run.r - run.l) * (자리.r - 자리.l);
      el.style.transform = `translate(${화면x - SPRITE_SIZE / 2}px, ${발높이 - SPRITE_SIZE}px) scaleX(${왼쪽봄 ? 1 : -1})`;
      el.style.opacity = String(Math.min(1, run.이어서 ? 1 : t / 0.4, (전체 - t) / 0.4));
      raf = requestAnimationFrame(그리기);
    };
    raf = requestAnimationFrame(그리기);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  // 누르면 현재 높이에서 반대편으로 폴짝 뛰고, 착지한 뒤 걸어서 나간다.
  const 놀람 = () => {
    if (!run) return;
    const from = 지금.current, { l, r } = run;
    const 왼쪽 = from.x - l > r - from.x;
    const to = { x: l + (r - l) * (왼쪽 ? 0.18 : 0.82), y: from.y < 0 ? 46 : -46 };
    const 이동시간 = Math.hypot(to.x - from.x, to.y - from.y) / (SPEED * 3);
    const 뛰기: Step = { pose: "hop", dur: Math.max(0.42, Math.min(1.05, 이동시간)), from, to };
    const 착지: Step = { pose: "sit", dur: 1.25, from: to, to };
    setRun({ ...run, steps: [뛰기, 착지, 걷기(to, { x: 왼쪽 ? l : r, y: 0 })], 이어서: true });
  };

  if (!run) return null;
  return (
    <button ref={button} type="button" aria-label="고양이 움직이기" className="hidden-cat"
      onClick={(e) => { e.stopPropagation(); 놀람(); }}>
      <span ref={sprite} aria-hidden="true" />
    </button>
  );
}
