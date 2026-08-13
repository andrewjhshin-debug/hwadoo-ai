"use client";

// ─────────────────────────────────────────────────────────────
// 뒷방 — 도량의 관리실. ADMIN_UID 계정으로만 열린다.
// 다섯 구획(탭): 성인 화두 | 학생·어린이 화두 | 관리자가 던진 화두
// | 수행자들이 던진 화두(대기+승인) | 공유 허용한 화두의 답
// 여기에 '선지식의 한마디' 구획을 더한다.
// 코드에 내장된 은행 화두도 여기서 고치고(고침) 감출(숨김) 수 있다 —
// 손질은 admin-content 문서에 새겨지고, 코드 원문은 그대로 남는다.
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
import {
  approveSharedAnswer,
  deleteSharedAnswer,
  fetchAllSharedAnswers,
  rejectSharedAnswer,
  type SharedAnswer,
} from "@/lib/community";
import { HWADU_BANK, getHwadu, type Hwadu } from "@/lib/hwadu";
import {
  addSaying,
  allSayings,
  emptyAdminContent,
  fetchAdminContent,
  hideBankHwadu,
  overrideBankHwadu,
  removeSaying,
  restoreBankHwadu,
  restoreSaying,
  type AdminContent,
  type BankOverride,
} from "@/lib/adminContent";

type Tab = "adult" | "student" | "admin" | "thrown" | "shared" | "sayings";

// 구획마다 한 줄 설명 — 무엇이 모이는 자리인지
const TAB_NOTE: Record<Tab, string> = {
  adult:
    "성인 랜덤 풀에 섞이는 화두 — 코드에 내장된 은행 화두와, 뒷방·수행자가 더한 화두.",
  student:
    "학생·어린이 랜덤 풀에 섞이는 화두 — 학생 전용과, 학생에게도 열리는 고전.",
  admin: "관리자가 뒷방에서 직접 던진 화두 — 승인 없이 곧바로 풀에 섞입니다.",
  thrown:
    "수행자들이 '나도 화두 던지기'로 던진 물음 — 승인 대기와, 승인되어 풀에 든 것.",
  shared:
    "다른 수행자에게 보여도 좋다고 동의한 답 — 승인해야만 그 화두를 회향한 이들에게 열립니다.",
  sayings:
    "선지식의 한마디에 걸리는 어록 — 내장 어록을 감추거나, 새 어록을 더할 수 있습니다.",
};

const smallBtn =
  "border px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors disabled:opacity-40";

