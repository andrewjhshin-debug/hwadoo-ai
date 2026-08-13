"use client";

// ────────────────────────────────────────────────────────────────
// 내 도량(道場) — 나의 걸음 · 얻은 자리(뱃지) · 이달의 마음 · 색상 모드
// · 차 한 잔 · 지난 화두 · 내가 던진 화두 · 로그인 정보.
// 웹·모바일 공통. 사이드바/하단 탭의 '내 도량'을 누르면 이 화면으로 온다.
// 각 구획은 균질한 간격으로, 로그인 정보는 맨 아래.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "firebase/auth";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import { ADMIN_UID, CONTACT_EMAIL, DONATION_URL } from "@/lib/config";
import { formatDate, loadStore, type Session } from "@/lib/store";
import { flatQuestion, sessionQuestion } from "@/lib/hwadu";
import { fetchMyThrownStats, type ThrownStat } from "@/lib/thrown";
import { loadVisits, visitDayKey } from "@/components/VisitLedger";
import {
  Person,
  Teacup,
  Book,
  Dharmachakra,
  SeonMaster,
  Banga,
  Bojagi,
  Breath,
  Jukbi,
  Lotus,
  LotusPond,
  Mandala,
  Moktak,
} from "@/components/icons";

const THEME_KEY = "hwadoo-theme";
// 내가 던진 화두 — 화두 던지기(my-hwadu) 화면이 남기는 브라우저 서랍과 같은 열쇠
const THROWN_KEY = "hwadoo-thrown-v1";
type MyThrown = { question: string; thrownAt: number; id?: string };

// 걸음 — 얻은 자리. 육도(六道)에서 빌린 이름, 회향 수로 오른다.
const BADGES = [
  { hanja: "人", name: "인간도", full: "人間道", need: 1, cond: "첫 회향" },
  { hanja: "修", name: "수라도", full: "修羅道", need: 5, cond: "회향 5 이상" },
  { hanja: "天", name: "천상도", full: "天上道", need: 15, cond: "회향 15 이상" },
] as const;

// 이달의 마음 — 이번 달의 걸음을 로컬 기록으로 센 것
type MonthReport = {
  returned: number; // 이번 달 회향 수
  days: number; // 이번 달 함께한 날수 (접속일 ∪ 화두를 품고 있던 날, 고유한 날짜 수)
  chars: number; // 이번 달 남긴 단상·회향의 글자 수
};

// 품어온 시간 — 화두마다 받은 날부터 회향(또는 지금)까지 품은 일수
type HeldItem = {
  key: string;
  from: string; // 받은 날, "3.2" 꼴
  receivedAt: number; // 받은 시각 — 최신순 정렬의 기준
  question: string; // 화두 질문 전문 — 줄이지 않는다
  days: number; // 품은 일수 (최소 1일)
  current: boolean; // 지금 품는 중인가
};

// 서비스 격자 — href 가 없는 것은 아직 문이 열리지 않은 자리 (눌러도 이동하지 않는다)
type ServiceItem = {
  href?: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  soon?: boolean;
};

