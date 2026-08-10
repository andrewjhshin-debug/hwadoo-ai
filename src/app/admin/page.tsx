"use client";

// ─────────────────────────────────────────────────────────────
// 뒷방 — 도량의 관리실. ADMIN_UID 계정으로만 열린다.
// 네 구획(탭): 성인 화두 | 학생·어린이 화두 | 내가 더한 화두 | 승인 대기
// 아래에 선방 관리.
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
import { HWADU_BANK, type Hwadu } from "@/lib/hwadu";

type Tab = "adult" | "student" | "mine" | "pending";

// 기본 화두 열람 줄
function BankRow({ h, i }: { h: Hwadu; i: number }) {
  return (
    <li className="border-l border-ink-3 pl-3">
      <p className="text-[12.5px] text-hanji-dim">
        <span className="text-hanji-faint">{i + 1}.</span> {h.title}
        {h.hanja && <span className="text-hanji-faint"> · {h.hanja}</span>}
      </p>
      <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-5 text-hanji-faint">
        {h.question}
      </p>
    </li>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("pending");
  const [thrown, setThrown] = useState<ThrownItem[]>([]);
  const [publicList, setPublicList] = useState<PublicHwadu[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 추가/수정 폼
  const [newQ, setNewQ] = useState("");
  const [newSrc, setNewSrc] = useState("");
  const [newAudience, setNewAudience] = useState<"adult" | "student">("adult");
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editSrc, setEditSrc] = useState("");

  useEffect(() => watchAuth(setUser), []);
  const isAdmin = user?.uid === ADMIN_UID;

  const refresh = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([fetchThrown(), fetchPublicHwadu()]);
      setThrown(t);
      setPublicList(p);
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

  const adultBank = HWADU_BANK.filter((h) => h.audience !== "student");
  const studentOnly = HWADU_BANK.filter((h) => h.audience === "student");
  const studentClassics = HWADU_BANK.filter((h) => h.forStudent);
  const pending = thrown.filter((t) => t.status === "pending");
  const handled = thrown.filter((t) => t.status !== "pending");
  const adminHwadu = publicList.filter((p) => p.origin === "admin");
  const approvedThrown = publicList.filter((p) => p.origin !== "admin");

  // 실제 랜덤 풀에 섞이는 성인/학생 총계 — 기본 화두(HWADU_BANK) + 추가된 화두(publicList)
  const publicAdult = publicList.filter((p) => (p.audience ?? "adult") === "adult");
  const publicStudent = publicList.filter((p) => p.audience === "student");
  const adultTotal = adultBank.length + publicAdult.length;
  const studentTotal =
    studentOnly.length + studentClassics.length + publicStudent.length;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "adult", label: "성인 화두", count: adultTotal },
    {
      key: "student",
      label: "학생·어린이 화두",
      count: studentTotal,
    },
    { key: "mine", label: "내가 더한 화두", count: adminHwadu.length },
    { key: "pending", label: "승인 대기", count: pending.length },
  ];

  const smallBtn =
    "border px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors disabled:opacity-40";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 뒷방 · 관리자
      </h1>
      <p className="mt-3 text-center text-xs text-hanji-faint">
        랜덤 풀 — 성인 {adultTotal}칙 · 학생 {studentTotal}칙
      </p>
      {error && (
        <p className="mt-3 text-center text-xs text-vermilion">{error}</p>
      )}

      {/* 네 구획 탭 */}
      <nav className="mt-8 flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border px-4 py-2 text-xs tracking-[0.12em] transition-colors ${
              tab === t.key
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {t.label} <span className="opacity-70">{t.count}</span>
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {/* ── 성인 화두 ── */}
        {tab === "adult" && (
          <section>
            <p className="text-[11px] leading-5 text-hanji-faint">
              어록이 붙어 있어 코드에 삽니다. 추가·수정은 Claude에게 말하면
              됩니다.
            </p>
            <ul className="mt-4 space-y-4">
              {adultBank.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} />
              ))}
            </ul>
          </section>
        )}

        {/* ── 학생·어린이 화두 ── */}
        {tab === "student" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              학생 전용 · {studentOnly.length}
            </h3>
            <ul className="mt-3 space-y-4">
              {studentOnly.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} />
              ))}
            </ul>
            <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
              학생에게도 열리는 고전 · {studentClassics.length}
            </h3>
            <ul className="mt-3 space-y-4">
              {studentClassics.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} />
              ))}
            </ul>
          </section>
        )}

        {/* ── 내가 더한 화두 ── */}
        {tab === "mine" && (
          <section>
            <div className="border border-ink-3 bg-ink-2/60 p-4">
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
              {/* 어느 랜덤 풀에 뿌릴지 */}
              <div className="mt-3 inline-flex rounded-full border border-ink-3 p-1 text-[11px]">
                {(
                  [
                    { key: "adult", label: "성인 랜덤" },
                    { key: "student", label: "학생·어린이 랜덤" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setNewAudience(o.key)}
                    className={`rounded-full px-3.5 py-1.5 tracking-wide transition-colors ${
                      newAudience === o.key
                        ? "bg-gold font-medium text-ink"
                        : "text-hanji-faint"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div>
                <button
                  disabled={!newQ.trim() || busy === "add"}
                  onClick={() =>
                    act("add", async () => {
                      await adminAddHwadu(newQ.trim(), newSrc.trim(), newAudience);
                      setNewQ("");
                      setNewSrc("");
                    })
                  }
                  className={`${smallBtn} mt-3 border-gold/50 text-gold hover:bg-gold/10`}
                >
                  {newAudience === "student" ? "학생·어린이" : "성인"} 풀에 더하기
                </button>
              </div>
            </div>
            <ul className="mt-6 space-y-5">
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
                        <span className="mr-2 rounded-full border border-ink-3 px-2 py-0.5 text-[10px] text-gold-soft">
                          {p.audience === "student" ? "학생·어린이" : "성인"}
                        </span>
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
                          onClick={() =>
                            act(p.id, () => deletePublicHwadu(p.id))
                          }
                          className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {adminHwadu.length === 0 && (
                <p className="text-sm text-hanji-faint">아직 없습니다.</p>
              )}
            </ul>
          </section>
        )}

        {/* ── 승인 대기 ── */}
        {tab === "pending" && (
          <section>
            {pending.length === 0 ? (
              <p className="text-sm text-hanji-faint">
                기다리는 화두가 없습니다.
              </p>
            ) : (
              <ul className="space-y-4">
                {pending.map((t) => (
                  <li
                    key={t.id}
                    className="border border-ink-3 bg-ink-2/60 p-4"
                  >
                    <p className="whitespace-pre-line text-[13.5px] font-light leading-7 text-hanji">
                      {t.question}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busy === t.id}
                        onClick={() => act(t.id, () => approveThrown(t))}
                        className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
                      >
                        승인 — 풀에 합류
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

            <h3 className="mt-9 text-[11px] tracking-[0.3em] text-hanji-faint">
              승인되어 풀에 있는 던짐 · {approvedThrown.length}
            </h3>
            <ul className="mt-3 space-y-2">
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
                <h3 className="mt-9 text-[11px] tracking-[0.3em] text-hanji-faint">
                  처리 내역
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {handled.map((t) => (
                    <li
                      key={t.id}
                      className="text-[11px] leading-5 text-hanji-faint"
                    >
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
        )}
      </div>

      <p className="mt-14 border-t border-ink-3 pt-8 text-center text-[11px] leading-6 text-hanji-faint">
        연지원(커뮤니티)의 글·댓글은 각 글에서 직접 내릴 수 있습니다.
      </p>
    </div>
  );
}
