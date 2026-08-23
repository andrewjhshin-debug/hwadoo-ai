"use client";

// ─────────────────────────────────────────────────────────────
// 뒷방 — 도량의 관리실. ADMIN_UID 계정으로만 열린다.
// 다섯 구획(탭): 성인 화두 | 학생·어린이 화두 | 관리자가 던진 화두
// | 수행자들이 던진 화두(대기+승인) | 공유 허용한 화두의 답
// 여기에 '선지식의 한마디' · '죽비(들어온 소리)'
// · '차 한 잔 보태주신 분' · '신고함(쪽지 신고 + 연꽃 채우기)' 구획을 더한다.
// 삭제는 어디서나 두 단계다 — 목록의 [숨기기]는 그 구획 하단의
// '숨긴 것들'로 접어 두고(되살릴 수 있다), 숨긴 것들에서 [삭제]하면
// 물음창을 거쳐 영영 지운다. 코드 내장 화두·어록은 removed 표식으로,
// 서버 문서(공개 화두·공유 답)는 문서 자체를 지운다.
// ─────────────────────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { isAdminAccount } from "@/lib/config";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import {
  adminAddHwadu,
  adminUpdateHwadu,
  approveThrown,
  deletePublicHwadu,
  fetchAllPublicHwadu,
  fetchThrown,
  hidePublicHwadu,
  rejectThrown,
  unhidePublicHwadu,
  type PublicHwadu,
  type ThrownItem,
} from "@/lib/thrown";
import {
  approveSharedAnswer,
  deleteSharedAnswer,
  fetchAllSharedAnswers,
  rejectSharedAnswer,
  restoreSharedAnswer,
  updateSharedAnswer,
  type SharedAnswer,
} from "@/lib/community";
import { HWADU_BANK, getHwadu, type Hwadu } from "@/lib/hwadu";
import {
  addSaying,
  allSayings,
  editSaying,
  emptyAdminContent,
  fetchAdminContent,
  hideBankHwadu,
  overrideBankHwadu,
  removeBankHwaduForever,
  removeSaying,
  removeSayingForever,
  restoreBankHwadu,
  restoreSaying,
  restoreSayingEdit,
  saveDonors,
  type AdminContent,
  type BankOverride,
  type MergedSaying,
  type SayingEdit,
} from "@/lib/adminContent";
import {
  deleteFeedback,
  fetchAllFeedback,
  type Feedback,
} from "@/lib/feedback";
import {
  deleteReport,
  fetchAllReports,
  grantLotus,
  resolveReport,
  type DmReport,
} from "@/lib/dm";

type Tab =
  | "adult"
  | "student"
  | "admin"
  | "thrown"
  | "shared"
  | "sayings"
  | "feedback"
  | "donors"
  | "reports";

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
    "선지식의 한마디에 걸리는 어록 — 고치고(내장·더한 것 모두) 감추고, 새 어록을 더할 수 있습니다.",
  feedback:
    "죽비 — 수행자들이 도량에 건넨 소리. 여기서만 읽을 수 있고, 들었으면 지웁니다.",
  donors:
    "차 한 잔 보태주신 분 — 한 줄에 이름 하나. 찻자리에는 가운데를 ○로 가려 나갑니다.",
  reports:
    "쪽지 대화에서 들어온 신고 — 살펴서 처리하고, 하단에서 시험용 연꽃도 채웁니다.",
};

const smallBtn =
  "border px-3.5 py-1.5 text-[11px] tracking-[0.15em] transition-colors disabled:opacity-40";

