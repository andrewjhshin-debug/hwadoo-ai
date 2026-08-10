"use client";

// ─────────────────────────────────────────────────────────────
// 뒷방 — 도량의 관리실. ADMIN_UID 계정으로만 열린다.
// 세 칸 구조:
//  왼쪽   기본 30칙 (코드 — 열람용)
//  가운데 내가 더한 화두 (추가·수정·삭제, 화두+출처)
//  오른쪽 승인 대기 (던져진 화두) + 선방 관리
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ADMIN_UID } from "@/lib/config";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import {
  adminAddHwadu,
  adminUpdateHwadu,
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
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [thrown, setThrown] = useState<ThrownItem[]>([]);
  const [publicList, setPublicList] = useState<PublicHwadu[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 추가 폼
  const [newQ, setNewQ] = useState("");
  const [newSrc, setNewSrc] = useState("");
  // 수정 상태
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editSrc, setEditSrc] = useState("");

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
      setError("불러오지 못했습니다 — Firestore 규칙을 확인하세요.");
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

  if (user === undefined) return null;

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
  const adminHwadu = publicList.filter((p) => p.origin === "admin");
  const approvedThrown = publicList.filter((p) => p.origin !== "admin");
  const poolTotal = HWADU_BANK.length + publicList.length;

  const colHead = "text-xs tracking-[0.4em] text-gold-soft";
  const smallBtn =
    "border px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors disabled:opacity-40";

  return (
    <div className="w-full flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 뒷방 · 관리자
      </h1>
      <p className="mt-3 text-center text-xs text-hanji-faint">
        랜덤 풀 {poolTotal}칙 = 기본 {HWADU_BANK.length} + 더한 것{" "}
        {adminHwadu.length} + 승인된 던짐 {approvedThrown.length}
      </p>
      {error && (
        <p className="mt-3 text-center text-xs text-vermilion">{error}</p>
      )}

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 lg:grid-cols-3">
        {/* ── 왼쪽: 기본 30칙 ── */}
        <section>
          <h2 className={colHead}>기본 화두 · {HWADU_BANK.length}칙</h2>
          <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
            어록이 붙어 있어 코드에 삽니다. 수정은 Claude에게.
          </p>
          <ul className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-2">
            {HWADU_BANK.map((h, i) => (
              <li key={h.id} className="border-l border-ink-3 pl-3">
                <p className="text-[12.5px] text-hanji-dim">
                  <span className="text-hanji-faint">{i + 1}.</span> {h.title}
                  {h.hanja && (
                    <span className="text-hanji-faint"> · {h.hanja}</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-hanji-faint">
                  {h.question.replace(/\n/g, " ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 가운데: 내가 더한 화두 ── */}
        <section>
          <h2 className={colHead}>내가 더한 화두 · {adminHwadu.length}</h2>
          {/* 추가 폼 */}
          <div className="mt-4 border border-ink-3 bg-ink-2/60 p-4">
            <textarea
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              rows={3}
              placeholder="화두 — 줄바꿈 그대로 화면에 나갑니다"
              className="journal-area !text-sm"
            />
            <input
              value={newSrc}
              onChange={(e) => setNewSrc(e.target.value)}
              placeholder="출처 (선택) — 예: 벽암록 제6칙"
              className="mt-2 w-full border-b border-ink-3 bg-transparent pb-1.5 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
            />
            <button
              disabled={!newQ.trim() || busy === "add"}
              onClick={() =>
                act("add", async () => {
                  await adminAddHwadu(newQ.trim(), newSrc.trim());
                  setNewQ("");
                  setNewSrc("");
                })
              }
              className={`${smallBtn} mt-3 border-gold/50 text-gold hover:bg-gold/10`}
            >
              풀에 더하기
            </button>
          </div>
          {/* 목록 */}
          <ul className="mt-4 max-h-[48vh] space-y-4 overflow-y-auto pr-2">
            {adminHwadu.map((p) => (
              <li key={p.id} className="border-l border-gold/25 pl-3">
                {editId === p.id ? (
                  <>
                    <textarea
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                      rows={3}
                      className="journal-area !text-sm"
                    />
                    <input
                      value={editSrc}
                      onChange={(e) => setEditSrc(e.target.value)}
                      placeholder="출처 (선택)"
                      className="mt-1 w-full border-b border-ink-3 bg-transparent pb-1 text-[12px] text-hanji-dim outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={!editQ.trim() || busy === p.id}
                        onClick={() =>
                          act(p.id, async () => {
                            await adminUpdateHwadu(
                              p.id,
                              editQ.trim(),
                              editSrc.trim()
                            );
                            setEditId(null);
                          })
                        }
                        className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className={`${smallBtn} border-ink-3 text-hanji-faint hover:text-hanji-dim`}
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-line text-[13px] leading-6 text-hanji-dim">
                      {p.question}
                    </p>
                    {p.source && (
                      <p className="mt-0.5 text-[11px] text-hanji-faint">
                        출처 — {p.source}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setEditId(p.id);
                          setEditQ(p.question);
                          setEditSrc(p.source ?? "");
                        }}
                        className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
                      >
                        수정
                      </button>
                      <button
                        disabled={busy === p.id}
                        onClick={() => act(p.id, () => deletePublicHwadu(p.id))}
                        className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ── 오른쪽: 승인 대기 + 승인된 던짐 ── */}
        <section>
          <h2 className={colHead}>승인 대기 · {pending.length}</h2>
          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-hanji-faint">
              기다리는 화두가 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pending.map((t) => (
                <li key={t.id} className="border border-ink-3 bg-ink-2/60 p-4">
                  <p className="whitespace-pre-line text-[13.5px] font-light leading-7 text-hanji">
                    {t.question}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy === t.id}
                      onClick={() => act(t.id, () => approveThrown(t))}
                      className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
                    >
                      승인
                    </button>
                    <button
                      disabled={busy === t.id}
                      onClick={() => act(t.id, () => rejectThrown(t.id))}
                      className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-hanji`}
                    >
                      거절
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
            승인되어 풀에 있는 던짐 · {approvedThrown.length}
          </h3>
          <ul className="mt-3 max-h-[24vh] space-y-2 overflow-y-auto pr-2">
            {approvedThrown.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 border-l border-gold/25 pl-3"
              >
                <p className="text-[12px] leading-6 text-hanji-dim">
                  {p.question.replace(/\s+/g, " ")}
                </p>
                <button
                  disabled={busy === p.id}
                  onClick={() => act(p.id, () => deletePublicHwadu(p.id))}
                  className="shrink-0 text-[11px] text-hanji-faint transition-colors hover:text-vermilion"
                >
                  내리기
                </button>
              </li>
            ))}
          </ul>

          {handled.length > 0 && (
            <>
              <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
                처리 내역
              </h3>
              <ul className="mt-3 max-h-[18vh] space-y-1.5 overflow-y-auto pr-2">
                {handled.map((t) => (
                  <li key={t.id} className="text-[11px] leading-5 text-hanji-faint">
                    <span
                      className={
                        t.status === "approved"
                          ? "text-gold-soft"
                          : "text-vermilion/70"
                      }
                    >
                      [{t.status === "approved" ? "승인" : "거절"}]
                    </span>{" "}
                    {t.question.replace(/\s+/g, " ").slice(0, 30)}
                    {t.question.length > 30 && "…"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* 선방 관리 */}
      <section className="mx-auto mt-14 max-w-6xl border-t border-ink-3 pt-10">
        <h2 className={colHead}>선방에 걸린 회향 · {posts.length}</h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-hanji-faint">아직 없습니다.</p>
        ) : (
          <ul className="mt-5 grid gap-5 md:grid-cols-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 border-l border-gold/25 pl-4"
              >
                <div>
                  <p className="text-[11.5px] leading-5 text-gold-soft">
                    {p.question.replace(/\s+/g, " ").slice(0, 40)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] font-light leading-6 text-hanji-dim">
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
    </div>
  );
}
