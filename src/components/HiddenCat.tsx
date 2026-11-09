"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ─────────────────────────────────────────────────────────────
// 숨은 고양이 — 형: 「랜덤으로 고양이 한 마리를 앱 전반에 히든으로. 나왔다가 좀 걸어 다니다가 다양한 모습」
// 화면을 열면 가끔 바로 찾아오고, 앱을 보고 있는 동안 2~4분마다 다시 기회를 잡는다. 하루 최대 여덟 번.
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
const CHANCE = 0.35; // 앱을 열었을 때 첫 방문이 빨리 올 확률
const PER_DAY = 8;
const DAY_KEY = "hwadu.cat.day.v1";
const 다음간격 = () => (2 + Math.random() * 2) * 60_000;

type Step = { pose: Pose | "walk"; dur: number; x0: number; x1: number };
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

// 걷다 — 쉬다 — 걷다 … 끝은 다시 가장자리로 걸어 나간다
function 각본(l: number, r: number): Step[] {
  const 쉼: [Pose, number][] = [["sit", 2.2], ["groom", 2.6], ["stretch", 1.7], ["sleep", 4]];
  const 시작왼쪽 = Math.random() < 0.5;
  let x = 시작왼쪽 ? l : r;
  const steps: Step[] = [];
  const 걷기 = (to: number) => { steps.push({ pose: "walk", dur: Math.max(0.6, Math.abs(to - x) / SPEED), x0: x, x1: to }); x = to; };
  const 몇번 = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < 몇번; i++) {
    걷기(l + (r - l) * (0.2 + Math.random() * 0.6));
    const [[pose, dur]] = 쉼.splice(Math.floor(Math.random() * 쉼.length), 1);
    steps.push({ pose, dur: dur * (0.8 + Math.random() * 0.4), x0: x, x1: x });
  }
  걷기(시작왼쪽 ? r : l);
  return steps;
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
  const 지금x = useRef(0);

  // 화면을 옮겨도 다음 등장 시각은 이어진다.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const 시험 = new URLSearchParams(location.search).get("cat") === "1";
    const 첫간격 = () => Math.random() < CHANCE ? 4000 + Math.random() * 8000 : 다음간격();
    다음등장.current ??= Date.now() + 첫간격();
    let t = 0, 남은 = 3;
    const 둘러보기 = () => {
      if (document.visibilityState === "visible" && (시험 || 오늘횟수() < PER_DAY)) {
        const 자리 = 자리찾기();
        if (자리) {
          지금x.current = 자리.l;
          if (!시험) 횟수더하기();
          setRun({ ...자리, steps: 각본(자리.l, 자리.r) });
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
      const x = s.x0 + (s.x1 - s.x0) * k;
      지금x.current = x;
      const 걷는중 = s.pose === "walk";
      const 동작시간 = t - 앞;
      const frames = s.pose === "walk" ? null : MOTIONS[s.pose];
      const frame = frames
        ? frames[Math.floor(동작시간 / 0.28) % frames.length]
        : Math.floor(동작시간 / (run.이어서 && 앞 === 0 ? 0.07 : 0.12)) % SPRITE_COLUMNS;
      const 왼쪽봄 = 걷는중 ? s.x1 < s.x0 : (el.dataset.left === "1");
      el.dataset.left = 왼쪽봄 ? "1" : "0";
      그림.style.backgroundPosition = `-${frame % SPRITE_COLUMNS * SPRITE_SIZE}px -${Math.floor(frame / SPRITE_COLUMNS) * SPRITE_SIZE}px`;
      const 화면x = 자리.l + (x - run.l) / (run.r - run.l) * (자리.r - 자리.l);
      el.style.transform = `translate(${화면x - SPRITE_SIZE / 2}px, ${자리.floor - SPRITE_SIZE}px) scaleX(${왼쪽봄 ? 1 : -1})`;
      el.style.opacity = String(Math.min(1, run.이어서 ? 1 : t / 0.4, (전체 - t) / 0.4));
      raf = requestAnimationFrame(그리기);
    };
    raf = requestAnimationFrame(그리기);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  // 누르면 — 지금 자리에서 멀찍이 떨어진 곳으로 빠르게 걸어가 잠깐 쉬다가 가장자리로 나간다
  const 놀람 = () => {
    if (!run) return;
    const x = 지금x.current, { l, r } = run;
    const 갈곳 = x - l > r - x ? l + (x - l) * 0.25 : r - (r - x) * 0.25;
    const 뛰기: Step = { pose: "walk", dur: Math.max(0.35, Math.abs(갈곳 - x) / (SPEED * 3)), x0: x, x1: 갈곳 };
    const 나머지 = 각본(l, r).slice(-2).map((s, i) => (i === 0 ? { ...s, x0: 갈곳, x1: 갈곳 } : { ...s, x0: 갈곳, dur: Math.max(0.6, Math.abs(s.x1 - 갈곳) / SPEED) }));
    setRun({ ...run, steps: [뛰기, ...나머지], 이어서: true });
  };

  if (!run) return null;
  return (
    <button ref={button} type="button" aria-label="고양이 움직이기" className="hidden-cat"
      onClick={(e) => { e.stopPropagation(); 놀람(); }}>
      <span ref={sprite} aria-hidden="true" />
    </button>
  );
}
