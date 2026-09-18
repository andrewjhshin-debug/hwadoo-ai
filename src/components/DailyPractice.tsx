"use client";

// ─────────────────────────────────────────────────────────────
// 오늘 하루 — 내 도량 맨 위에 놓이는 판.
//
// 나무가 크게 앉아 있고, 옆에 지금 자리와 다음 자리까지의 걸음.
// 아래로 이어 온 날(精進)과 오늘의 세 가지.
//
// 매일 들어올 이유를 만들되, 놓쳤다고 야단치지 않는다 —
// 끊긴 날을 세지 않고 이어 온 날만 센다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Dudu from "@/components/Dudu";
import { FACE_BY_ID, loadMe, ME_EVENT, NAME_MAX, setName } from "@/lib/me";
import { nextRealm, realmOf, realmProgress } from "@/lib/realm";
import {
  addMerit,
  loadMerit,
  MERIT_EVENT,
  MERIT_VALUE,
  rankByNeed,
  stageOf,
} from "@/lib/merit";
import Info from "@/components/Info";
import { loadStore } from "@/lib/store";
import {
  allDone,
  claimDaily,
  DAILY_EVENT,
  doneOf,
  loadDaily,
  missionsOf,
  nextKnot,
  streakOf,
  type DailyBook,
} from "@/lib/daily";

// 이어 온 날의 불꽃 — 하루라도 이었으면 켠다
function Flame({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden>
      <defs>
        <linearGradient id="dp_flame" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="22">
          <stop offset="0" stopColor="#f2789f" />
          <stop offset="0.55" stopColor="#e8973a" />
          <stop offset="1" stopColor="#dda01c" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5c.6 3.1-1.2 4.3-2.6 5.7-1.6 1.6-2.9 3.2-2.9 5.8A5.5 5.5 0 0 0 12 19.5a5.5 5.5 0 0 0 5.5-5.5c0-2.4-1.1-3.7-2.2-5-.5.9-1.2 1.4-2 1.5.6-2.9-.3-6-1.3-8z"
        fill={lit ? "url(#dp_flame)" : "var(--color-ink-3)"}
      />
      {lit && (
        <path
          d="M12 11.5c.4 1.5-.6 2-1.2 2.7-.5.6-.8 1.2-.8 1.9a2 2 0 0 0 4 0c0-1-.6-1.7-1.2-2.4-.3.4-.6.6-1 .6.3-1.1-.1-2.1-.6-2.8z"
          fill="rgba(255,255,255,0.65)"
        />
      )}
    </svg>
  );
}

