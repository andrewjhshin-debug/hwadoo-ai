"use client";

// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무소유 · 무집착 챌린지.
// · 세 카드 가운데 하나를 골라 시작 → 하루 한 번 "오늘도 비웠습니다"
// · 체크한 날들은 염주알처럼 줄지어 남는다 — 놓친 날은 빈 알로 남을 뿐,
//   끊기지 않는다 (엄격한 스트릭이 아니다 — 수행이지 게임이 아니다)
// · 기간을 다 채우면 완주 문구 + 다시 시작 / 다른 비움 고르기
// · 저장: localStorage "hwadu.empty.v1" — { kind, startedAt, days, checked }
// · 도중 그만두기(내려놓기)는 useConfirm 물음창으로 한 번 묻는다
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { durationLabel } from "@/lib/store";

const KEY = "hwadu.empty.v1";
const DAY_MS = 86_400_000;

type Kind = "spend" | "possess" | "attach";

type Saved = {
  kind: Kind;
  startedAt: number; // 시작한 순간 (ms)
  days: number; // 총 기간 (일)
  checked: string[]; // 비운 날들 — "YYYY-MM-DD"
};

type Challenge = {
  kind: Kind;
  hanja: string;
  name: string;
  desc: string;
  days: number;
  hint: string; // 진행 화면의 '오늘의 비움' 한 줄
};

const CHALLENGES: Challenge[] = [
  {
    kind: "spend",
    hanja: "無支出",
    name: "무지출",
    desc: "오늘 하루, 꼭 필요한 것 외에 쓰지 않습니다.",
    days: 3,
    hint: "지갑을 열기 전에 한 번 묻습니다 — 이것이 없으면 안 되는가.",
  },
  {
    kind: "possess",
    hanja: "無所有",
    name: "무소유",
    desc: "하루에 한 가지, 쓰지 않는 물건을 내보냅니다.",
    days: 7,
    hint: "오늘 내보낼 한 가지를 정하십시오. 작은 것이라도 좋습니다.",
  },
  {
    kind: "attach",
    hanja: "無執着",
    name: "무집착",
    desc: "마음에 걸리는 일 하나를 붙들지 않고 흘려보냅니다.",
    days: 3,
    hint: "붙드는 마음을 알아차리면, 이미 반은 놓은 것입니다.",
  },
];

