"use client";

// ────────────────────────────────────────────────────────────────
// 내 도량(道場) — 나의 걸음 · 색상 모드 · 차 한 잔 · 지난 화두 · 로그인 정보.
// 웹·모바일 공통. 사이드바/하단 탭의 '내 도량'을 누르면 이 화면으로 온다.
// 각 구획은 균질한 간격으로, 로그인 정보는 맨 아래.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "firebase/auth";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import { ADMIN_UID, CONTACT_EMAIL, DONATION_URL } from "@/lib/config";
import { loadStore } from "@/lib/store";
import {
  Person,
  Teacup,
  Book,
  Dharmachakra,
  SeonMaster,
  Banga,
  Jukbi,
  Mandala,
  Lantern,
  Lotus,
} from "@/components/icons";

const THEME_KEY = "hwadoo-theme";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [light, setLight] = useState(false);
  const [received, setReceived] = useState(0);
  const [daysWith, setDaysWith] = useState(0);
  const [teaOpen, setTeaOpen] = useState(false);

  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");

    // 나의 걸음 — 시간을 다 보내고 지난 화두에 남은 개수, 화두와 함께한 날수
    const s = loadStore();
    setReceived(s.history.length);
    const times = [
      ...s.history.map((h) => h.receivedAt),
      ...(s.current ? [s.current.receivedAt] : []),
    ];
    if (times.length > 0) {
      const first = Math.min(...times);
      const days = Math.floor((Date.now() - first) / (24 * 60 * 60 * 1000)) + 1;
      setDaysWith(days);
    }
  }, []);

  const setTheme = (toLight: boolean) => {
    setLight(toLight);
    document.documentElement.dataset.theme = toLight ? "light" : "";
    window.localStorage.setItem(THEME_KEY, toLight ? "light" : "dark");
  };

  if (user === undefined) return null;

  const sectionGap = "mt-11";

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 · 내 도량
      </h1>

      {/* ── 나의 걸음 — 화두 수 · 함께한 날 ── */}
      <section className="rise mt-9">
        <div className="flex gap-4">
          <div className="flex-1 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-6 text-center">
            <p className="font-serif text-[40px] font-light leading-none text-gold">
              {received}
            </p>
            <p className="mt-2.5 text-[11px] tracking-[0.2em] text-hanji-faint">
              받은 화두
            </p>
          </div>
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

      {/* ── 서비스 — 당근처럼 도량의 모든 것 한눈에 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">서비스</p>
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-ink-3 pt-5">
          {[
            { href: "/", label: "뜰", Icon: Lotus },
            { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
            { href: "/masters", label: "선지식", Icon: SeonMaster },
            { href: "/room", label: "사유의 방", Icon: Banga },
            { href: "/my-hwadu", label: "화두 던지기", Icon: Jukbi },
            { href: "/mandala", label: "만다라", Icon: Mandala },
            { href: "/gathering", label: "명상 모임", Icon: Person },
            { href: "/community", label: "연지원", Icon: Lantern },
            { href: "/archive", label: "지난 화두", Icon: Book },
            { href: "/tea", label: "차 한 잔", Icon: Teacup },
            { href: "/breath", label: "호흡 명상", Icon: Lotus, soon: true },
          ].map((s) => (
            <Link
              key={s.href + s.label}
              href={s.href}
              className="relative flex flex-col items-center gap-2 rounded-[12px] px-1 py-3 text-center transition-colors hover:bg-gold/5"
            >
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
            </Link>
          ))}
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
            지난 화두 보기 · {received}
          </Link>
        </div>
      </section>

      {/* ── 로그인 정보 — 맨 아래 ── */}
      <section className={`rise rise-d3 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          로그인 정보
        </p>

        {user ? (
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
              onClick={() => loginWithGoogle().catch(() => {})}
              className="btn-obang mt-5 flex items-center gap-2.5 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              <Person className="h-4 w-4" />
              구글로 로그인
            </button>
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
