"use client";

// ────────────────────────────────────────────────────────────────
// 설정 — 로그인 정보 · 색상 모드 · 로그아웃. 웹·모바일 공통.
// 사이드바(또는 모바일 메뉴)에서 내 이름을 누르면 이 화면으로 온다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import { ADMIN_UID } from "@/lib/config";
import { Person } from "@/components/icons";

const THEME_KEY = "hwadoo-theme";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [light, setLight] = useState(false);

  useEffect(() => watchAuth(setUser), []);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  const setTheme = (toLight: boolean) => {
    setLight(toLight);
    document.documentElement.dataset.theme = toLight ? "light" : "";
    window.localStorage.setItem(THEME_KEY, toLight ? "light" : "dark");
  };

  if (user === undefined) return null;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 · 내 도량
      </h1>

      {/* ── 로그인 정보 ── */}
      <section className="rise mt-10">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          로그인 정보
        </p>

        {user ? (
          <div className="mt-4 flex items-center gap-4 border-t border-ink-3 pt-5">
            {/* 프로필 */}
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

      {/* ── 색상 모드 ── */}
      <section className="rise rise-d1 mt-12">
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

      {/* ── 계정 ── */}
      {user && (
        <section className="rise rise-d2 mt-12">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">계정</p>
          <div className="mt-4 flex flex-col gap-4 border-t border-ink-3 pt-5">
            {user.uid === ADMIN_UID && (
              <Link
                href="/admin"
                className="text-[13px] tracking-widest text-gold-soft transition-colors hover:text-gold"
              >
                뒷방(관리) 열기
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="w-fit rounded-[10px] border border-ink-3 px-6 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
            >
              로그아웃
            </button>
          </div>
        </section>
      )}

      <div className="mt-14 text-center">
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