export default function DailyPractice() {
  // 장부는 브라우저 서랍에 있다 — 서버에서는 읽을 수 없으므로
  // 붙고 난 뒤에 한 번 읽는다(서버·브라우저의 첫 그림이 어긋나지 않게).
  const [book, setBook] = useState<DailyBook | null>(null);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [me, setMe] = useState<ReturnType<typeof loadMe>>(null);
  const [fade, setFade] = useState({ cut: 0, gap: 0 });
  // 법명 고쳐 쓰기
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const m = loadMerit();
    setTotal(m.total);
    setFade({ cut: m.lastFade ?? 0, gap: m.lastGap ?? 0 });
    setStreak(streakOf());
    setBook(loadDaily());
    setMe(loadMe());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(MERIT_EVENT, refresh);
    window.addEventListener(DAILY_EVENT, refresh);
    window.addEventListener(ME_EVENT, refresh);
    return () => {
      window.removeEventListener(MERIT_EVENT, refresh);
      window.removeEventListener(DAILY_EVENT, refresh);
      window.removeEventListener(ME_EVENT, refresh);
    };
  }, [refresh]);

  // 아직 서랍을 못 읽었다 — 자리만 잡아 둔다(화면이 튀지 않게)
  if (!book) return <div className="h-[320px]" aria-hidden />;

  const returned = loadStore().history.length;
  // 자리는 공덕만으로 안 오른다 — 회향한 화두 수도 본다.
  // 여기만 rankOf(공덕) 였어서, 뜰·도량 카드·승급 연출은 「동자」인데
  // 내 도량 맨 위 배지만 「사미」로 떴다. 문턱 수가 같아 회향 조건에
  // 걸린 사람만 갈리는 탓에 오래 안 보였다.
  const rank = rankByNeed(realmOf(total, returned).need);
  const stage = stageOf(total);
  // 계급은 육도다 — 나무 자리는 그 곁에 작게 붙는다
  // 자리는 공덕만으로 오르지 않는다 — 회향한 화두 수도 같이 본다
  const realm = realmOf(total, returned);
  const up = nextRealm(total, returned);
  const pct = Math.round(realmProgress(total, returned) * 100);

  const saveName = () => {
    const bad = setName(draft);
    setNameErr(bad);
    if (!bad) setEditing(false);
  };

  const missions = missionsOf(book.day);
  const done = missions.filter((m) => doneOf(m, book) >= m.need).length;
  const finished = allDone(book);
  const knot = nextKnot(streak);

  // 오늘 상으로 실제 얼마가 붙었나 — 장부가 참이다(없으면 null)
  const claimed = book?.got?.daily ?? null;

  const claim = () => {
    // 「공덕 54 받기」라 해 놓고 장부에는 108(배수 있으면 그 이상)이 붙었다.
    // 상의 값은 공덕 장부가 쥔다(MERIT_VALUE.daily). 화면에는 **실제로
    // 붙은 값**을 그대로 적는다 — 천장에 걸려 0 이면 0 이라고 말한다.
    if (!claimDaily()) return;
    addMerit("daily");
    refresh(); // 붙은 값은 장부에서 다시 읽는다 — 화면 상태로 들고 있지 않는다
  };

  return (
    <section className="rise">
      {/* ── 나무 — 지금 어디까지 왔나 ── */}
      <div className="rounded-[16px] border border-ink-3 bg-ink-2/50 px-5 py-5">
        <div className="flex items-center gap-4">
          {/* 내가 고른 얼굴 — 없으면 자리 그림 */}
          {me ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={FACE_BY_ID[me.face].src}
              alt=""
              className="h-[92px] w-[92px] shrink-0 rounded-full"
            />
          ) : (
            <Dudu stage={stage} uid="doryang" className="h-[92px] w-[92px] shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            {/* 법명 — 눌러 고친다 */}
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  maxLength={NAME_MAX}
                  autoFocus
                  aria-label="법명"
                  className="min-w-0 flex-1 rounded-lg border border-gold/45 bg-ink/50 px-2.5 py-1.5 font-serif text-[17px] text-hanji outline-none focus:border-gold"
                />
                <button
                  onClick={saveName}
                  className="shrink-0 rounded-full border border-gold/50 px-3 py-1.5 text-[11.5px] text-gold transition-colors hover:bg-gold/15"
                >
                  확인
                </button>
              </div>
            ) : (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <button
                  onClick={() => {
                    setDraft(me?.name ?? "");
                    setNameErr(null);
                    setEditing(true);
                  }}
                  title="눌러서 고치기"
                  className="font-serif text-[20px] leading-none text-hanji underline decoration-dotted decoration-hanji-faint/50 underline-offset-[5px] transition-colors hover:text-gold hover:decoration-gold/60"
                >
                  {me ? me.name : "나무"}
                </button>

              </p>
            )}
            {nameErr && <p className="mt-1 text-[11px] text-vermilion">{nameErr}</p>}

            <p className="mt-1.5 break-keep text-[11.5px] leading-5 text-hanji-faint">
              {rank.say}
            </p>
            <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-hanji-faint">
              <span className="min-w-0 flex-1 truncate">
                {up
                  ? up.needMore > 0 && up.left === 0
                    ? `${rankByNeed(up.to.need).name}까지 화두 ${up.needMore}개`
                    : `${rankByNeed(up.to.need).name}까지 공덕 ${up.left.toLocaleString("ko-KR")}` +
                      (up.needMore > 0 ? ` · 화두 ${up.needMore}개` : "")
                  : "가장 높은 자리"}
              </span>
              <Info title="자리">
                자리는 <b className="text-hanji">공덕</b>과 <b className="text-hanji">회향한 화두 수</b>,
                둘 다 넘겨야 오릅니다.
                <br />
                발길이 뜸해지면 공덕이 조금씩 흐려집니다.
              </Info>
            </p>
          </div>

          {/* 지금 내 자리 — 프로필 오른쪽에 크게 세운다.
              한동안 여기에 육도(獄·鬼·畜…)를 걸었다. 사다리가 둘이라
              이름 옆의 「童 · 동자」와 나란히 서서 어느 쪽이 내 자리인지
              알 수 없었고, 무엇보다 **사람에게 지옥도·아귀도라고 부르고
              있었다.** 육도는 오르는 계단이 아니라 벗어나야 할 굴레다.
              자리를 재는 셈은 그대로 두고 이름만 바꿔 건다(rankByNeed). */}
          <Link
            href="/rank"
            title={`${rank.name} · 랭킹으로`}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-full font-serif text-[22px] leading-none transition-colors ${
                realm.id === "cheonsang"
                  ? "bg-gold text-ink"
                  : "border border-gold/35 text-gold-soft hover:border-gold/70"
              }`}
            >
              {rank.hanja}
            </span>
            <span className="text-[10.5px] leading-none text-hanji-faint">
              {rank.name}
            </span>
          </Link>
        </div>

        {/* ── 퇴전 ── 쉬었는데 아무 말도 안 하면 숫자가 줄어든 까닭을 모른다 */}
        {fade.cut > 0 && (
          <p className="mt-3.5 break-keep rounded-[10px] border border-vermilion/35 bg-vermilion/[0.07] px-3.5 py-2.5 text-[11.5px] leading-5 text-hanji-dim">
            {fade.gap}일 쉬는 동안 공덕 {fade.cut.toLocaleString("ko-KR")}이 흐려졌어요.
            오늘 한 가지만 해도 멈춥니다.
            <Info title="退轉 · 흐려지는 까닭" className="ml-1.5">
              하루는 그냥 넘어갑니다. <b className="text-hanji">그 뒤로는</b> 하루에
              4%씩 흐려지고, 오래 쉴수록 더 흐려져요(최대 25%).
              <br />
              들어와서 뭐라도 하나 하면 그날로 멈춥니다.
              <br />
              <br />
              공덕이 흐려지는 자리는 여기 하나뿐입니다. <b className="text-hanji">
              남에게 회향해도 내 공덕은 줄지 않아요</b> — 촛불로 촛불을 붙여도
              내 불은 안 꺼지니까요.
            </Info>
          </p>
        )}

        {/* ── 이어 온 날 ── */}
        <div className="mt-4 flex items-center gap-2 border-t border-ink-3 pt-3.5">
          <Flame lit={streak > 0} />
          <p className="min-w-0 flex-1 break-keep text-[12px] leading-5 text-hanji-dim">
            <span className="font-serif text-[16px] text-hanji">{streak}</span>
            <span className="text-hanji-faint">일 이어 왔어요</span>
            {knot && (
              <span className="text-hanji-faint">
                {" "}
                · {knot.left}일 더 하면 {knot.at}일
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── 오늘의 세 가지 ── */}
      <div className="mt-3 rounded-[16px] border border-ink-3 bg-ink-2/50 px-5 py-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">오늘의 세 가지</p>
          <p className="text-[11px] text-hanji-faint">
            <span className={done === missions.length ? "text-gold" : "text-hanji-dim"}>
              {done}
            </span>
            {" / "}
            {missions.length}
          </p>
        </div>

        <ul className="mt-3.5 flex flex-col gap-2.5 border-t border-ink-3 pt-4">
          {missions.map((m) => {
            const n = doneOf(m, book);
            const ok = n >= m.need;
            return (
              <li key={m.id}>
                <Link
                  href={m.href}
                  className="group flex items-center gap-3"
                  aria-label={`${m.label} — ${ok ? "마침" : `${n}/${m.need}`}`}
                >
                  <span
                    aria-hidden
                    className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border transition-colors ${
                      ok ? "border-gold bg-gold" : "border-hanji-faint"
                    }`}
                  >
                    {ok && (
                      <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]">
                        <path
                          d="M2.5 6.3 5 8.8l4.5-5"
                          fill="none"
                          stroke="var(--color-ink)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13px] leading-5 transition-colors ${
                        ok ? "text-hanji-faint" : "text-hanji group-hover:text-gold"
                      }`}
                    >
                      {m.label}
                    </span>
                    {!ok && m.need > 1 && (
                      <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-ink-3">
                        <span
                          className="block h-full rounded-full bg-gold/60 transition-[width] duration-300"
                          style={{ width: `${(n / m.need) * 100}%` }}
                        />
                      </span>
                    )}
                  </span>
                  {!ok && (
                    <span className="shrink-0 text-[11px] tabular-nums text-hanji-faint">
                      {m.need > 1 ? `${n}/${m.need}` : "하러 가기"}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 다 마쳤으면 — 반 바퀴를 상으로 */}
        {finished && (
          <div className="mt-4 rounded-[12px] border border-gold/40 bg-gold/10 px-4 py-3.5 text-center">
            {book.claimed ? (
              <p className="break-keep text-[12px] leading-6 text-hanji-dim">
                {/* 붙은 값은 화면 상태가 아니라 **하루 장부**에서 읽는다.
                    상태에만 두었더니 상을 받고 다른 방에 갔다 오면 0 으로
                    되돌아가, 이미 108 을 받은 사람에게 「안 붙었습니다」라고
                    거짓을 말했다. 칸이 아예 없으면(옛 장부) 단정하지 않는다. */}
                {claimed === null
                  ? "오늘의 세 가지를 마쳤어요. 내일 또 만나요."
                  : claimed > 0
                    ? `공덕 ${claimed.toLocaleString("ko-KR")}이 쌓였어요. 오늘 몫은 여기까지 — 내일 또 만나요.`
                    : "오늘의 세 가지를 마쳤어요. 오늘 몫이 이미 차서 공덕은 안 붙었습니다."}
              </p>
            ) : (
              <>
                <p className="break-keep text-[12.5px] leading-6 text-hanji">
                  오늘의 세 가지를 마쳤습니다.
                </p>
                <button
                  onClick={claim}
                  className="mt-2.5 rounded-full border border-gold/60 px-5 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/15"
                >
                  공덕 {MERIT_VALUE.daily} 받기
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