// 은행(코드 내장) 화두 열람 줄 — 여기서도 고치고(덮어쓰기) 감출 수 있다
function BankRow({
  h,
  i,
  ov,
  hidden,
  busy,
  onSave,
  onHide,
  onRestore,
}: {
  h: Hwadu;
  i: number;
  ov?: BankOverride;
  hidden: boolean;
  busy: boolean;
  onSave: (patch: BankOverride) => void;
  onHide: () => void;
  onRestore: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const [ctx, setCtx] = useState("");

  const overridden = !!ov;
  const shownTitle = ov?.title ?? h.title;
  const shownQuestion = ov?.question ?? h.question;
  const shownContext = ov?.context ?? h.context;

  // 숨긴 화두 — 흐리게 접어 두고, 되살리기만 남긴다
  if (hidden) {
    return (
      <li className="border-l border-ink-3 pl-3 opacity-50">
        <p className="text-[12.5px] text-hanji-faint">
          <span>{i + 1}.</span> {shownTitle}
          {h.hanja && <span> · {h.hanja}</span>}
          <span className="ml-2 rounded-full border border-ink-3 px-2 py-0.5 text-[10px] tracking-wider">
            숨김
          </span>
        </p>
        <button
          disabled={busy}
          onClick={onRestore}
          className={`${smallBtn} mt-1.5 border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
        >
          되살리기
        </button>
      </li>
    );
  }

  const save = () => {
    const t = title.trim();
    const qq = q.trim();
    const cc = ctx.trim();
    const patch: BankOverride = {};
    if (t && t !== h.title) patch.title = t;
    if (qq && qq !== h.question) patch.question = qq;
    if (cc && cc !== (h.context ?? "")) patch.context = cc;
    if (patch.title || patch.question || patch.context) onSave(patch);
    // 원문 그대로 되돌려 적었으면 덮어쓴 것을 거둔다
    else if (overridden) onRestore();
    setEditing(false);
  };

  return (
    <li className={`border-l pl-3 ${overridden ? "border-gold/30" : "border-ink-3"}`}>
      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="짧은 이름"
            className="w-full border-b border-ink-3 bg-transparent pb-1 text-[12.5px] text-hanji-dim outline-none placeholder:text-hanji-faint"
          />
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={3}
            placeholder="화두 — 줄바꿈 그대로 화면에 나갑니다"
            className="journal-area mt-2 !text-sm"
          />
          <input
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            placeholder="배경 한 줄 (비우면 원래 배경)"
            className="mt-1 w-full border-b border-ink-3 bg-transparent pb-1 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={!q.trim() || busy}
              onClick={save}
              className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
            >
              저장
            </button>
            {overridden && (
              <button
                disabled={busy}
                onClick={() => {
                  onRestore();
                  setEditing(false);
                }}
                className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
              >
                원래대로
              </button>
            )}
            <button
              onClick={() => setEditing(false)}
              className={`${smallBtn} border-ink-3 text-hanji-faint hover:text-hanji-dim`}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] text-hanji-dim">
            <span className="text-hanji-faint">{i + 1}.</span> {shownTitle}
            {h.hanja && <span className="text-hanji-faint"> · {h.hanja}</span>}
            {overridden && (
              <span className="ml-2 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] tracking-wider text-gold-soft">
                고침
              </span>
            )}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-5 text-hanji-faint">
            {shownQuestion}
          </p>
          {shownContext && (
            <p className="mt-0.5 text-[11px] leading-5 text-hanji-faint">
              {shownContext}
            </p>
          )}
          <div className="mt-1.5 flex gap-2">
            <button
              onClick={() => {
                setTitle(shownTitle);
                setQ(shownQuestion);
                setCtx(shownContext ?? "");
                setEditing(true);
              }}
              className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
            >
              수정
            </button>
            <button
              disabled={busy}
              onClick={onHide}
              className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
            >
              삭제
            </button>
          </div>
        </>
      )}
    </li>
  );
}

// 추가된(선방·관리자) 화두 열람 줄 — title/hanja가 없어 질문 본문으로 보여준다
function PublicRow({ p, i }: { p: PublicHwadu; i: number }) {
  return (
    <li className="border-l border-gold/30 pl-3">
      <p className="text-[12.5px] text-hanji-dim">
        <span className="text-hanji-faint">{i + 1}.</span>{" "}
        {p.question.replace(/\s+/g, " ").slice(0, 22)}
        {p.question.length > 22 && "…"}
        <span className="ml-1.5 text-[10px] tracking-wider text-gold-soft">
          {p.origin === "admin" ? "· 관리자" : "· 선방"}
        </span>
      </p>
      <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-5 text-hanji-faint">
        {p.question}
        {p.source && <span className="text-hanji-faint"> — {p.source}</span>}
      </p>
    </li>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("thrown");
  const [thrown, setThrown] = useState<ThrownItem[]>([]);
  const [publicList, setPublicList] = useState<PublicHwadu[]>([]);
  const [shared, setShared] = useState<SharedAnswer[]>([]);
  const [content, setContent] = useState<AdminContent>(emptyAdminContent());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 추가/수정 폼
  const [newQ, setNewQ] = useState("");
  const [newSrc, setNewSrc] = useState("");
  const [newAudience, setNewAudience] = useState<"adult" | "student">("adult");
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editSrc, setEditSrc] = useState("");

  // 선지식의 한마디 — 더하기 폼
  const [newSayText, setNewSayText] = useState("");
  const [newSayName, setNewSayName] = useState("");
  const [newSayEra, setNewSayEra] = useState("");

  useEffect(() => watchAuth(setUser), []);
  const isAdmin = user?.uid === ADMIN_UID;

  const refresh = useCallback(async () => {
    try {
      const [t, p, s, c] = await Promise.all([
        fetchThrown(),
        fetchPublicHwadu(),
        fetchAllSharedAnswers().catch(() => [] as SharedAnswer[]),
        fetchAdminContent(true), // 실패해도 빈 손질로 돌아온다 — throw 하지 않는다
      ]);
      setThrown(t);
      setPublicList(p);
      setShared(s);
      setContent(c);
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

  // 뒷방의 손질 — 숨긴 은행 화두와 덮어쓴 조각
  const hiddenSet = new Set(content.bank.hidden);
  const hiddenAdult = adultBank.filter((h) => hiddenSet.has(h.id)).length;
  const hiddenStudent =
    studentOnly.filter((h) => hiddenSet.has(h.id)).length +
    studentClassics.filter((h) => hiddenSet.has(h.id)).length;

  // 실제 랜덤 풀에 섞이는 성인/학생 총계 — 은행(숨김 제외) + 추가된 화두(publicList)
  const publicAdult = publicList.filter((p) => (p.audience ?? "adult") === "adult");
  const publicStudent = publicList.filter((p) => p.audience === "student");
  const adultTotal = adultBank.length - hiddenAdult + publicAdult.length;
  const studentTotal =
    studentOnly.length +
    studentClassics.length -
    hiddenStudent +
    publicStudent.length;

  // 나눔에 부쳐진 회향 — 검수 대기 / 처리된 것
  const sharedPending = shared.filter((s) => (s.status ?? "pending") === "pending");
  const sharedHandled = shared.filter((s) => (s.status ?? "pending") !== "pending");

  // 선지식의 한마디 — 내장 + 더한 것 전부, 감춘 것은 따로
  const sayingsAll = allSayings(content.sayings);
  const hiddenSayingIds = new Set(content.sayings.hiddenIds);
  const sayingsVisible = sayingsAll.filter((s) => !hiddenSayingIds.has(s.id));
  const sayingsHidden = sayingsAll.filter((s) => hiddenSayingIds.has(s.id));

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "adult", label: "성인 화두", count: adultTotal },
    { key: "student", label: "학생·어린이 화두", count: studentTotal },
    { key: "admin", label: "관리자가 던진 화두", count: adminHwadu.length },
    { key: "thrown", label: "수행자들이 던진 화두", count: pending.length },
    { key: "shared", label: "공유 허용한 화두의 답", count: sharedPending.length },
    { key: "sayings", label: "선지식의 한마디", count: sayingsVisible.length },
  ];

  // 은행 화두 손질 — 저장·숨김·되살리기
  const bankRowProps = (h: Hwadu) => ({
    ov: content.bank.overrides[h.id],
    hidden: hiddenSet.has(h.id),
    busy: busy === `bank-${h.id}`,
    onSave: (patch: BankOverride) =>
      act(`bank-${h.id}`, () => overrideBankHwadu(h.id, patch)),
    onHide: () => act(`bank-${h.id}`, () => hideBankHwadu(h.id)),
    onRestore: () => act(`bank-${h.id}`, () => restoreBankHwadu(h.id)),
  });

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

      {/* 다섯 구획 + 선지식의 한마디 */}
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

      {/* 구획 한 줄 설명 */}
      <p className="mt-5 text-center text-[11px] leading-5 text-hanji-faint">
        {TAB_NOTE[tab]}
      </p>

      <div className="mt-7">
        {/* ── 성인 화두 ── */}
        {tab === "adult" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              은행 화두(코드 내장) · {adultBank.length - hiddenAdult}
              {hiddenAdult > 0 && (
                <span className="ml-1 tracking-normal"> (숨김 {hiddenAdult})</span>
              )}
            </h3>
            <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
              여기서 고치면 &lsquo;고침&rsquo;으로, 삭제하면 &lsquo;숨김&rsquo;으로
              남습니다 — 코드 원문은 그대로라 언제든 되살릴 수 있습니다.
            </p>
            <ul className="mt-4 space-y-4">
              {adultBank.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} {...bankRowProps(h)} />
              ))}
            </ul>
            {publicAdult.length > 0 && (
              <>
                <h3 className="mt-8 text-[11px] tracking-[0.3em] text-gold-soft">
                  뒷방·선방이 더한 화두 · {publicAdult.length}
                </h3>
                <ul className="mt-3 space-y-4">
                  {publicAdult.map((p, i) => (
                    <PublicRow key={p.id} p={p} i={adultBank.length + i} />
                  ))}
                </ul>
              </>
            )}
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
                <BankRow key={h.id} h={h} i={i} {...bankRowProps(h)} />
              ))}
            </ul>
            <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
              학생에게도 열리는 고전 · {studentClassics.length}
            </h3>
            <ul className="mt-3 space-y-4">
              {studentClassics.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} {...bankRowProps(h)} />
              ))}
            </ul>
            {publicStudent.length > 0 && (
              <>
                <h3 className="mt-8 text-[11px] tracking-[0.3em] text-gold-soft">
                  더한 학생·어린이 화두 · {publicStudent.length}
                </h3>
                <ul className="mt-3 space-y-4">
                  {publicStudent.map((p, i) => (
                    <PublicRow key={p.id} p={p} i={i} />
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* ── 관리자가 던진 화두 ── */}
        {tab === "admin" && (
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

        {/* ── 수행자들이 던진 화두 — 대기 + 승인 ── */}
        {tab === "thrown" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              승인 대기 · {pending.length}
            </h3>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-hanji-faint">
                기다리는 화두가 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
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

        {/* ── 공유 허용한 화두의 답 — 동의한 회향만 여기 온다 ── */}
        {tab === "shared" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              검수 대기 · {sharedPending.length}
            </h3>
            {sharedPending.length === 0 ? (
              <p className="mt-3 text-sm text-hanji-faint">
                검수를 기다리는 답이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {sharedPending.map((s) => (
                  <li key={s.id} className="border border-ink-3 bg-ink-2/60 p-4">
                    <p className="text-[11px] tracking-wide text-gold-soft">
                      {getHwadu(s.hwaduId)?.title ?? s.hwaduId} · {s.authorName}
                    </p>
                    <p className="mt-2 whitespace-pre-line break-keep text-[13.5px] font-light leading-7 text-hanji">
                      {s.answer}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busy === s.id}
                        onClick={() =>
                          act(s.id, () => approveSharedAnswer(s.id))
                        }
                        className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
                      >
                        승인 — 다른 이에게 열기
                      </button>
                      <button
                        disabled={busy === s.id}
                        onClick={() => act(s.id, () => rejectSharedAnswer(s.id))}
                        className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-hanji`}
                      >
                        거절
                      </button>
                      <button
                        disabled={busy === s.id}
                        onClick={() => act(s.id, () => deleteSharedAnswer(s.id))}
                        className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {sharedHandled.length > 0 && (
              <>
                <h3 className="mt-9 text-[11px] tracking-[0.3em] text-hanji-faint">
                  처리 내역 · {sharedHandled.length}
                </h3>
                <ul className="mt-3 space-y-2">
                  {sharedHandled.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-3 text-[11px] leading-5 text-hanji-faint"
                    >
                      <span>
                        <span
                          className={
                            s.status === "approved"
                              ? "text-gold-soft"
                              : "text-vermilion/70"
                          }
                        >
                          [{s.status === "approved" ? "열림" : "거절"}]
                        </span>{" "}
                        {s.answer.replace(/\s+/g, " ").slice(0, 34)}
                        {s.answer.length > 34 && "…"}
                      </span>
                      <button
                        disabled={busy === s.id}
                        onClick={() => act(s.id, () => deleteSharedAnswer(s.id))}
                        className="shrink-0 transition-colors hover:text-vermilion"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* ── 선지식의 한마디 — 어록의 손질 ── */}
        {tab === "sayings" && (
          <section>
            {/* 더하기 */}
            <div className="border border-ink-3 bg-ink-2/60 p-4">
              <textarea
                value={newSayText}
                onChange={(e) => setNewSayText(e.target.value)}
                rows={2}
                placeholder="말씀 — 우리말로 풀어 옮긴 한 구절"
                className="journal-area !text-sm"
              />
              <div className="mt-2 flex gap-3">
                <input
                  value={newSayName}
                  onChange={(e) => setNewSayName(e.target.value)}
                  placeholder="이름 — 예: 조주 종심"
                  className="w-1/2 border-b border-ink-3 bg-transparent pb-1.5 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
                />
                <input
                  value={newSayEra}
                  onChange={(e) => setNewSayEra(e.target.value)}
                  placeholder="시대 — 예: 당나라 (선택)"
                  className="w-1/2 border-b border-ink-3 bg-transparent pb-1.5 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
                />
              </div>
              <button
                disabled={
                  !newSayText.trim() || !newSayName.trim() || busy === "say-add"
                }
                onClick={() =>
                  act("say-add", async () => {
                    await addSaying(
                      newSayName.trim(),
                      newSayEra.trim(),
                      newSayText.trim()
                    );
                    setNewSayText("");
                    setNewSayName("");
                    setNewSayEra("");
                  })
                }
                className={`${smallBtn} mt-3 border-gold/50 text-gold hover:bg-gold/10`}
              >
                어록에 더하기
              </button>
            </div>

            {/* 현행 전부 — 내장 + 더한 것 */}
            <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
              지금 걸린 어록 · {sayingsVisible.length}
            </h3>
            <ul className="mt-4 space-y-4">
              {sayingsVisible.map((s) => (
                <li
                  key={s.id}
                  className={`border-l pl-3 ${
                    s.isExtra ? "border-gold/30" : "border-ink-3"
                  }`}
                >
                  <p className="break-keep text-[12.5px] leading-6 text-hanji-dim">
                    {s.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-hanji-faint">
                    — {s.name}
                    {s.era && ` · ${s.era}`}
                    {s.source && ` · 『${s.source}』`}
                    {s.isExtra && (
                      <span className="ml-1.5 text-[10px] tracking-wider text-gold-soft">
                        · 더함
                      </span>
                    )}
                  </p>
                  <button
                    disabled={busy === `say-${s.id}`}
                    onClick={() => act(`say-${s.id}`, () => removeSaying(s.id))}
                    className={`${smallBtn} mt-1.5 border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                  >
                    빼기
                  </button>
                </li>
              ))}
            </ul>

            {/* 감춘 내장 어록 — 되살릴 수 있다 */}
            {sayingsHidden.length > 0 && (
              <>
                <h3 className="mt-9 text-[11px] tracking-[0.3em] text-hanji-faint">
                  감춘 어록 · {sayingsHidden.length}
                </h3>
                <ul className="mt-3 space-y-2">
                  {sayingsHidden.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-3 text-[11px] leading-5 text-hanji-faint opacity-70"
                    >
                      <span>
                        {s.text.replace(/\s+/g, " ").slice(0, 40)}
                        {s.text.length > 40 && "…"} — {s.name}
                      </span>
                      <button
                        disabled={busy === `say-${s.id}`}
                        onClick={() =>
                          act(`say-${s.id}`, () => restoreSaying(s.id))
                        }
                        className="shrink-0 transition-colors hover:text-gold-soft"
                      >
                        되살리기
                      </button>
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
