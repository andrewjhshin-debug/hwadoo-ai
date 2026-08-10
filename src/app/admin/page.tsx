"use client";

// ─────────────────────────────────────────────────────────────
// 관리자 — 도량의 뒷방. ADMIN_UID 계정으로 로그인해야만 열린다.
// · 던져진 화두 승인/거절
// · 승인된 화두(모든 사용자 랜덤 풀) 관리
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ADMIN_UID } from "@/lib/config";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import {
  approveThrown,
  deletePublicHwadu,
  fetchPublicHwadu,
  fetchThrown,
  rejectThrown,
  type PublicHwadu,
  type ThrownItem,
} from "@/lib/thrown";
import { adminDeletePost, fetchPosts, type Post } from "@/lib/community";
import { HWADU_BANK } from "@/lib/hwadu";

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = 확인 중
  const [thrown, setThrown] = useState<ThrownItem[]>([]);
  const [publicList, setPublicList] = useState<PublicHwadu[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchAuth(setUser), []);

  const isAdmin = user?.uid === ADMIN_UID;

  const refresh = useCallback(async () => {
    try {
      const [t, p, ps] = await Promise.all([
        fetchThrown(),
        fetchPublicHwadu(),
        fetchPosts(),
      ]);
      setThrown(t);
      setPublicList(p);
      setPosts(ps);
      setError(null);
    } catch {
      setError("불러오지 못했습니다 — Firestore 규칙이 갱신되었는지 확인하세요.");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
    } catch {
      setError("작업이 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  // 확인 중
  if (user === undefined) return null;

  // 관리자가 아니다 — 조용히 닫힌 문
  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="rise font-serif text-lg font-light text-hanji">
          이 문은 열리지 않습니다.
        </p>
        {!user && (
          <button
            onClick={() => loginWithGoogle().catch(() => {})}
            className="rise rise-d1 mt-8 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.2em] text-hanji-dim transition-colors hover:text-hanji"
          >
            열쇠가 있다면 — 로그인
          </button>
        )}
      </div>
    );
  }

  const pending = thrown.filter((t) => t.status === "pending");
  const handled = thrown.filter((t) => t.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 뒷방 · 관리자
      </h1>
      <p className="mt-4 text-center text-xs text-hanji-faint">
        기본 화두 {HWADU_BANK.length}칙 (코드) + 승인된 화두{" "}
        {publicList.length}칙 (서버) = 랜덤 풀 {HWADU_BANK.length + publicList.length}칙
      </p>
      {error && (
        <p className="mt-4 text-center text-xs text-vermilion">{error}</p>
      )}

      {/* 승인 대기 */}
      <section className="mt-12">
        <h2 className="text-xs tracking-[0.4em] text-hanji-faint">
          승인 대기 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-hanji-faint">
            기다리는 화두가 없습니다.
          </p>
        ) : (
          <ul className="mt-5 space-y-5">
            {pending.map((t) => (
              <li key={t.id} className="border border-ink-3 bg-ink-2/60 p-5">
                <p className="whitespace-pre-line font-serif text-[15px] font-light leading-8 text-hanji">
                  {t.question}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    disabled={busy === t.id}
                    onClick={() => act(t.id, () => approveThrown(t))}
                    className="border border-gold/50 px-5 py-2 text-xs tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
                  >
                    승인 — 풀에 합류
                  </button>
                  <button
                    disabled={busy === t.id}
                    onClick={() => act(t.id, () => rejectThrown(t.id))}
                    className="border border-ink-3 px-5 py-2 text-xs tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-hanji disabled:opacity-40"
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 승인된 화두 — 랜덤 풀 */}
      <section className="mt-14 border-t border-ink-3 pt-10">
        <h2 className="text-xs tracking-[0.4em] text-hanji-faint">
          승인된 화두 — 모든 사용자에게 나감 ({publicList.length})
        </h2>
        {publicList.length === 0 ? (
          <p className="mt-4 text-sm text-hanji-faint">아직 없습니다.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {publicList.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 border-l border-gold/25 pl-4"
              >
                <p className="whitespace-pre-line text-sm font-light leading-7 text-hanji-dim">
                  {p.question}
                </p>
                <button
                  disabled={busy === p.id}
                  onClick={() =>
                    act(p.id, () => deletePublicHwadu(p.id))
                  }
                  className="shrink-0 text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion disabled:opacity-40"
                >
                  내리기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 선방 관리 */}
      <section className="mt-14 border-t border-ink-3 pt-10">
        <h2 className="text-xs tracking-[0.4em] text-hanji-faint">
          선방에 걸린 회향 ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-hanji-faint">아직 없습니다.</p>
        ) : (
          <ul className="mt-5 space-y-5">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 border-l border-gold/25 pl-4"
              >
                <div>
                  <p className="text-[12px] leading-6 text-gold-soft">
                    {p.question.replace(/\s+/g, " ").slice(0, 40)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm font-light leading-7 text-hanji-dim">
                    {p.answer}
                  </p>
                  <p className="mt-1 text-[11px] text-hanji-faint">
                    합장 {p.hapjang}
                  </p>
                </div>
                <button
                  disabled={busy === p.id}
                  onClick={() => act(p.id, () => adminDeletePost(p.id))}
                  className="shrink-0 text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion disabled:opacity-40"
                >
                  내리기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 처리 내역 */}
      {handled.length > 0 && (
        <section className="mt-14 border-t border-ink-3 pt-10">
          <h2 className="text-xs tracking-[0.4em] text-hanji-faint">
            처리 내역
          </h2>
          <ul className="mt-5 space-y-2">
            {handled.map((t) => (
              <li key={t.id} className="text-xs leading-6 text-hanji-faint">
                <span
                  className={
                    t.status === "approved" ? "text-gold-soft" : "text-vermilion/70"
                  }
                >
                  [{t.status === "approved" ? "승인" : "거절"}]
                </span>{" "}
                {t.question.replace(/\s+/g, " ").slice(0, 40)}
                {t.question.length > 40 && "…"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-14 text-center text-[11px] leading-6 text-hanji-faint">
        기본 화두 30칙의 추가·수정은 Claude에게 말하면 된다.
        <br />
        (선사 어록이 붙는 화두는 검수가 필요해 코드에 둔다)
      </p>
    </div>
  );
}