// 한 줄 요약 — 숨긴 것들 목록에 쓰는 짧은 꼬리표
function snip(text: string, n: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

// 들어온 소리의 날짜 — 서버 시각이 아직 안 붙었으면 '방금'
function feedbackDate(sec?: number): string {
  if (!sec) return "방금";
  return new Date(sec * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 숨긴 것들 — 구획 하단의 접이. 비어 있으면 아예 그리지 않는다.
function HiddenDetails({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="mt-9 border-t border-ink-3 pt-5">
      <summary className="cursor-pointer text-[11px] tracking-[0.3em] text-hanji-faint transition-colors hover:text-hanji-dim">
        숨긴 것들 · {count}
      </summary>
      <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
        되살리면 제자리로 돌아갑니다. 여기서 삭제하면 되돌릴 수 없습니다.
      </p>
      <ul className="mt-4 space-y-3">{children}</ul>
    </details>
  );
}

// 숨긴 것 한 줄 — [되살리기] [삭제(영구)]. 삭제는 부르는 쪽이 물음창을 거친다.
function HiddenRow({
  label,
  busy,
  onRevive,
  onDelete,
  reviveLabel = "되살리기",
}: {
  label: string;
  busy: boolean;
  onRevive: () => void;
  onDelete: () => void;
  reviveLabel?: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-l border-ink-3 pl-3 text-[11.5px] leading-5 text-hanji-faint opacity-80">
      <span>{label}</span>
      <span className="flex shrink-0 gap-3">
        <button
          disabled={busy}
          onClick={onRevive}
          className="transition-colors hover:text-gold-soft disabled:opacity-40"
        >
          {reviveLabel}
        </button>
        <button
          disabled={busy}
          onClick={onDelete}
          className="transition-colors hover:text-vermilion disabled:opacity-40"
        >
          삭제
        </button>
      </span>
    </li>
  );
}

// 은행(코드 내장 상수)에서만 파생되는 세 갈래 — 모듈에서 한 번만 거른다.
// (폼 입력마다 페이지 전체가 재렌더되는 화면이라, 렌더 안에서 매번 거르면 낭비다)
const ADULT_BANK = HWADU_BANK.filter((h) => h.audience !== "student");
const STUDENT_ONLY = HWADU_BANK.filter((h) => h.audience === "student");
const STUDENT_CLASSICS = HWADU_BANK.filter((h) => h.forStudent);

// 은행(코드 내장) 화두 열람 줄 — 여기서도 고치고(덮어쓰기) 숨길 수 있다.
// 숨긴 줄은 여기 없다 — 구획 하단의 '숨긴 것들'(HiddenDetails)로 접힌다.
function BankRow({
  h,
  i,
  ov,
  busy,
  onSave,
  onHide,
  onRestore,
}: {
  h: Hwadu;
  i: number;
  ov?: BankOverride;
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
              숨기기
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

// 어록 한 줄 — 내장·더한 것 모두 여기서 고쳐 쓸 수 있다.
// 고침은 edited 조각으로 새겨지고, 원문은 그대로라 언제든 원래대로 돌아간다.
function SayingRow({
  s,
  busy,
  onEdit,
  onRestoreEdit,
  onRemove,
}: {
  s: MergedSaying;
  busy: boolean;
  onEdit: (patch: SayingEdit) => void;
  onRestoreEdit: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [era, setEra] = useState("");

  const save = () => {
    const t = text.trim();
    const n = name.trim();
    const e = era.trim();
    if (!t || !n) return;
    // 보이는 그대로 되돌려 적었으면 새로 새기지 않는다
    if (t !== s.text || n !== s.name || e !== s.era) {
      onEdit({ name: n, era: e, text: t });
    }
    setEditing(false);
  };

  return (
    <li
      className={`border-l pl-3 ${
        s.isExtra || s.isEdited ? "border-gold/30" : "border-ink-3"
      }`}
    >
      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="말씀 — 우리말로 풀어 옮긴 한 구절"
            className="journal-area !text-sm"
          />
          <div className="mt-2 flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 — 예: 조주 종심"
              className="w-1/2 border-b border-ink-3 bg-transparent pb-1 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
            />
            <input
              value={era}
              onChange={(e) => setEra(e.target.value)}
              placeholder="시대 — 예: 당나라 (선택)"
              className="w-1/2 border-b border-ink-3 bg-transparent pb-1 text-[12px] text-hanji-dim outline-none placeholder:text-hanji-faint"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={!text.trim() || !name.trim() || busy}
              onClick={save}
              className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
            >
              저장
            </button>
            {s.isEdited && (
              <button
                disabled={busy}
                onClick={() => {
                  onRestoreEdit();
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
            {s.isEdited && (
              <span className="ml-1.5 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] tracking-wider text-gold-soft">
                고침
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setText(s.text);
                setName(s.name);
                setEra(s.era);
                setEditing(true);
              }}
              className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
            >
              수정
            </button>
            {s.isEdited && (
              <button
                disabled={busy}
                onClick={onRestoreEdit}
                className={`${smallBtn} border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji`}
              >
                원래대로
              </button>
            )}
            <button
              disabled={busy}
              onClick={onRemove}
              className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
            >
              숨기기
            </button>
          </div>
        </>
      )}
    </li>
  );
}

// 나눔에 부쳐진 답 한 줄 — 대기·열린 답 모두 여기서 오탈자를 손질할 수 있다.
// [숨기기]는 거절(rejected)로 접는 것 — 하단 '숨긴 것들'에서 되살리거나 지운다.
function SharedRow({
  s,
  busy,
  onApprove,
  onHide,
  onSave,
}: {
  s: SharedAnswer;
  busy: boolean;
  onApprove?: () => void; // 대기 항목에만 붙는다
  onHide: () => void;
  onSave: (answer: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const save = () => {
    const t = text.trim();
    if (!t) return;
    // 그대로 되돌려 적었으면 새로 새기지 않는다
    if (t !== s.answer) onSave(t);
    setEditing(false);
  };

  return (
    <li className="border border-ink-3 bg-ink-2/60 p-4">
      <p className="text-[11px] tracking-wide text-gold-soft">
        {getHwadu(s.hwaduId)?.title ?? s.hwaduId} · {s.authorName}
      </p>
      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="journal-area mt-2 !text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={!text.trim() || busy}
              onClick={save}
              className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
            >
              저장
            </button>
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
          <p className="mt-2 whitespace-pre-line break-keep text-[13.5px] font-light leading-7 text-hanji">
            {s.answer}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onApprove && (
              <button
                disabled={busy}
                onClick={onApprove}
                className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
              >
                승인 — 다른 이에게 열기
              </button>
            )}
            <button
              onClick={() => {
                setText(s.answer);
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
              숨기기
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default function AdminPage() {
  const confirm = useConfirm();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("thrown");
  const [thrown, setThrown] = useState<ThrownItem[]>([]);
  const [publicList, setPublicList] = useState<PublicHwadu[]>([]);
  const [shared, setShared] = useState<SharedAnswer[]>([]);
  const [content, setContent] = useState<AdminContent>(emptyAdminContent());
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reports, setReports] = useState<DmReport[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 메일 시험 발송 — Resend 가 켜졌는지 확인용
  const [mailTo, setMailTo] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [mailResult, setMailResult] = useState<string | null>(null);

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

  // 차 한 잔 보태주신 분 — 한 줄에 이름 하나 적는 칸.
  // 적는 중(dirty)에는 refresh가 서버 명단으로 덮어쓰지 않는다.
  const [donorsText, setDonorsText] = useState("");
  const donorsDirty = useRef(false);

  // 연꽃 채우기 — 결제(PG)가 열리기 전, 시험 삼아 지갑을 채우는 손길
  const [lotusUid, setLotusUid] = useState("");
  const [lotusN, setLotusN] = useState("10");
  const [lotusMsg, setLotusMsg] = useState<string | null>(null);

  useEffect(() => watchAuth(setUser), []);
  const isAdmin = isAdminAccount(user);

  const refresh = useCallback(async () => {
    try {
      const [t, p, s, c, f, r] = await Promise.all([
        fetchThrown(),
        fetchAllPublicHwadu(), // 숨긴 것까지 — 뒷방은 접힌 것도 봐야 한다
        fetchAllSharedAnswers().catch(() => [] as SharedAnswer[]),
        fetchAdminContent(true), // 실패해도 빈 손질로 돌아온다 — throw 하지 않는다
        fetchAllFeedback().catch(() => [] as Feedback[]),
        fetchAllReports().catch(() => [] as DmReport[]),
      ]);
      setThrown(t);
      setPublicList(p);
      setShared(s);
      setContent(c);
      setFeedback(f);
      setReports(r);
      // 명단 칸 — 적는 중이 아닐 때만 서버 명단으로 채운다
      if (!donorsDirty.current) setDonorsText(c.donors.join("\n"));
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

  // 영구 삭제 — 반드시 물음창을 거친다. '두다'를 고르면 아무 일도 없다.
  const eraseForever = async (key: string, fn: () => Promise<void>) => {
    const ok = await confirm("정말 지우시겠습니까?", "돌이킬 수 없습니다.", {
      confirm: "지우다",
      cancel: "두다",
    });
    if (ok) await act(key, fn);
  };

  // 승인 알림 — 던진 이(uid)에게 웹푸시를 쏜다.
  // 실패는 조용히 삼킨다 — 알림은 곁가지, 승인 흐름을 막지 않는다.
  const notifyApproval = async (
    kind: "thrown" | "answer",
    uid: string | null | undefined
  ) => {
    if (!uid || !user) return; // 로그인 없이 던진 문서는 건너뛴다
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/push/notify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind, uid }),
      });
    } catch {
      // 조용히 — 다음 아침 문안이 어차피 간다
    }
  };

  // 메일 시험 발송 — Resend(RESEND_API_KEY)가 실제로 켜져 있는지 그 자리에서 확인
  const sendTestMail = async () => {
    if (!user || !mailTo.trim()) return;
    setMailBusy(true);
    setMailResult(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/mail/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: mailTo.trim(), kind: "milestone", days: 3 }),
      });
      if (res.status === 503) {
        setMailResult("아직 RESEND_API_KEY 가 설정되지 않았습니다.");
      } else {
        const data = (await res.json().catch(() => ({}))) as { sent?: boolean };
        setMailResult(
          data.sent ? "보냈습니다 — 받은편지함(스팸함도)을 확인해 보십시오." : "발송에 실패했습니다."
        );
      }
    } catch {
      setMailResult("발송 중 오류가 났습니다.");
    } finally {
      setMailBusy(false);
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

  // 공개 화두 — 숨긴 것은 목록에서 빠져 각 구획의 '숨긴 것들'로 접힌다
  const activePublic = publicList.filter((p) => !p.hidden);
  const hiddenPublic = publicList.filter((p) => p.hidden);
  const adminHwadu = activePublic.filter((p) => p.origin === "admin");
  const adminHiddenPub = hiddenPublic.filter((p) => p.origin === "admin");
  const approvedThrown = activePublic.filter((p) => p.origin !== "admin");
  const thrownHiddenPub = hiddenPublic.filter((p) => p.origin !== "admin");

  // 뒷방의 손질 — 숨긴 것(되살릴 수 있음)·영영 지운 것·덮어쓴 조각
  const hiddenSet = new Set(content.bank.hidden);
  const removedSet = new Set(content.bank.removed);
  const inBank = (h: Hwadu) => !hiddenSet.has(h.id) && !removedSet.has(h.id);
  const adultBankVisible = ADULT_BANK.filter(inBank);
  const adultBankHidden = ADULT_BANK.filter(
    (h) => hiddenSet.has(h.id) && !removedSet.has(h.id)
  );
  const studentOnlyVisible = STUDENT_ONLY.filter(inBank);
  const studentClassicsVisible = STUDENT_CLASSICS.filter(inBank);
  // 학생 풀 전체(전용+고전)에서 숨긴 것 — 두 목록에 겹치는 화두도 한 번만
  const studentBankHidden = HWADU_BANK.filter(
    (h) =>
      (h.audience === "student" || h.forStudent) &&
      hiddenSet.has(h.id) &&
      !removedSet.has(h.id)
  );

  // 실제 랜덤 풀에 섞이는 성인/학생 총계 — 은행(숨김·삭제 제외) + 추가된 화두
  const publicAdult = activePublic.filter((p) => (p.audience ?? "adult") === "adult");
  const publicStudent = activePublic.filter((p) => p.audience === "student");
  const adultTotal = adultBankVisible.length + publicAdult.length;
  const studentTotal =
    studentOnlyVisible.length +
    studentClassicsVisible.length +
    publicStudent.length;

  // 나눔에 부쳐진 회향 — 검수 대기 / 열린 답 / 숨긴 것(거절이 곧 숨김)
  const sharedPending = shared.filter((s) => (s.status ?? "pending") === "pending");
  const sharedApproved = shared.filter((s) => s.status === "approved");
  const sharedRejected = shared.filter((s) => s.status === "rejected");

  // 선지식의 한마디 — 감춘 것은 따로, 영영 지운 것은 어디에도 없다
  const sayingsAll = allSayings(content.sayings);
  const hiddenSayingIds = new Set(content.sayings.hiddenIds);
  const removedSayingIds = new Set(content.sayings.removedIds);
  const sayingsVisible = sayingsAll.filter(
    (s) => !hiddenSayingIds.has(s.id) && !removedSayingIds.has(s.id)
  );
  const sayingsHidden = sayingsAll.filter(
    (s) => hiddenSayingIds.has(s.id) && !removedSayingIds.has(s.id)
  );

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "adult", label: "성인 화두", count: adultTotal },
    { key: "student", label: "학생·어린이 화두", count: studentTotal },
    { key: "admin", label: "관리자 모드", count: adminHwadu.length },
    { key: "thrown", label: "수행자들이 던진 화두", count: pending.length },
    { key: "shared", label: "공유 허용한 화두의 답", count: sharedPending.length },
    { key: "sayings", label: "선지식의 한마디", count: sayingsVisible.length },
    { key: "feedback", label: "죽비", count: feedback.length },
    { key: "donors", label: "차 한 잔", count: content.donors.length },
    { key: "reports", label: "신고함", count: reports.filter((r) => r.status === "open").length },
  ];

  // 은행 화두 손질 — 저장·숨김·(덮어쓴 것) 원래대로
  const bankRowProps = (h: Hwadu) => ({
    ov: content.bank.overrides[h.id],
    busy: busy === `bank-${h.id}`,
    onSave: (patch: BankOverride) =>
      act(`bank-${h.id}`, () => overrideBankHwadu(h.id, patch)),
    onHide: () => act(`bank-${h.id}`, () => hideBankHwadu(h.id)),
    onRestore: () => act(`bank-${h.id}`, () => restoreBankHwadu(h.id)),
  });

  // 숨긴 은행 화두 한 줄 — 되살리기 / (물음창 거쳐) 영구 삭제
  const bankHiddenRow = (h: Hwadu) => (
    <HiddenRow
      key={h.id}
      label={h.hanja ? `${h.title} · ${h.hanja}` : h.title}
      busy={busy === `bank-${h.id}`}
      onRevive={() => act(`bank-${h.id}`, () => restoreBankHwadu(h.id))}
      onDelete={() =>
        eraseForever(`bank-${h.id}`, () => removeBankHwaduForever(h.id))
      }
    />
  );

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

      {/* 메일 시험 발송 — Resend 연결이 살아 있는지 그 자리에서 확인 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border border-ink-3 px-4 py-3 text-xs">
        <span className="text-hanji-faint tracking-[0.1em]">메일 시험</span>
        <input
          type="email"
          value={mailTo}
          onChange={(e) => setMailTo(e.target.value)}
          placeholder="받을 이메일"
          className="border border-ink-3 bg-transparent px-3 py-1.5 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/40"
        />
        <button
          onClick={sendTestMail}
          disabled={mailBusy || !mailTo.trim()}
          className="border border-gold/50 px-4 py-1.5 tracking-[0.1em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
        >
          {mailBusy ? "보내는 중…" : "시험 메일 보내기"}
        </button>
        {mailResult && <span className="text-hanji-dim">{mailResult}</span>}
      </div>

      {/* 다섯 구획 + 선지식의 한마디 + 죽비 + 차 한 잔 */}
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
              은행 화두(코드 내장) · {adultBankVisible.length}
              {adultBankHidden.length > 0 && (
                <span className="ml-1 tracking-normal">
                  {" "}
                  (숨김 {adultBankHidden.length})
                </span>
              )}
            </h3>
            <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
              여기서 고치면 &lsquo;고침&rsquo;으로, 숨기면 아래 &lsquo;숨긴
              것들&rsquo;로 접힙니다 — 되살릴 수 있고, 숨긴 것들에서 한 번 더
              지우면 영영 사라집니다.
            </p>
            <ul className="mt-4 space-y-4">
              {adultBankVisible.map((h, i) => (
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
                    <PublicRow key={p.id} p={p} i={adultBankVisible.length + i} />
                  ))}
                </ul>
              </>
            )}
            <HiddenDetails count={adultBankHidden.length}>
              {adultBankHidden.map(bankHiddenRow)}
            </HiddenDetails>
          </section>
        )}

        {/* ── 학생·어린이 화두 ── */}
        {tab === "student" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              학생 전용 · {studentOnlyVisible.length}
            </h3>
            <ul className="mt-3 space-y-4">
              {studentOnlyVisible.map((h, i) => (
                <BankRow key={h.id} h={h} i={i} {...bankRowProps(h)} />
              ))}
            </ul>
            <h3 className="mt-8 text-[11px] tracking-[0.3em] text-hanji-faint">
              학생에게도 열리는 고전 · {studentClassicsVisible.length}
            </h3>
            <ul className="mt-3 space-y-4">
              {studentClassicsVisible.map((h, i) => (
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
            <HiddenDetails count={studentBankHidden.length}>
              {studentBankHidden.map(bankHiddenRow)}
            </HiddenDetails>
          </section>
        )}

        {/* ── 관리자 모드 — 관리자가 직접 던지는 화두 ── */}
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
                            act(p.id, () => hidePublicHwadu(p.id))
                          }
                          className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                        >
                          숨기기
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
            <HiddenDetails count={adminHiddenPub.length}>
              {adminHiddenPub.map((p) => (
                <HiddenRow
                  key={p.id}
                  label={snip(p.question, 34)}
                  busy={busy === p.id}
                  onRevive={() => act(p.id, () => unhidePublicHwadu(p.id))}
                  onDelete={() =>
                    eraseForever(p.id, () => deletePublicHwadu(p.id))
                  }
                />
              ))}
            </HiddenDetails>
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
                        onClick={() =>
                          act(t.id, async () => {
                            await approveThrown(t);
                            // 승인이 성공한 직후에만 — 실패는 조용히
                            void notifyApproval("thrown", t.uid);
                          })
                        }
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
                    onClick={() => act(p.id, () => hidePublicHwadu(p.id))}
                    className="shrink-0 text-[11px] text-hanji-faint transition-colors hover:text-vermilion"
                  >
                    숨기기
                  </button>
                </li>
              ))}
            </ul>

            <HiddenDetails count={thrownHiddenPub.length}>
              {thrownHiddenPub.map((p) => (
                <HiddenRow
                  key={p.id}
                  label={snip(p.question, 34)}
                  busy={busy === p.id}
                  onRevive={() => act(p.id, () => unhidePublicHwadu(p.id))}
                  onDelete={() =>
                    eraseForever(p.id, () => deletePublicHwadu(p.id))
                  }
                />
              ))}
            </HiddenDetails>

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
                  <SharedRow
                    key={s.id}
                    s={s}
                    busy={busy === s.id}
                    onApprove={() =>
                      act(s.id, async () => {
                        await approveSharedAnswer(s.id);
                        // 승인이 성공한 직후에만 — 실패는 조용히
                        void notifyApproval("answer", s.uid);
                      })
                    }
                    onHide={() => act(s.id, () => rejectSharedAnswer(s.id))}
                    onSave={(answer) =>
                      act(s.id, () => updateSharedAnswer(s.id, answer))
                    }
                  />
                ))}
              </ul>
            )}

            {sharedApproved.length > 0 && (
              <>
                <h3 className="mt-9 text-[11px] tracking-[0.3em] text-hanji-faint">
                  열린 답 · {sharedApproved.length}
                </h3>
                <ul className="mt-3 space-y-4">
                  {sharedApproved.map((s) => (
                    <SharedRow
                      key={s.id}
                      s={s}
                      busy={busy === s.id}
                      onHide={() => act(s.id, () => rejectSharedAnswer(s.id))}
                      onSave={(answer) =>
                        act(s.id, () => updateSharedAnswer(s.id, answer))
                      }
                    />
                  ))}
                </ul>
              </>
            )}

            {/* 거절이 곧 숨김 — 되살리면 대기로 돌아가 다시 검수대에 오른다 */}
            <HiddenDetails count={sharedRejected.length}>
              {sharedRejected.map((s) => (
                <HiddenRow
                  key={s.id}
                  label={`${snip(s.answer, 34)} — ${s.authorName}`}
                  busy={busy === s.id}
                  reviveLabel="되살리기 — 대기로"
                  onRevive={() => act(s.id, () => restoreSharedAnswer(s.id))}
                  onDelete={() =>
                    eraseForever(s.id, () => deleteSharedAnswer(s.id))
                  }
                />
              ))}
            </HiddenDetails>
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
                <SayingRow
                  key={s.id}
                  s={s}
                  busy={busy === `say-${s.id}`}
                  onEdit={(patch) =>
                    act(`say-${s.id}`, () => editSaying(s.id, patch))
                  }
                  onRestoreEdit={() =>
                    act(`say-${s.id}`, () => restoreSayingEdit(s.id))
                  }
                  onRemove={() => act(`say-${s.id}`, () => removeSaying(s.id))}
                />
              ))}
            </ul>

            {/* 숨긴 어록 — 되살리거나, 물음창을 거쳐 영영 지운다 */}
            <HiddenDetails count={sayingsHidden.length}>
              {sayingsHidden.map((s) => (
                <HiddenRow
                  key={s.id}
                  label={`${snip(s.text, 40)} — ${s.name}`}
                  busy={busy === `say-${s.id}`}
                  onRevive={() => act(`say-${s.id}`, () => restoreSaying(s.id))}
                  onDelete={() =>
                    eraseForever(`say-${s.id}`, () => removeSayingForever(s.id))
                  }
                />
              ))}
            </HiddenDetails>
          </section>
        )}

        {/* ── 죽비 — 들어온 소리 (피드백) ── */}
        {tab === "feedback" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              죽비 — 들어온 소리 · {feedback.length}
            </h3>
            {feedback.length === 0 ? (
              <p className="mt-3 text-sm text-hanji-faint">
                아직 들어온 소리가 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {feedback.map((f) => (
                  <li key={f.id} className="border border-ink-3 bg-ink-2/60 p-4">
                    <p className="text-[11px] tracking-wide text-hanji-faint">
                      {feedbackDate(f.createdAt?.seconds)}
                      {!f.uid && " · 손님"}
                    </p>
                    <p className="mt-2 whitespace-pre-line break-keep text-[13.5px] font-light leading-7 text-hanji">
                      {f.body}
                    </p>
                    <div className="mt-3">
                      <button
                        disabled={busy === f.id}
                        onClick={() =>
                          eraseForever(f.id, () => deleteFeedback(f.id))
                        }
                        className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                      >
                        지우기
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── 차 한 잔 보태주신 분 — 찻자리에 남길 명단 ── */}
        {tab === "donors" && (
          <section>
            <div className="border border-ink-3 bg-ink-2/60 p-4">
              <textarea
                value={donorsText}
                onChange={(e) => {
                  setDonorsText(e.target.value);
                  donorsDirty.current = true;
                }}
                rows={8}
                placeholder={"한 줄에 이름 하나씩 — 예:\n신준혁\n김수현"}
                className="journal-area !text-sm"
              />
              <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
                찻자리에는 가운데를 ○로 가려 나갑니다 — 신준혁 → 신○혁, 김수 →
                김○. 빈 줄은 알아서 걷어냅니다.
              </p>
              <button
                disabled={busy === "donors"}
                onClick={() =>
                  act("donors", async () => {
                    await saveDonors(donorsText.split("\n"));
                    donorsDirty.current = false; // 저장 뒤엔 서버 명단이 다시 칸을 채운다
                  })
                }
                className={`${smallBtn} mt-3 border-gold/50 text-gold hover:bg-gold/10`}
              >
                적어두기
              </button>
            </div>
          </section>
        )}

        {/* ── 신고함 — 쪽지 대화 신고 + 연꽃 채우기 ── */}
        {tab === "reports" && (
          <section>
            <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
              열린 신고 · {reports.filter((r) => r.status === "open").length}
            </h3>
            {reports.filter((r) => r.status === "open").length === 0 ? (
              <p className="mt-3 text-sm text-hanji-faint">
                들어온 신고가 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {reports
                  .filter((r) => r.status === "open")
                  .map((r) => (
                    <li
                      key={r.id}
                      className="border border-ink-3 bg-ink-2/60 p-4"
                    >
                      <p className="text-[11px] tracking-wide text-hanji-faint">
                        {feedbackDate(r.createdAt?.seconds)}
                      </p>
                      <p className="mt-2 break-keep text-[13px] leading-6 text-hanji-dim">
                        {r.reason}
                      </p>
                      <p className="mt-1.5 text-[10px] tracking-wider text-hanji-faint">
                        {r.kind === "comment" ? "[댓글 신고]" : "[쪽지 신고]"}
                        &nbsp;대상 UID: {r.targetUid.slice(0, 8)}…
                        {r.threadId && <> · 스레드 {r.threadId.slice(0, 8)}…</>}
                        {r.postId && <> · 글 {r.postId.slice(0, 8)}…</>}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy === r.id}
                          onClick={() =>
                            act(r.id, () => resolveReport(r.id))
                          }
                          className={`${smallBtn} border-gold/50 text-gold hover:bg-gold/10`}
                        >
                          처리함
                        </button>
                        <button
                          disabled={busy === r.id}
                          onClick={() =>
                            eraseForever(r.id, () => deleteReport(r.id))
                          }
                          className={`${smallBtn} border-ink-3 text-hanji-faint hover:border-vermilion/50 hover:text-hanji`}
                        >
                          지우기
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}

            {/* 처리된 신고 */}
            {reports.filter((r) => r.status === "done").length > 0 && (
              <details className="mt-9 border-t border-ink-3 pt-5">
                <summary className="cursor-pointer text-[11px] tracking-[0.3em] text-hanji-faint transition-colors hover:text-hanji-dim">
                  처리된 신고 · {reports.filter((r) => r.status === "done").length}
                </summary>
                <ul className="mt-4 space-y-2">
                  {reports
                    .filter((r) => r.status === "done")
                    .map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start justify-between gap-3 border-l border-ink-3 pl-3 text-[11.5px] leading-5 text-hanji-faint opacity-80"
                      >
                        <span>{snip(r.reason, 40)}</span>
                        <button
                          disabled={busy === r.id}
                          onClick={() =>
                            eraseForever(r.id, () => deleteReport(r.id))
                          }
                          className="shrink-0 transition-colors hover:text-vermilion disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                </ul>
              </details>
            )}

            {/* 연꽃 채우기 — PG 승인 전 시험용 */}
            <div className="mt-11 border-t border-ink-3 pt-7">
              <h3 className="text-[11px] tracking-[0.3em] text-hanji-faint">
                연꽃 채우기 — 시험용(PG 승인 전)
              </h3>
              <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
                쪽지 유료분 흐름을 미리 눌러보기 위한 손길 — 결제가 열리면
                사라집니다.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <input
                  value={lotusUid}
                  onChange={(e) => setLotusUid(e.target.value)}
                  placeholder="수행자 UID"
                  className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2 text-[12.5px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                />
                <input
                  value={lotusN}
                  onChange={(e) => setLotusN(e.target.value)}
                  type="number"
                  min="1"
                  max="999"
                  className="w-16 rounded-[10px] border border-ink-3 bg-transparent px-3 py-2 text-center text-[12.5px] text-hanji outline-none transition-colors focus:border-gold/40"
                />
                <button
                  disabled={busy === "lotus" || !lotusUid.trim()}
                  onClick={() =>
                    act("lotus", async () => {
                      const n = parseInt(lotusN, 10);
                      if (isNaN(n) || n <= 0) return;
                      await grantLotus(lotusUid.trim(), n);
                      setLotusMsg(
                        `${lotusUid.trim().slice(0, 8)}…에게 연꽃 ${n}송이를 채웠습니다.`
                      );
                    })
                  }
                  className={`${smallBtn} shrink-0 border-gold/50 text-gold hover:bg-gold/10`}
                >
                  {busy === "lotus" ? "…" : "채우기"}
                </button>
              </div>
              {lotusMsg && (
                <p className="mt-2 text-[11px] leading-5 text-gold-soft">
                  {lotusMsg}
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <p className="mt-14 border-t border-ink-3 pt-8 text-center text-[11px] leading-6 text-hanji-faint">
        연지원(커뮤니티)의 글·댓글은 각 글에서 직접 내릴 수 있습니다.
      </p>
    </div>
  );
}
