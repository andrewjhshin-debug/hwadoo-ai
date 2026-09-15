"use client";

// ─────────────────────────────────────────────────────────────
// 순위 — 어제 가장 많이 정진한 백 사람, 반야심경을 가장 빨리 외운 백 사람.
//
// 어제를 먼저 보여 준다. 오늘은 아직 안 끝났으니 순위라 할 수 없다.
// 이름은 법명이라 부담이 없다 — 진 사람이 창피할 일이 없어야
// 다음 날 또 온다.
//
// 등수 위에 육도(六道)를 얹는다. 등수 하나는 그냥 숫자지만 도(道)는 자리다.
// 어제의 순위로만 매기니 매일 갈리고, 갈리니까 매일 들어온다.
// 한 칸 위까지 몇 계단·공덕 얼마인지를 숫자로 박아 둔다 — 그게 손을 움직인다.
//
// 판을 열 때 내 오늘치를 한 번 올린다. 순위판에 들어와야만 오르는 것은
// 아니고(startRankSync 를 어디든 붙이면 알아서 오른다), 여기서는 방금 한
// 수행이 곧바로 반영되게 해 둔다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  fetchRank,
  fetchSutraRank,
  pushMyRank,
  rankDay,
  type RankBoard,
  type SutraBoard,
} from "@/lib/rank";
import {
  nextRealm,
  realmOf,
  realmProgress,
  REALMS,
  type RealmColor,
} from "@/lib/realm";
import { loadMerit } from "@/lib/merit";
import { loadStore } from "@/lib/store";

type Tab = "merit" | "sutra";

/** 두 판이 같은 줄로 그려지게 눌러 담은 한 자리 */
type Seat = { rank: number; name: string; me: boolean; text: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "merit", label: "오늘의 정진" },
  { id: "sutra", label: "외우기" },
];

/** 위 세 자리에 놓는 한 글자 */
const MARK = ["一", "二", "三"];

/**
 * 육도의 색 — 토큰 이름을 클래스로 편다.
 * 문자열을 이어 붙여 만들면 테일윈드가 못 찾아 색이 빠진다. 그래서 통짜로 적는다.
 */
const TONE: Record<RealmColor, string> = {
  gold: "text-gold",
  "gold-soft": "text-gold-soft",
  vermilion: "text-vermilion",
  hanji: "text-hanji",
  "hanji-dim": "text-hanji-dim",
  "hanji-faint": "text-hanji-faint",
};

const won = (n: number) => n.toLocaleString("ko-KR");