const SERVICES: ServiceItem[] = [
  { href: "/", label: "뜰", Icon: Lotus },
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/masters", label: "선지식", Icon: SeonMaster },
  { href: "/room", label: "사유의 방", Icon: Banga },
  { href: "/my-hwadu", label: "화두 던지기", Icon: Jukbi },
  { href: "/mandala", label: "만다라", Icon: Mandala },
  { href: "/empty", label: "비움", Icon: Moktak },
  { href: "/gathering", label: "차담회", Icon: Person },
  { href: "/community", label: "연지원", Icon: LotusPond },
  { href: "/archive", label: "지난 화두", Icon: Book },
  { href: "/tea", label: "차 한 잔", Icon: Teacup },
  { label: "굿즈", Icon: Bojagi, soon: true },
  { href: "/breath", label: "호흡 명상", Icon: Breath, soon: true },
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [light, setLight] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [daysWith, setDaysWith] = useState(0);
  const [teaOpen, setTeaOpen] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [report, setReport] = useState<MonthReport | null>(null);
  const [held, setHeld] = useState<HeldItem[]>([]);
  const [myThrown, setMyThrown] = useState<MyThrown[] | null>(null);
  const [thrownStats, setThrownStats] = useState<Map<
    string,
    ThrownStat
  > | null>(null);

  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");

    // 나의 걸음 — 받은 화두 수(지금 든 것·내려놓은 것까지),
    // 회향해 지난 화두에 남은 수, 함께한 날수
    const s = loadStore();
    const past = s.history.length;
    setJournalCount(past);
    // store.received 가 참값이지만, 이 값이 없던 시절의 기록도 있어
    // 눈에 보이는 수보다 작아지지 않게 받쳐 준다
    setReceivedCount(Math.max(s.received, past + (s.current ? 1 : 0)));

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const sessions: Session[] = [
      ...s.history,
      ...(s.current ? [s.current] : []),
    ];
    const visits = loadVisits();

    // 구간 [from, to] 의 날짜들을 "YYYY-MM-DD"로 모은다 — 끝날도 빠뜨리지 않는다
    const addHeldDays = (from: number, to: number, into: Set<string>) => {
      if (from > to) return;
      for (let t = from; t <= to; t += DAY) into.add(visitDayKey(t));
      into.add(visitDayKey(to));
    };

    // 함께한 날 — 실제 접속일(발자국 장부) ∪ 화두를 품고 있던 날.
    // 옛날은 방문 기록이 없으니 품은 날수로 보완한다
    const allDays = new Set<string>(visits);
    for (const sess of sessions) {
      addHeldDays(sess.receivedAt, sess.journalAt ?? now, allDays);
    }
    setDaysWith(allDays.size);

    // ── 이달의 마음 — 이번 달의 걸음을 로컬에서 센다 ──
    const base = new Date();
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1).getTime();
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1).getTime();
    const inMonth = (t: number) => t >= monthStart && t < monthEnd;

    // 이번 달 회향 수 — 회향 시각이 이번 달인 기록
    // (아주 옛 기록에는 회향 시각이 없어, 받은 시각으로 받쳐 준다)
    const returned = s.history.filter((h) =>
      inMonth(h.journalAt ?? h.receivedAt)
    ).length;

    // 이번 달 함께한 날수 — 이번 달의 접속일 ∪ 이번 달 화두를 품고 있던 날
    const monthDays = new Set<string>();
    const monthPrefix = visitDayKey(monthStart).slice(0, 8); // "YYYY-MM-"
    for (const v of visits) {
      if (v.startsWith(monthPrefix)) monthDays.add(v);
    }
    for (const sess of sessions) {
      addHeldDays(
        Math.max(sess.receivedAt, monthStart),
        Math.min(sess.journalAt ?? now, monthEnd - 1),
        monthDays
      );
    }

    // 남긴 글자 수 — 이번 달 회향의 글과 단상, 지금 든 화두의 단상
    let chars = 0;
    for (const h of s.history) {
      if (inMonth(h.journalAt ?? h.receivedAt)) {
        chars += (h.journal ?? "").length + (h.notes ?? "").length;
      }
    }
    if (s.current?.notes) chars += s.current.notes.length;

    setReport({ returned, days: monthDays.size, chars });

    // ── 품어온 시간 — 화두마다 품은 일수, 오래 품은 순(내림차순) ──
    const toHeld = (sess: Session, isCurrent: boolean): HeldItem => {
      const end = sess.journalAt ?? now;
      const d = new Date(sess.receivedAt);
      return {
        key: `${sess.hwaduId}-${sess.receivedAt}${isCurrent ? "-now" : ""}`,
        from: `${d.getMonth() + 1}.${d.getDate()}`,
        receivedAt: sess.receivedAt,
        question: flatQuestion(sessionQuestion(sess)),
        days: Math.max(1, Math.floor((end - sess.receivedAt) / DAY)),
        current: isCurrent,
      };
    };
    setHeld(
      [
        ...s.history.map((h) => toHeld(h, false)),
        ...(s.current ? [toHeld(s.current, true)] : []),
      ].sort((a, b) => b.receivedAt - a.receivedAt)
    );
  }, []);

  // 내가 던진 화두 — 브라우저 서랍을 읽고, 서버에서 걸음(승인·받은 수)을 살핀다
  useEffect(() => {
    let list: MyThrown[] = [];
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(THROWN_KEY) ?? "[]"
      );
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
    setMyThrown(list);

    const ids = list
      .map((t) => t.id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (ids.length === 0) return;
    fetchMyThrownStats(ids)
      .then((stats) =>
        setThrownStats(new Map(stats.map((st) => [st.sourceId, st])))
      )
      .catch(() => {
        // 조회 실패 — 걸음 표기 없이 목록만 보인다
      });
  }, []);

  const setTheme = (toLight: boolean) => {
    setLight(toLight);
    document.documentElement.dataset.theme = toLight ? "light" : "";
    window.localStorage.setItem(THEME_KEY, toLight ? "light" : "dark");
  };

  // 구글 로그인 — 팝업이 막히거나 닫히면 그 까닭을 알린다
  const handleLogin = async () => {
    setLoginBusy(true);
    setLoginError("");
    try {
      await loginWithGoogle();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/popup-blocked") {
        setLoginError(
          "팝업이 막혔습니다. 브라우저에서 팝업을 허용하거나, 기본 브라우저로 열어 주십시오."
        );
      } else if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setLoginError("로그인 창이 닫혔습니다. 다시 시도해 주십시오.");
      } else {
        setLoginError("로그인하지 못했습니다. 잠시 뒤 다시 시도해 주십시오.");
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const sectionGap = "mt-11";

  // 품어온 시간 한 줄 — "3.2~ · {질문 전문} · 108일" (여러 줄 허용, 줄이지 않는다)
  const heldRow = (h: HeldItem) => (
    <li key={h.key} className="break-keep text-[12px] leading-6 text-hanji-dim">
      <span className="text-hanji-faint">{h.from}~</span>
      {" · "}
      <span className="text-hanji">{h.question}</span>
      <span className="text-hanji-faint">
        {" · "}
        {h.current ? <>지금 품는 중 · {h.days}일째</> : <>{h.days}일</>}
      </span>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 · 내 도량
      </h1>

      {/* ── 나의 걸음 — 화두 수 · 함께한 날. 받은 화두를 누르면 서고로 ── */}
      <section className="rise mt-9">
        <div className="flex gap-4">
          <Link
            href="/archive"
            className="flex-1 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-6 text-center transition-colors hover:border-gold/40"
          >
            <p className="font-serif text-[40px] font-light leading-none text-gold">
              {receivedCount}
            </p>
            <p className="mt-2.5 text-[11px] tracking-[0.2em] text-hanji-faint">
              받은 화두
            </p>
          </Link>
          <div className="flex-1 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-6 text-center">
            <p className="font-serif text-[40px] font-light leading-none text-gold">
              {daysWith}
              <span className="ml-1 text-[18px] text-hanji-dim">일</span>
            </p>
            <p className="mt-2.5 text-[11px] tracking-[0.2em] text-hanji-faint">
              화두와 함께
            </p>
          </div>
        </div>
      </section>

      {/* ── 걸음 — 얻은 자리: 육도에서 빌린 이름, 회향이 쌓이면 오른다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          걸음 — 얻은 자리
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-3 pt-5">
          {BADGES.map((b) => {
            const earned = journalCount >= b.need;
            return (
              <div
                key={b.name}
                className={`flex flex-col items-center gap-2 rounded-[12px] px-1 py-4 text-center ${
                  earned ? "" : "opacity-40"
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                    earned
                      ? "border-gold/60 bg-gold/5"
                      : "border-dashed border-ink-3 bg-ink-2/40"
                  }`}
                >
                  <span
                    className={`font-serif text-[22px] font-light leading-none ${
                      earned ? "text-gold" : "text-hanji-faint"
                    }`}
                  >
                    {b.hanja}
                  </span>
                </span>
                <span
                  className={`text-[11px] leading-tight ${
                    earned ? "text-hanji" : "text-hanji-dim"
                  }`}
                >
                  {b.name}
                </span>
                <span className="text-[10px] leading-tight tracking-wider text-hanji-faint">
                  {earned ? b.full : b.cond}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 이달의 마음 — 이번 달의 걸음을 로컬 기록으로 센다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          이달의 마음
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          {!report ||
          (report.returned === 0 &&
            report.days === 0 &&
            report.chars === 0 &&
            held.length === 0) ? (
            <p className="text-[13px] leading-7 text-hanji-dim">
              이번 달의 걸음이 아직 없습니다.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { n: report.returned, unit: "", label: "회향" },
                  { n: report.days, unit: "일", label: "함께한 날" },
                  { n: report.chars, unit: "자", label: "남긴 단상" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-[12px] border border-ink-3 bg-ink-2/40 px-2 py-4 text-center"
                  >
                    <p className="font-serif text-[24px] font-light leading-none text-gold">
                      {c.n}
                      {c.unit && (
                        <span className="ml-0.5 text-[13px] text-hanji-dim">
                          {c.unit}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-[10px] tracking-[0.15em] text-hanji-faint">
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>
              {/* 품어온 시간 — 화두마다 품은 일수, 오래 품은 순. 질문은 전문 그대로 */}
              {held.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] tracking-[0.2em] text-hanji-faint">
                    품어온 시간
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {held.slice(0, 5).map(heldRow)}
                  </ul>
                  {held.length > 5 && (
                    <details className="mt-2.5">
                      <summary className="cursor-pointer text-[11px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim">
                        모두 보기 · {held.length - 5}
                      </summary>
                      <ul className="mt-2.5 space-y-2">
                        {held.slice(5).map(heldRow)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 서비스 — 당근처럼 도량의 모든 것 한눈에 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">서비스</p>
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-ink-3 pt-5">
          {SERVICES.map((s) => {
            const itemCls =
              "relative flex flex-col items-center gap-2 rounded-[12px] px-1 py-3 text-center transition-colors hover:bg-gold/5";
            const inner = (
              <>
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-ink-3 bg-ink-2/50">
                  <s.Icon className="h-5 w-5 text-gold-soft" />
                  {s.soon && (
                    <span className="absolute -right-1.5 -top-1 rounded-full border border-gold/40 bg-ink px-1.5 py-px text-[9px] leading-tight text-gold-soft">
                      곧
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-tight text-hanji-dim">
                  {s.label}
                </span>
              </>
            );
            return s.href ? (
              <Link key={s.href + s.label} href={s.href} className={itemCls}>
                {inner}
              </Link>
            ) : (
              // 아직 문이 열리지 않은 자리 — 눌러도 이동하지 않는다
              <button
                key={s.label}
                type="button"
                className={`${itemCls} cursor-default`}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 색상 모드 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">색상 모드</p>
        <div className="mt-4 flex gap-3 border-t border-ink-3 pt-5">
          <button
            onClick={() => setTheme(false)}
            className={`flex-1 rounded-[10px] border px-4 py-3 text-[13px] tracking-[0.15em] transition-colors ${
              !light
                ? "border-gold/60 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            밤 — 어둠 위의 금
          </button>
          <button
            onClick={() => setTheme(true)}
            className={`flex-1 rounded-[10px] border px-4 py-3 text-[13px] tracking-[0.15em] transition-colors ${
              light
                ? "border-gold/60 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            낮 — 한지 위의 먹
          </button>
        </div>
      </section>

      {/* ── 차 한 잔 — 바로 송금 ── */}
      <section className={`rise rise-d2 ${sectionGap}`}>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
          <Teacup className="h-[15px] w-[15px] text-gold-soft" />
          차 한 잔
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <p className="text-[13px] leading-7 text-hanji-dim">
            이 도량은 늘 무료입니다. 다만 마음에 머물렀다면,
            <br />차 한 잔 값으로 등불을 보태 주실 수 있습니다.
          </p>
          {DONATION_URL ? (
            !teaOpen ? (
              // 펼치기 전 — 담백한 버튼만 (QR을 바로 드러내지 않는다)
              <button
                onClick={() => setTeaOpen(true)}
                className="mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                <Teacup className="h-4 w-4 text-gold-soft" />
                차 한 잔 보태기
              </button>
            ) : (
            <>
              {/* 모바일 — 누르면 바로 카카오페이 */}
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-obang mt-5 inline-flex items-center gap-2.5 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 sm:hidden"
              >
                <Teacup className="h-4 w-4 text-gold-soft" />
                차 한 잔 보내기
              </a>
              {/* PC — 폰 카메라로 찍는 QR (카카오페이 링크는 웹에서 바로 안 열림) */}
              <div className="mt-5 hidden flex-col items-start gap-3 sm:flex">
                <div className="rounded-md bg-[#EDE6D4] p-3">
                  <QRCodeSVG
                    value={DONATION_URL}
                    size={116}
                    bgColor="#EDE6D4"
                    fgColor="#14110D"
                    level="M"
                  />
                </div>
                <p className="text-[11px] leading-5 text-hanji-faint">
                  휴대폰 카메라로 QR을 비추면 카카오페이가 열립니다.
                </p>
              </div>
            </>
            )
          ) : (
            <p className="mt-5 text-xs tracking-widest text-hanji-faint">
              찻자리를 마련하고 있습니다
            </p>
          )}
        </div>
      </section>

      {/* ── 지난 화두 ── */}
      <section className={`rise rise-d2 ${sectionGap}`}>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
          <Book className="h-[15px] w-[15px] text-gold-soft" />
          지난 화두
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <p className="text-[13px] leading-7 text-hanji-dim">
            시간을 다 품고 회향한 화두들이 이곳에 남습니다.
          </p>
          <Link
            href="/archive"
            className="mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            <Book className="h-4 w-4 text-gold-soft" />
            지난 화두 보기 · {journalCount}
          </Link>
        </div>
      </section>

      {/* ── 내가 던진 화두 — 물음의 걸음: 살펴보는 중 / 수행자 N인 ── */}
      {myThrown !== null && (
        <section className={`rise rise-d2 ${sectionGap}`}>
          <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
            <Jukbi className="h-[15px] w-[15px] text-gold-soft" />
            내가 던진 화두
          </p>
          <div className="mt-4 border-t border-ink-3 pt-5">
            {myThrown.length === 0 ? (
              <>
                <p className="text-[13px] leading-7 text-hanji-dim">
                  아직 던진 물음이 없습니다. 이번에는 그대가 물을 차례입니다.
                </p>
                <Link
                  href="/my-hwadu"
                  className="mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  <Jukbi className="h-4 w-4 text-gold-soft" />
                  화두 던지러 가기
                </Link>
              </>
            ) : (
              <ul className="space-y-5">
                {myThrown.map((t) => {
                  const stat = t.id ? thrownStats?.get(t.id) : undefined;
                  return (
                    <li
                      key={t.thrownAt}
                      className="border-l border-gold/25 pl-4"
                    >
                      <p className="break-keep text-sm font-light leading-7 text-hanji-dim">
                        {t.question}
                      </p>
                      <p className="mt-1.5 text-[11px] tracking-wider text-hanji-faint">
                        {formatDate(t.thrownAt)} 던짐
                        {t.id &&
                          (stat?.status === "approved" ? (
                            <span className="text-gold-soft">
                              {" "}
                              · 수행자 {stat.seen}인이 받았습니다
                            </span>
                          ) : (
                            <> · 도량에서 살펴보는 중</>
                          ))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── 로그인 정보 — 맨 아래 ── */}
      <section className={`rise rise-d3 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          로그인 정보
        </p>

        {user === undefined ? (
          // 인증이 확정될 때까지 — 이 구획만 기다린다 (화면 전체를 비우지 않는다)
          <div className="mt-4 border-t border-ink-3 pt-5">
            <p className="text-[13px] leading-6 text-hanji-faint">
              불러오는 중…
            </p>
          </div>
        ) : user ? (
          <>
            <div className="mt-4 flex items-center gap-4 border-t border-ink-3 pt-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 text-hanji-dim">
                <Person className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-lg font-light text-hanji">
                  {user.displayName ?? "수행자"}님
                </p>
                <p className="mt-1 truncate text-[13px] text-hanji-dim">
                  {user.email ?? "이메일 없음"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-4">
              {user.uid === ADMIN_UID && (
                <Link
                  href="/admin"
                  className="text-[12px] tracking-widest text-gold-soft transition-colors hover:text-gold"
                >
                  뒷방(관리)
                </Link>
              )}
              <button
                onClick={() => logout()}
                className="rounded-[10px] border border-ink-3 px-6 py-2.5 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 border-t border-ink-3 pt-5">
            <p className="text-[13px] leading-6 text-hanji-dim">
              아직 로그인하지 않았습니다.
              <br />
              로그인하면 지난 화두들이 계정에 모여 — 기기가 바뀌어도 이어집니다.
            </p>
            <button
              onClick={handleLogin}
              disabled={loginBusy}
              className="btn-obang mt-5 flex items-center gap-2.5 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Person className="h-4 w-4" />
              {loginBusy ? "여는 중…" : "구글로 로그인"}
            </button>
            {loginError && (
              <p className="mt-3 text-[12px] leading-6 text-vermilion">
                {loginError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── 도량 안내 — 손안에서는 아래 띠가 없으므로 여기에 모아 둔다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          도량 안내
        </p>
        <div className="mt-4 flex flex-col border-t border-ink-3 pt-3">
          {[
            { href: "/about", label: "서비스 소개" },
            { href: "/ganhwaseon", label: "간화선이란?" },
            { href: "/terms", label: "이용약관" },
            { href: "/privacy", label: "개인정보처리방침" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-[10px] px-2 py-3 text-[13px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
            >
              {l.label}
              <span className="text-hanji-faint">›</span>
            </Link>
          ))}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center justify-between rounded-[10px] px-2 py-3 text-[13px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
          >
            문의
            <span className="text-[11px] text-hanji-faint">{CONTACT_EMAIL}</span>
          </a>
        </div>
        <p className="mt-3 px-2 text-[10px] tracking-widest text-hanji-faint">
          © {new Date().getFullYear()} 화두 · 물음은 오래된 것, 답은 그대의 것
        </p>
      </section>

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}