// ══════════════ 날짜 셈 ══════════════
function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(t: number): Date {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
function todayLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

// "사흘" → "사흘을", "이레" → "이레를" — 받침에 따라 조사를 고른다
function withEul(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const batchim =
    code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${word}${batchim ? "을" : "를"}`;
}

// ══════════════ 저장 ══════════════
function load(): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (
      !s ||
      typeof s.startedAt !== "number" ||
      typeof s.days !== "number" ||
      s.days < 1 ||
      !Array.isArray(s.checked) ||
      !CHALLENGES.some((c) => c.kind === s.kind)
    )
      return null;
    return { ...s, checked: s.checked.filter((v) => typeof v === "string") };
  } catch {
    return null;
  }
}

function persist(s: Saved | null) {
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {}
}

// ══════════════ 염주알 — 체크한 날들이 줄지어 꿰인다 ══════════════
function Beads({
  start,
  days,
  checked,
  todayKey,
  done,
}: {
  start: Date;
  days: number;
  checked: string[];
  todayKey: string;
  done: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-y-3">
      {Array.from({ length: days }, (_, i) => {
        const key = dateKey(addDays(start, i));
        const filled = checked.includes(key);
        const isToday = !done && key === todayKey;
        const future = key > todayKey;
        return (
          <span key={key} className="flex items-center">
            {/* 알 사이의 실 */}
            {i > 0 && <span aria-hidden className="h-px w-4 bg-gold/25 sm:w-6" />}
            <span
              title={`${i + 1}일째 · ${key}${filled ? " — 비웠습니다" : ""}`}
              className={`inline-block h-4 w-4 rounded-full transition-colors ${
                filled
                  ? "bg-gold ring-2 ring-gold/20"
                  : isToday
                    ? "border-[1.5px] border-gold/70"
                    : future
                      ? "border border-ink-3 opacity-45"
                      : "border border-ink-3" // 놓친 날 — 빈 알로 남을 뿐, 끊기지 않는다
              }`}
            />
          </span>
        );
      })}
    </div>
  );
}

// ══════════════ 페이지 ══════════════
export default function EmptyPage() {
  const confirm = useConfirm();
  const [ready, setReady] = useState(false); // localStorage 를 읽기 전에는 그리지 않는다
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    setSaved(load());
    setReady(true);
    // 다른 탭에서 비웠어도 이 탭의 염주가 함께 는다
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSaved(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const begin = (c: Challenge) => {
    const next: Saved = {
      kind: c.kind,
      startedAt: Date.now(),
      days: c.days,
      checked: [],
    };
    setSaved(next);
    persist(next);
  };

  // 하루 1회 — 오늘 자리에 알 하나를 꿴다
  const checkToday = () => {
    if (!saved) return;
    const key = dateKey(new Date());
    if (saved.checked.includes(key)) return;
    const next = { ...saved, checked: [...saved.checked, key].sort() };
    setSaved(next);
    persist(next);
  };

  // 도중에 내려놓기 — 한 번 묻고, 자취를 거둔다
  const letGo = async () => {
    const ok = await confirm(
      "이 비움을 내려놓으시겠습니까?",
      "지금까지 꿰어 온 알들은 흩어집니다.",
      { confirm: "내려놓다", cancel: "머무르다" }
    );
    if (!ok) return;
    setSaved(null);
    persist(null);
  };

  // 완주 뒤 — 다른 비움을 고르러 돌아간다
  const chooseAnother = () => {
    setSaved(null);
    persist(null);
  };

  const ch = saved
    ? (CHALLENGES.find((c) => c.kind === saved.kind) ?? null)
    : null;

  // 오늘이 몇째 날인가 — 자정 기준. 시계를 되돌려도 1일째 아래로는 안 내려간다
  const now = new Date();
  const todayKey = dateKey(now);
  const start = saved ? startOfDay(saved.startedAt) : null;
  const dayNo =
    saved && start
      ? Math.max(
          1,
          Math.floor(
            (startOfDay(now.getTime()).getTime() - start.getTime()) / DAY_MS
          ) + 1
        )
      : 1;
  // 완주 — 기간이 다 지났거나, 마지막 날의 알까지 꿰었을 때
  const finished =
    !!saved &&
    (dayNo > saved.days ||
      (dayNo === saved.days && saved.checked.includes(todayKey)));
  const todayChecked = !!saved && saved.checked.includes(todayKey);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-16 pt-8 text-center md:pt-12">
      <p className="rise text-xs tracking-[0.5em] text-gold-soft">空 · 비움</p>

      {/* ── 고르기 — 세 가지 비움 ── */}
      {ready && (!saved || !ch || !start) && (
        <>
          <p className="question-glow rise rise-d1 mt-7 font-serif text-xl font-light leading-[1.9] text-hanji">
            쥐고 있던 것을 하나 내려놓습니다.
            <br />
            <span className="text-gold-grad">덜어냄도 수행입니다.</span>
          </p>
          <p className="rise rise-d2 mt-6 text-[13px] leading-7 text-hanji-dim">
            셋 가운데 하나를 골라, 하루에 한 번 비웠음을 확인합니다.
            <br />
            하루를 놓쳐도 끊기지 않습니다 — 그 날은 빈 알로 남을 뿐입니다.
          </p>

          <div className="rise rise-d3 mt-10 grid w-full gap-4 sm:grid-cols-3">
            {CHALLENGES.map((c) => (
              <div
                key={c.kind}
                className="flex flex-col border border-ink-3 bg-ink-2/50 px-6 py-7"
              >
                <p className="text-xs tracking-[0.5em] text-hanji-faint">
                  {c.hanja}
                </p>
                <h2 className="mt-3 font-serif text-lg font-light tracking-[0.25em] text-hanji">
                  {c.name}
                </h2>
                <p className="mt-4 flex-1 break-keep text-[13px] font-light leading-7 text-hanji-dim">
                  {c.desc}
                </p>
                <p className="mt-5 text-[11px] tracking-[0.25em] text-gold-soft">
                  {durationLabel(c.days)} 동안
                </p>
                <button
                  onClick={() => begin(c)}
                  className="btn-obang mt-4 px-6 py-2.5 text-[12.5px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
                >
                  비우기 시작
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 진행 — 하루 한 알 ── */}
      {ready && saved && ch && start && !finished && (
        <section className="rise mt-8 flex w-full flex-col items-center">
          <p className="text-xs tracking-[0.5em] text-hanji-faint">{ch.hanja}</p>
          <h1 className="mt-3 font-serif text-2xl font-light tracking-[0.3em] text-hanji">
            {ch.name}
          </h1>
          <p className="mt-4 max-w-md break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
            {ch.desc}
          </p>

          <div className="mt-8 h-px w-full max-w-md bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

          <p className="mt-7 text-[12px] tracking-[0.15em] text-hanji-faint">
            {todayLabel(now)}
          </p>
          <p className="mt-2 text-[14.5px] tracking-[0.1em] text-hanji">
            <span className="tabular-nums text-gold">{dayNo}일째</span>
            <span className="text-hanji-dim"> · 총 {saved.days}일</span>
          </p>

          {/* 염주알 — 체크한 날들이 줄지어 꿰인다 */}
          <div className="mt-7">
            <Beads
              start={start}
              days={saved.days}
              checked={saved.checked}
              todayKey={todayKey}
              done={false}
            />
            <p className="mt-3 text-[11px] tracking-[0.15em] text-hanji-faint">
              알 하나가 하루입니다
            </p>
          </div>

          {/* 오늘의 체크 — 하루 한 번 */}
          {todayChecked ? (
            <p className="mt-9 text-[13.5px] font-light tracking-[0.08em] text-gold-soft">
              오늘의 알을 꿰었습니다 — 내일, 또 한 알.
            </p>
          ) : (
            <button
              onClick={checkToday}
              className="btn-obang mt-9 px-10 py-3.5 font-serif text-[15px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
            >
              오늘도 비웠습니다
            </button>
          )}

          {/* 오늘의 비움 — 한 줄 길잡이 */}
          <div className="mt-9 w-full max-w-md border border-ink-3 bg-ink-2/50 px-6 py-5">
            <p className="text-[11px] tracking-[0.34em] text-gold-soft">
              오늘의 비움
            </p>
            <p className="mt-3 break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
              {ch.hint}
            </p>
          </div>

          <button
            onClick={letGo}
            className="mt-11 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.15em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
          >
            이 비움을 내려놓다
          </button>
        </section>
      )}

      {/* ── 완주 — 비운 자리에 무엇이 남았는가 ── */}
      {ready && saved && ch && start && finished && (
        <section className="rise mt-10 flex w-full flex-col items-center">
          <p className="text-xs tracking-[0.5em] text-hanji-faint">{ch.hanja}</p>
          <h1 className="mt-3 font-serif text-2xl font-light tracking-[0.3em] text-hanji">
            {ch.name}
          </h1>

          <div className="mt-8">
            <Beads
              start={start}
              days={saved.days}
              checked={saved.checked}
              todayKey={todayKey}
              done
            />
          </div>

          <p className="question-glow rise rise-d1 mt-9 font-serif text-xl font-light leading-[1.9] text-hanji">
            {withEul(durationLabel(saved.days))} 비웠습니다 —
            <br />
            <span className="text-gold-grad">
              비운 자리에 무엇이 남았습니까?
            </span>
          </p>
          <p className="rise rise-d2 mt-5 text-[12.5px] leading-6 text-hanji-dim">
            {saved.days}일 가운데{" "}
            <span className="tabular-nums text-hanji">
              {Math.min(saved.checked.length, saved.days)}일
            </span>
            을 비웠습니다. 빈 알도 그대로 두십시오 — 그 또한 자취입니다.
          </p>

          <div className="rise rise-d2 mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => begin(ch)}
              className="btn-obang px-8 py-3 text-[13px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
            >
              다시 비우다
            </button>
            <button
              onClick={chooseAnother}
              className="border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              다른 비움 고르기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