function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export default function RankPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("merit");
  // 1 = 어제, 0 = 오늘
  const [back, setBack] = useState(1);
  const [merit, setMerit] = useState<RankBoard | null>(null);
  const [sutra, setSutra] = useState<SutraBoard | null>(null);
  const [busy, setBusy] = useState(true);
  // undefined = 로그인 여부를 아직 모른다. 정해지기 전에 물으면
  // 토큰이 안 실려 '내 자리'가 빈 채로 온다.
  const [who, setWho] = useState<string | null | undefined>(undefined);
  // 내 쌓은 공덕 — 육도는 남과 견주는 것이 아니라 이 숫자로 정해진다
  const [merit0, setMerit0] = useState(0);
  const [returned0, setReturned0] = useState(0);
  const pushed = useRef(false);

  // 날짜와 서랍을 읽는 일은 붙고 난 뒤에 — 서버가 그린 첫 그림과 어긋나지 않게
  useEffect(() => {
    setReady(true);
    setMerit0(loadMerit().total);
    setReturned0(loadStore().history.length);
  }, []);
  useEffect(() => onAuthStateChanged(auth, (u) => setWho(u?.uid ?? null)), []);

  useEffect(() => {
    if (who === undefined) return;
    let alive = true;
    setBusy(true);

    const run = async () => {
      // 방금 한 수행이 곧바로 판에 오르게 — 한 번만 올린다
      if (who && !pushed.current) {
        pushed.current = true;
        await pushMyRank();
      }
      if (!alive) return;
      if (tab === "merit") {
        const b = await fetchRank(rankDay(back));
        if (alive) setMerit(b);
      } else {
        const b = await fetchSutraRank();
        if (alive) setSutra(b);
      }
      if (alive) setBusy(false);
    };

    void run();
    return () => {
      alive = false;
    };
  }, [who, tab, back]);

  if (!ready) return <div className="h-[70vh]" aria-hidden />;

  // 두 판을 한 꼴로 눌러 둔다 — 그려 내는 자리에서 갈래를 다시 따지지 않게
  const board = tab === "merit" ? merit : sutra;
  const rows: Seat[] =
    tab === "merit"
      ? (merit?.rows ?? []).map((r) => ({
          rank: r.rank,
          name: r.name,
          me: r.me,
          text: won(r.merit),
        }))
      : (sutra?.rows ?? []).map((r) => ({
          rank: r.rank,
          name: r.name,
          me: r.me,
          text: clock(r.seconds),
        }));

  const my = tab === "merit" ? merit?.mine : sutra?.mine;
  const mine: Seat | null = !my
    ? null
    : {
        rank: my.rank,
        name: my.name,
        me: true,
        text: "merit" in my ? won(my.merit) : clock(my.seconds),
      };
  const inList = rows.some((r) => r.me);

  // ── 육도 — 남과 견주는 게 아니라 내가 쌓은 공덕이 곧 자리다 ──
  // 자리는 공덕만으로 오르지 않는다 — 회향한 화두 수도 같이 본다.
  // 서랍은 effect 에서 읽는다(서버 첫 그림과 어긋나지 않게).
  const myRealm = realmOf(merit0, returned0);
  const step = nextRealm(merit0, returned0);
  const climbed = realmProgress(merit0, returned0);

  const people = board?.people ?? 0;

  // 한 칸 오르는 데 남은 공덕
  const gap = step ? `공덕 ${won(step.left)}` : null;

  const say = mine
    ? `${won(people)}명 가운데 내 자리`
    : tab === "sutra"
      ? "반야심경을 가장 빨리 외운 백 사람"
      : back === 1
        ? "어제 가장 많이 정진한 백 사람"
        : "오늘 가장 많이 정진한 백 사람";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <p className="rise text-[12px] tracking-[0.35em] text-hanji-faint">精進 · 순위</p>
      <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none tabular-nums text-hanji">
        {mine ? mine.rank : won(people)}
        <span className="ml-1 align-middle text-[20px] text-hanji-faint">
          {mine ? "등" : "명"}
        </span>
      </p>
      <p className="rise rise-d1 mt-2.5 break-keep text-center text-[12.5px] leading-5 text-hanji-faint">
        {say}
      </p>

      {/* 알약 세그먼트 — 고른 쪽만 먹으로 채운다 */}
      <div className="rise rise-d2 mt-7 inline-flex rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-full px-5 py-2 text-[11.5px] tracking-widest transition-colors ${
              tab === t.id ? "bg-hanji text-ink" : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 어제 · 오늘 */}
      {tab === "merit" && (
        <div className="rise rise-d2 mt-4 flex items-center gap-3 text-[11.5px]">
          {[1, 0].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBack(n)}
              aria-pressed={back === n}
              className={`transition-colors ${
                back === n ? "text-gold" : "text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              {n === 1 ? "어제" : "오늘"}
            </button>
          ))}
        </div>
      )}

      {/* 내 도(道) — 등수보다 이 자리가 먼저 눈에 든다 */}
      {true && (
        <div className="rise rise-d3 mt-7 w-full">
          <div className="flex items-center gap-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-serif text-[24px] leading-none ${
                myRealm.id === "cheonsang"
                  ? "bg-gold text-ink"
                  : `border border-ink-3 ${TONE[myRealm.color]}`
              }`}
            >
              {myRealm.mark}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-serif text-[20px] leading-none ${TONE[myRealm.color]}`}>
                {myRealm.name}
                <span className="ml-2 align-middle text-[11px] tracking-[0.2em] text-hanji-faint">
                  {myRealm.hanja}
                </span>
              </p>
              <p className="mt-2 break-keep text-[12px] leading-4 text-hanji-dim">
                {myRealm.say}
              </p>
            </div>
          </div>

          <div className="mt-2.5 h-[4px] overflow-hidden rounded-full bg-ink-3">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-500"
              style={{ width: `${climbed * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[12px] leading-5 text-hanji-faint">
            {step ? (
              <>
                <span className="text-gold">{step.to.name}</span>까지 {gap}
              </>
            ) : (
              "가장 높은 자리입니다 — 쉬면 가장 빨리 흐려집니다"
            )}
          </p>
        </div>
      )}

      <div className="mt-8 w-full">
        {busy && !board ? (
          <div className="h-40" aria-hidden />
        ) : !board ? (
          <p className="mt-10 text-center text-[13px] text-hanji-faint">
            판을 여는 데 실패했어요. 잠시 뒤에 다시 열어 주세요.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-10 text-center text-[13px] text-hanji-faint">
            {tab === "sutra" ? "아직 외운 이가 없어요." : "아직 오른 이가 없어요."}
          </p>
        ) : (
          <>
            {/* 육도 사다리 — 어디까지 왔고 다음 칸이 얼마인지 */}
            <div className="rise mb-6 rounded-[14px] border border-ink-3 bg-ink-2/50 px-3 py-3.5">
              <p className="px-1 pb-3 text-[10.5px] tracking-[0.25em] text-hanji-faint">
                六道 · 공덕이 곧 자리
              </p>
              <div className="flex gap-1">
                {REALMS.map((r) => {
                  const on = myRealm.id === r.id;
                  const got = merit0 >= r.need;
                  return (
                    <div
                      key={r.id}
                      className={`flex-1 rounded-[10px] px-0.5 py-2 text-center ${
                        on ? "bg-gold/10 ring-1 ring-gold/40" : ""
                      }`}
                    >
                      <span
                        className={`font-serif text-[17px] leading-none ${
                          on ? "text-gold" : got ? TONE[r.color] : "text-hanji-faint opacity-45"
                        }`}
                      >
                        {r.mark}
                      </span>
                      <p className="mt-1.5 text-[9.5px] leading-none tabular-nums text-hanji-faint">
                        {r.need === 0 ? "시작" : won(r.need)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pb-2 text-[10.5px] tracking-[0.25em] text-hanji-faint">
              <span>법명</span>
              <span>{tab === "merit" ? "공덕" : "시간"}</span>
            </div>

            {/* 위 셋 — 금으로 크게 */}
            <ul className="rise flex flex-col gap-2.5">
              {rows.slice(0, 3).map((r, i) => (
                <li
                  key={r.rank}
                  className={`flex items-center gap-4 rounded-[14px] border bg-gold/10 px-5 py-4 ${
                    r.me ? "border-gold/60" : "border-gold/30"
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold font-serif text-[15px] leading-none text-ink">
                    {MARK[i]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[19px] leading-none text-hanji">
                    {r.name}
                  </span>
                  {r.me && <Me />}
                  <span className="font-serif text-[20px] leading-none tabular-nums text-gold">
                    {r.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* 나머지 — 담백한 줄 */}
            {rows.length > 3 && (
              <ul className="rise rise-d1 mt-4 flex flex-col">
                {rows.slice(3).map((r) => (
                  <li
                    key={r.rank}
                    className="flex items-center gap-3 border-b border-ink-3 px-1 py-3 last:border-b-0"
                  >
                    <span className="w-7 shrink-0 text-right text-[12px] tabular-nums text-hanji-faint">
                      {r.rank}
                    </span>
                      <span
                      className={`min-w-0 flex-1 truncate text-[14px] ${
                        r.me ? "text-gold" : "text-hanji-dim"
                      }`}
                    >
                      {r.name}
                    </span>
                    {r.me && <Me />}
                    <span className="text-[13px] tabular-nums text-hanji">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* 백 등 밖이면 내 자리를 따로 붙여 둔다 */}
            {mine && !inList && (
              <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-3.5">
                <span className="w-7 shrink-0 text-right text-[12px] tabular-nums text-gold">
                  {mine.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-hanji">
                  {mine.name}
                </span>
                <Me />
                <span className="text-[13px] tabular-nums text-hanji">{mine.text}</span>
              </div>
            )}

            {!mine && (
              <p className="mt-6 text-center text-[11.5px] leading-5 text-hanji-faint">
                {tab === "sutra"
                  ? "반야심경을 도움 없이 외워 치면 이 판에 올라요."
                  : "오늘 정진하면 이 판에 올라요."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 내 자리임을 알리는 한 글자 */
function Me() {
  return (
    <span className="shrink-0 rounded-full bg-gold px-1.5 py-1 font-serif text-[10px] leading-none text-ink">
      我
    </span>
  );
}
