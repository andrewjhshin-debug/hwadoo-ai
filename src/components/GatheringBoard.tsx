"use client";

// ─────────────────────────────────────────────────────────────
// 모임 게시판 (/gathering) — 설명 없이 게시판이 화면 전체를 쓴다.
// · 목록: 제목 한 줄씩(최신순). 오른쪽 위 연꽃 잔고 칩(/lotus)과 [글 쓰기].
// · 글: 제목(굵게, 오른쪽 위 ⋯ 메뉴=고치기·내리기) → 글쓴이+연꽃 ·
//   조회 수 · 쓴 날짜 → 내용 → (있으면) 약속 절·날짜·시간 →
//   합장(공감, 토글)·[함께하기] → 댓글들 → 댓글 쓰기(모바일: 아래 탭 바로 위 고정).
// · 음양 문양 — 글쓴이·댓글 단 이 이름 곁 (남녀는 음양). 누르면 쪽지 팝업:
//   청하기 1건 = 연꽃 1송이(1,000원), 수락된 대화는 무료.
//   첫 계정엔 연꽃 3송이 무료.
// · 합장은 계정당 하나(토글 — 다시 누르면 거둔다).
//   댓글 좋아요/싫어요는 계정당 하나 — 갈아탈 수 있고, 다시 누르면 거둔다.
// · 뒤로가기 — 팝업/글쓰기/글이 열릴 때 history 에 층을 쌓아,
//   브라우저·안드로이드 뒤로가기가 층을 위에서부터 접는다.
// · 글쓰기·댓글 자격: 로그인 + 1회향. 연결 주소는 [함께하기] 뒤에만 숨는다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import {
  addComment,
  categoryLabel,
  createGathering,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyLike,
  cachedPosts,
  fetchPosts,
  GATHERING_CATEGORIES,
  likePost,
  unlikePost,
  updateGathering,
  viewPost,
  voteComment,
  type Comment,
  type GatheringCategory,
  type Post,
} from "@/lib/community";
import InyeonThread from "@/components/InyeonThread";
import { loadStore } from "@/lib/store";
import { watchAuth } from "@/lib/sync";
import { isAdminAccount } from "@/lib/config";
import {
  dmVisible,
  fetchMyThreads,
  getLotus,
  reportComment,
  requestThread,
  FIRST_GRANT,
  type DmThread,
} from "@/lib/dm";
import { TEMPLES } from "@/lib/pilgrimage";

/** 목록에 있는 절 이름 — 고른 것인지 직접 적은 것인지 가르는 데 쓴다 */
const TEMPLE_NAMES: string[] = TEMPLES.map((t) => t.name);
import Dudu from "@/components/Dudu";
import { grantCharm } from "@/lib/charm";
import { addMerit } from "@/lib/merit";
import { LotusMark, Yeonkkot } from "@/components/icons";
import { useConfirm } from "@/components/Confirm";

// 눈 — 조회 수. 가는 선으로 옅게.
function EyeIcon({ className = "h-[13px] w-[13px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

// 말풍선 — 댓글 수. 가는 선으로 옅게.
function CommentIcon({ className = "h-[13px] w-[13px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 11.6c0 3.9-3.6 7-8 7-1 0-2-.15-2.9-.44L4.5 19.5l1.2-3.2A6.6 6.6 0 0 1 4 11.6c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
    </svg>
  );
}

// 음양 프로필 — 쪽지 단추와 같은 태극 문양.
// 남(양) = 금빛 반쪽이 찬 원, 여(음) = 같은 문양을 선으로만, 미표시 = 빈 원.
function GenderMark({
  g,
  className = "h-9 w-9",
}: {
  g?: "m" | "f" | null;
  className?: string;
}) {
  if (g === "m") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 text-gold ${className}`}
        aria-label="양 — 남"
      >
        <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
        />
        <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  if (g === "f") {
    // 음 — 양과 같은 문양의 반전: 반대쪽 반이 금빛으로 찬다 (180도 회전)
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 text-gold ${className}`}
        aria-label="음 — 여"
      >
        <g transform="rotate(180 12 12)">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
          <path
            fillRule="evenodd"
            fill="currentColor"
            d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
          />
          <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
        </g>
      </svg>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full border border-ink-3 bg-ink-2/40 ${className}`}
      aria-label="미표시"
    />
  );
}

// 걸음 뱃지 — 글쓴이가 쓸 당시 지녔던 걸음(人·修·天) 한 글자.
// 내 도량·사이드바의 뱃지와 같은 모양, 이름 곁에 아주 작게.
function RankBadge({ hanja }: { hanja?: string | null }) {
  if (!hanja) return null;
  return (
    <span
      aria-label={`걸음 · ${hanja}`}
      className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-[8.5px] leading-none text-gold"
    >
      {hanja}
    </span>
  );
}

// 음양(陰陽) — 쪽지 단추. 남녀는 음양이라, 서로 다른 기운이 만나는 문양.
// 금빛 반쪽이 차오르고 반쪽은 비어 있다 — 채움과 비움이 한 원 안에.
function YinYang({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* 바깥 원 */}
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      {/* 찬 반쪽(왼) + 아래 불룩 — 가운데 점은 구멍으로 비운다 */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
      />
      {/* 빈 반쪽의 점 — 금빛 한 점 */}
      <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
    </svg>
  );
}

// 서버 시각 → "8.20 14:05" (아직 안 붙었으면 "방금")
function stamp(t?: { seconds: number }): string {
  if (!t) return "방금";
  const d = new Date(t.seconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "14:30" → "오후 2:30", "09:00" → "오전 9시"
function timeLabel(t: string): string {
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const half = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${half} ${h12}시` : `${half} ${h12}:${String(m).padStart(2, "0")}`;
}

// "2026-08-25" → "8.25 (D-6)" — 약속 날짜 표시용
function legacyDate(meetDate: string): string {
  const [y, m, d] = meetDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  const dday = diff === 0 ? "오늘" : diff > 0 ? `D-${diff}` : "지남";
  return `${m}.${d} (${dday})`;
}

// 댓글 손길(좋아요/싫어요) — 계정마다 이 브라우저에서 하나씩
type VoteDir = "up" | "down";
const voteKey = (uid?: string | null) => `hwadoo-cvote-v2:${uid ?? "anon"}`;
function loadVotes(uid?: string | null): Record<string, VoteDir> {
  try {
    return JSON.parse(window.localStorage.getItem(voteKey(uid)) ?? "{}");
  } catch {
    return {};
  }
}
function keepVotes(uid: string | null | undefined, v: Record<string, VoteDir>) {
  try {
    window.localStorage.setItem(voteKey(uid), JSON.stringify(v));
  } catch {
    // 못 적어도 화면 상태는 유지된다
  }
}

const GENDER_FILTER_KEY = "hwadoo-gathering-gender-filter";

type Props = {
  initialTemple?: string;
  initialDate?: string; // "YYYY-MM-DD"
  autoOpen?: boolean; // 처음부터 글쓰기 화면으로 시작한다
  // 화면이 바뀔 때 알린다 — 절로 페이지가 글 읽기/쓰기 중에는
  // 아래(지도·다가오는 날)를 접기 위해 쓴다
  onViewChange?: (view: "list" | "post" | "write") => void;
};

export default function GatheringBoard({
  initialTemple,
  initialDate,
  autoOpen,
  onViewChange,
}: Props) {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);

  // 화면 — 글쓰기(open) > 글 읽기(selectedId) > 목록
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 글쓰기 폼 — 절·날짜·시간은 선택
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<GatheringCategory>("together");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  // 연꽃 잔고 — 목록 오른쪽 위에 늘 보인다
  const [lotusBal, setLotusBal] = useState<number | null>(null);

  // 합장 — 계정당 하나, 토글
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeHint, setLikeHint] = useState(false);

  // 갈래 보기 필터 — 동행/도반 찾기/울력·봉사 중 골라 보기
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | GatheringCategory
  >("all");

  // 음양 보기 필터 — 음(여)만·양(남)만 골라 보기. 기기에 기억해 둔다.
  const [genderFilter, setGenderFilter] = useState<"all" | "m" | "f">("all");
  useEffect(() => {
    const saved = window.localStorage.getItem(GENDER_FILTER_KEY);
    if (saved === "m" || saved === "f") setGenderFilter(saved);
  }, []);
  const setFilter = (next: "all" | "m" | "f") => {
    setGenderFilter(next);
    try {
      window.localStorage.setItem(GENDER_FILTER_KEY, next);
    } catch {
      // 못 적어도 필터는 이 화면에서 그대로 작동한다
    }
  };

  // ⋯ 메뉴 — 고치기·내리기
  const [menuOpen, setMenuOpen] = useState(false);

  // 댓글
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [rBody, setRBody] = useState("");
  const [votes, setVotes] = useState<Record<string, VoteDir>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());

  // 연꽃 팝업 — 쪽지 청하기
  const [dmTarget, setDmTarget] = useState<{
    postId: string;
    uid: string;
    name: string;
  } | null>(null);
  const [dmIntro, setDmIntro] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  const [dmNeed, setDmNeed] = useState(false);
  const [dmLotus, setDmLotus] = useState<number | null>(null);
  const [threadByKey, setThreadByKey] = useState<Record<string, DmThread>>({});

  useEffect(() => watchAuth(setUser), []);

  // 지금 화면을 밖에 알린다 — 글쓰기 > 글 읽기 > 목록
  useEffect(() => {
    onViewChange?.(open ? "write" : selectedId ? "post" : "list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  // ── 뒤로가기 — 층을 쌓고, popstate 가 위에서부터 접는다 ──────
  const pushLayer = () => {
    try {
      window.history.pushState({ hwadooLayer: true }, "");
    } catch {
      // 못 쌓아도 화면은 열린다
    }
  };
  // 최신 상태를 popstate 가 읽도록 ref 로 비춘다
  const layersRef = useRef({ dm: false, form: false, detail: false });
  layersRef.current = {
    dm: !!dmTarget,
    form: open,
    detail: !!selectedId,
  };
  useEffect(() => {
    const onPop = () => {
      const l = layersRef.current;
      if (l.dm) {
        setDmTarget(null);
        return;
      }
      if (l.form) {
        setOpen(false);
        setFormError("");
        return;
      }
      if (l.detail) {
        setSelectedId(null);
        setMenuOpen(false);
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // 화면의 닫기 단추들 — 직접 닫지 않고 뒤로가기를 부른다 (층을 함께 걷어내려고)
  const goBack = () => window.history.back();

  useEffect(() => {
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
  }, []);

  // 메뉴에서 이 화면을 다시 누르면 — 층을 다 접고 목록으로 돌아간다
  useEffect(() => {
    const reset = () => {
      setDmTarget(null);
      setOpen(false);
      setSelectedId(null);
      setMenuOpen(false);
    };
    window.addEventListener("hwadoo-nav-home", reset);
    return () => window.removeEventListener("hwadoo-nav-home", reset);
  }, []);

  // 댓글 손길 — 계정이 바뀌면 그 계정의 기록을 읽는다
  useEffect(() => {
    setVotes(loadVotes(user?.uid));
  }, [user]);

  // 내가 청해 둔 쪽지 대화들
  useEffect(() => {
    if (!user || !dmVisible(user.uid)) return;
    fetchMyThreads()
      .then((list) => {
        const m: Record<string, DmThread> = {};
        for (const t of list)
          if (t.requesterUid === user.uid) m[`${t.postId}|${t.ownerUid}`] = t;
        setThreadByKey(m);
      })
      .catch(() => {});
  }, [user]);

  // 지도 팝업에서 절 이름·날짜가 넘어오면 — 폼에 미리 채우고 연다
  useEffect(() => {
    if (initialTemple) setTemple(initialTemple);
    if (initialDate) setDate(initialDate);
    if (autoOpen || initialTemple || initialDate) {
      setOpen(true);
      pushLayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 연꽃 잔고 — 로그인하면 살핀다
  useEffect(() => {
    if (!user) {
      setLotusBal(null);
      return;
    }
    getLotus()
      .then(setLotusBal)
      .catch(() => {});
  }, [user]);

  const refresh = () => {
    fetchPosts("gathering")
      .then((list) => {
        setPosts(list);
        setLoadError(false);
      })
      .catch(() => {
        // 못 읽어 왔다고 빈 화면을 내놓지 않는다 — 마지막으로 본 목록을 세운다.
        // 글은 서버에 그대로 있다. 낡은 것을 보여 주는 편이 없는 것처럼
        // 보이는 것보다 낫다.
        setPosts((now) => now ?? cachedPosts("gathering"));
        setLoadError(true);
      });
  };
  useEffect(refresh, []);

  // 글에 들어가면 — 댓글·내 합장을 불러오고, 조회를 하나 올린다(세션당 한 번)
  useEffect(() => {
    if (!selectedId) return;
    setLikeHint(false);
    setDmTarget(null);
    setReplyTo(null);
    setMenuOpen(false);
    if (!commentsMap[selectedId]) {
      fetchComments(selectedId)
        .then((list) =>
          setCommentsMap((m) => ({ ...m, [selectedId]: list }))
        )
        .catch(() => setCommentsMap((m) => ({ ...m, [selectedId]: [] })));
    }
    if (user && likedMap[selectedId] === undefined) {
      fetchMyLike(selectedId)
        .then((v) => setLikedMap((m) => ({ ...m, [selectedId]: v })))
        .catch(() => {});
    }
    try {
      const key = `hwadoo-viewed:${selectedId}`;
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, "1");
        setPosts(
          (list) =>
            list?.map((x) =>
              x.id === selectedId ? { ...x, views: (x.views ?? 0) + 1 } : x
            ) ?? null
        );
        viewPost(selectedId).catch(() => {});
      }
    } catch {
      // 세션 저장이 막혀도 글은 보인다
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user]);

  // 연꽃 팝업이 열리면 — 잔고를 살핀다
  useEffect(() => {
    if (!dmTarget || !user) return;
    setDmNeed(false);
    setDmLotus(null);
    getLotus()
      .then(setDmLotus)
      .catch(() => {});
  }, [dmTarget, user]);

  // 글쓰기 자격 — 로그인 + 1회향 (글·댓글 공통)
  const qualified = !!user && returnedCount >= 1;

  // 지금 무언가 거르고 있는가 — 「없다」와 「걸러서 안 보인다」를 가르는 표
  const filtering = genderFilter !== "all" || categoryFilter !== "all";
  const clearFilters = () => {
    setGenderFilter("all");
    setCategoryFilter("all");
  };

  const sorted = useMemo(() => {
    const list = (posts ?? []).filter(
      (p) =>
        // 내려진 글은 목록에서 아예 뺀다 — 첫 화면이 '삭제된 글입니다'로
        // 도배되면 갓 온 사람에게 버려진 판으로 보인다 (댓글·자리는 남아
        // 있으니, 링크로 직접 열면 여전히 닿는다)
        !p.deleted &&
        (genderFilter === "all" || p.gender === genderFilter) &&
        (categoryFilter === "all" || (p.category ?? "together") === categoryFilter)
    );
    list.sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    return list;
  }, [posts, genderFilter, categoryFilter]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setText("");
    setTemple("");
    setDate("");
    setTime("");
    setCategory("together");
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    setBusy(true);
    try {
      const input = {
        title,
        body: text,
        templeName: temple || undefined,
        meetDate: date || undefined,
        meetTime: time || undefined,
        category,
      };
      if (editingId) await updateGathering(editingId, input);
      else {
        await createGathering(input);
        addMerit("gathering");
        grantCharm("inyeon"); // 첫 글을 올린 사람에게 인연부
      }
      resetForm();
      refresh();
      goBack(); // 층을 걷으며 닫는다 — 고치기였다면 글로 돌아간다
    } catch (e) {
      setFormError(
        e instanceof Error && e.message
          ? e.message
          : "글을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요."
      );
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setTitle(p.title);
    setText(p.body);
    setTemple(p.templeName ?? "");
    setDate(p.meetDate ?? "");
    setTime(p.meetTime ?? "");
    setCategory(p.category ?? "together");
    setFormError("");
    setMenuOpen(false);
    setOpen(true);
    pushLayer();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 합장(공감) — 계정당 하나, 다시 누르면 거둔다
  const like = async (p: Post) => {
    if (!user) {
      setLikeHint(true);
      return;
    }
    const cur = !!likedMap[p.id];
    const delta = cur ? -1 : 1;
    setLikedMap((m) => ({ ...m, [p.id]: !cur }));
    setPosts(
      (list) =>
        list?.map((x) =>
          x.id === p.id ? { ...x, hapjang: Math.max(0, x.hapjang + delta) } : x
        ) ?? null
    );
    try {
      const changed = cur ? await unlikePost(p.id) : await likePost(p.id);
      if (!changed) {
        // 서버 상태와 어긋났다 — 셈만 되돌린다
        setPosts(
          (list) =>
            list?.map((x) =>
              x.id === p.id
                ? { ...x, hapjang: Math.max(0, x.hapjang - delta) }
                : x
            ) ?? null
        );
      }
    } catch {
      setLikedMap((m) => ({ ...m, [p.id]: cur }));
      setPosts(
        (list) =>
          list?.map((x) =>
            x.id === p.id
              ? { ...x, hapjang: Math.max(0, x.hapjang - delta) }
              : x
          ) ?? null
      );
    }
  };

  const remove = async (p: Post) => {
    setMenuOpen(false);
    const ok = await confirm(
      "이 글을 내리겠습니까?",
      "'삭제된 글입니다'로 자리만 남고, 댓글은 그대로 남습니다.",
      { confirm: "내리기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await deletePost(p.id);
      setPosts(
        (list) =>
          list?.map((x) =>
            x.id === p.id
              ? {
                  ...x,
                  deleted: true,
                  title: "삭제된 글입니다",
                  body: "작성자가 내린 글입니다.",
                  templeName: null,
                  meetDate: null,
                  meetTime: null,
                  gender: null,
                }
              : x
          ) ?? null
      );
      goBack(); // 글 층을 걷고 목록으로
    } catch {
      // 권한·연결 문제 — 화면은 그대로
    }
  };

  const isMine = (p: Post) =>
    !!user && (user.uid === p.authorUid || isAdminAccount(user));

  // 연꽃 — 이 사람에게 쪽지 팝업을 연다
  const openLantern = (p: Post, uid: string, name: string) => {
    setDmIntro("");
    setDmNeed(false);
    setDmTarget({ postId: p.id, uid, name });
    pushLayer();
  };

  const submitDmRequest = async (p: Post) => {
    if (!dmTarget) return;
    setDmBusy(true);
    setDmNeed(false);
    try {
      const t = await requestThread(
        p,
        { uid: dmTarget.uid, name: dmTarget.name },
        dmIntro
      );
      if (t === "need-lotus") {
        setDmNeed(true);
        return;
      }
      setThreadByKey((m) => ({ ...m, [`${p.id}|${dmTarget.uid}`]: t }));
      setDmIntro("");
      getLotus().then(setLotusBal).catch(() => {});
      goBack(); // 팝업 층을 걷는다
    } catch {
      // 연결·권한 문제 — 입력은 남긴다
    } finally {
      setDmBusy(false);
    }
  };

  // 댓글·답글 남기기
  const submitComment = async (p: Post, body: string, parentId?: string) => {
    const textBody = body.trim();
    if (!textBody) return;
    setCBusy(true);
    try {
      await addComment(p.id, textBody.slice(0, 300), parentId);
      if (parentId) {
        setRBody("");
        setReplyTo(null);
      } else {
        setCBody("");
      }
      const list = await fetchComments(p.id);
      setCommentsMap((m) => ({ ...m, [p.id]: list }));
      setPosts(
        (ps) =>
          ps?.map((x) =>
            x.id === p.id ? { ...x, commentCount: x.commentCount + 1 } : x
          ) ?? null
      );
    } catch {
      // 연결·권한 문제 — 입력은 남겨 둔다
    } finally {
      setCBusy(false);
    }
  };

  const removeComment = async (p: Post, c: Comment) => {
    try {
      await deleteComment(p.id, c.id);
      setCommentsMap((m) => ({
        ...m,
        [p.id]: (m[p.id] ?? []).filter((x) => x.id !== c.id),
      }));
      setPosts(
        (ps) =>
          ps?.map((x) =>
            x.id === p.id
              ? { ...x, commentCount: Math.max(0, x.commentCount - 1) }
              : x
          ) ?? null
      );
    } catch {
      // 조용히
    }
  };

  // 댓글 좋아요/싫어요 — 계정당 하나. 갈아타면 앞의 것은 거둬진다.
  const vote = async (p: Post, c: Comment, dir: VoteDir) => {
    const cur = votes[c.id];
    const deltas: { up?: number; down?: number } = {};
    let next: Record<string, VoteDir>;
    if (cur === dir) {
      // 다시 누름 — 거둔다
      deltas[dir] = -1;
      next = { ...votes };
      delete next[c.id];
    } else if (cur) {
      // 갈아탄다 — 앞의 것을 거두고 새로 얹는다
      deltas[cur] = -1;
      deltas[dir] = 1;
      next = { ...votes, [c.id]: dir };
    } else {
      deltas[dir] = 1;
      next = { ...votes, [c.id]: dir };
    }
    setVotes(next);
    keepVotes(user?.uid, next);
    setCommentsMap((m) => ({
      ...m,
      [p.id]: (m[p.id] ?? []).map((x) =>
        x.id === c.id
          ? {
              ...x,
              up: Math.max(0, (x.up ?? 0) + (deltas.up ?? 0)),
              down: Math.max(0, (x.down ?? 0) + (deltas.down ?? 0)),
            }
          : x
      ),
    }));
    try {
      await voteComment(p.id, c.id, deltas);
    } catch {
      // 셈은 부차 — 실패해도 조용히
    }
  };

  const report = async (p: Post, c: Comment) => {
    if (!user || reported.has(c.id)) return;
    const ok = await confirm(
      "이 댓글을 신고하시겠습니까?",
      "신고는 관리자에게 전해져 살펴봅니다.",
      { confirm: "신고하기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await reportComment(p.id, c);
      setReported((s) => new Set(s).add(c.id));
    } catch {
      // 조용히
    }
  };

  // 프로필 태극이 곧 쪽지 단추 — 누르면 그 사람에게 쪽지 팝업.
  // 이미 대화가 있으면 모서리에 금점 하나.
  const profileFor = (
    p: Post,
    uid: string,
    name: string,
    g: "m" | "f" | null | undefined,
    cls: string
  ) => {
    if (!dmVisible(user?.uid)) return <GenderMark g={g} className={cls} />;
    const has = !!threadByKey[`${p.id}|${uid}`];
    return (
      <button
        onClick={() => openLantern(p, uid, name)}
        title={has ? "쪽지함으로" : "쪽지 보내기"}
        aria-label={`${name}에게 쪽지 보내기`}
        className="relative shrink-0 rounded-full transition-transform active:scale-90"
      >
        <GenderMark g={g} className={cls} />
        {has && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold shadow-[0_0_5px_var(--color-gold)]"
          />
        )}
      </button>
    );
  };

  // ── 연꽃 팝업 — 쪽지 청하기 ──────────────────────────────
  const lanternModal = () => {
    if (!dmTarget) return null;
    const p = posts?.find((x) => x.id === dmTarget.postId);
    if (!p) return null;
    const thread = threadByKey[`${p.id}|${dmTarget.uid}`];
    return (
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
        onClick={goBack}
      >
        <div
          className="w-full max-w-sm rounded-[16px] border border-gold/30 bg-ink-2 px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="flex items-center gap-2 text-[15.5px] tracking-wide text-hanji">
            <YinYang className="h-[22px] w-[22px] text-gold" />
            {dmTarget.name} 님에게 쪽지
          </p>

          {!user ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              쪽지는 로그인한 분만 보낼 수 있습니다 — 왼쪽 아래(모바일은 내
              도량)에서 로그인해 주세요.
            </p>
          ) : user.uid === dmTarget.uid ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              내 이름 곁의 음양입니다. 다른 수행자의 문양을 눌러 보세요.
            </p>
          ) : thread ? (
            <>
              <p className="mt-3 text-[12px] leading-6 text-hanji-dim">
                {thread.status === "accepted"
                  ? "대화가 열려 있습니다."
                  : thread.status === "pending"
                    ? "청을 넣었습니다."
                    : "지난 청은 거절되었습니다."}
              </p>
              <Link
                href="/letters"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2.5 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                쪽지함 →
              </Link>
            </>
          ) : dmNeed ? (
            <>
              <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
                연꽃이 없습니다 — 연꽃 한 송이(1,000원)로 쪽지를 청할 수
                있습니다.
              </p>
              <Link
                href="/lotus"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2.5 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                연꽃 얻기 →
              </Link>
            </>
          ) : (
            <>
              <textarea
                value={dmIntro}
                onChange={(e) => setDmIntro(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="한 마디와 함께"
                className="mt-3 w-full resize-none rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-3 text-[15px] leading-7 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitDmRequest(p)}
                disabled={dmBusy || !dmIntro.trim()}
                className="btn-obang mt-3 w-full rounded-[10px] py-3 text-[14px] tracking-[0.15em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {dmBusy
                  ? "보내는 중…"
                  : isAdminAccount(user)
                    ? "쪽지 청하기"
                    : "쪽지 청하기 — 연꽃 1송이"}
              </button>
              {isAdminAccount(user) ? (
                <p className="mt-2.5 text-center text-[11px] leading-5 text-gold-soft">
                  뒷방 주인 — 연꽃 없이 무제한으로 청할 수 있습니다
                </p>
              ) : (
                <p className="mt-2.5 break-keep text-center text-[11px] leading-5 text-hanji-faint">
                  내 연꽃{" "}
                  <span className="text-gold">
                    {dmLotus === null ? "…" : dmLotus}
                  </span>
                  송이 · 처음 오신 분께는 {FIRST_GRANT}송이를 드립니다 ·
                  수락되면 대화는 무료
                </p>
              )}
            </>
          )}

          <button
            onClick={goBack}
            className="mt-3.5 w-full text-center text-[12.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // ── 댓글 한 덩이 ─────────────────────────────────────────
  const renderComment = (p: Post, c: Comment, isReply: boolean) => {
    const my = votes[c.id];
    return (
      <li
        key={c.id}
        className={isReply ? "ml-5 border-l border-ink-3/60 pl-3" : ""}
      >
        {/* 프로필 태극(누르면 쪽지) · 이름 · 시간(작게) */}
        <div className="flex items-center gap-2">
          {profileFor(p, c.authorUid, c.authorName, c.gender, "h-7 w-7")}
          <span className="text-[13px] text-hanji-dim">{c.authorName}</span>
          <RankBadge hanja={c.rankHanja} />
          <span className="text-[10.5px] tracking-wide text-hanji-faint">
            {stamp(c.createdAt)}
          </span>
        </div>
        <p
          className={`mt-0.5 break-keep pl-9 text-[14.5px] leading-6 ${
            c.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {c.body}
        </p>
        {c.deleted ? null : (
        <p className="mt-0.5 flex items-center gap-3 pl-9 text-[12px] tracking-wide text-hanji-faint">
          {!isReply && (
            <button
              onClick={() => {
                setRBody("");
                setReplyTo(replyTo === c.id ? null : c.id);
              }}
              className="transition-colors hover:text-hanji-dim"
            >
              답글
            </button>
          )}
          <button
            onClick={() => vote(p, c, "up")}
            className={`transition-colors ${
              my === "up" ? "font-medium text-gold" : "hover:text-gold-soft"
            }`}
          >
            좋아요{(c.up ?? 0) > 0 ? ` ${c.up}` : ""}
          </button>
          <button
            onClick={() => vote(p, c, "down")}
            className={`transition-colors ${
              my === "down"
                ? "font-medium text-vermilion"
                : "hover:text-hanji-dim"
            }`}
          >
            싫어요{(c.down ?? 0) > 0 ? ` ${c.down}` : ""}
          </button>
          {!!user && user.uid !== c.authorUid && (
            <button
              onClick={() => report(p, c)}
              disabled={reported.has(c.id)}
              className="transition-colors enabled:hover:text-vermilion disabled:opacity-60"
            >
              {reported.has(c.id) ? "신고됨" : "신고"}
            </button>
          )}
          {!!user && (user.uid === c.authorUid || isAdminAccount(user)) && (
            <button
              onClick={() => removeComment(p, c)}
              className="transition-colors hover:text-vermilion"
            >
              지우기
            </button>
          )}
        </p>
        )}
        {replyTo === c.id && !isReply && (
          <div className="mt-1.5 flex items-center gap-2 pl-9">
            <input
              value={rBody}
              onChange={(e) => setRBody(e.target.value)}
              maxLength={300}
              placeholder="답글"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  void submitComment(p, rBody, c.id);
              }}
              className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[14px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <button
              onClick={() => submitComment(p, rBody, c.id)}
              disabled={cBusy || !rBody.trim()}
              className="shrink-0 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-40"
            >
              {cBusy ? "…" : "남기기"}
            </button>
          </div>
        )}
      </li>
    );
  };

  // ── 글 읽기 ─────────────────────────────────────────────
  const renderDetail = (p: Post) => {
    const mine = isMine(p);
    const comments = commentsMap[p.id];
    const liked = !!likedMap[p.id];
    const all = comments ?? [];
    const ids = new Set(all.map((c) => c.id));
    const tops = all.filter((c) => !c.parentId || !ids.has(c.parentId));
    const childrenOf = (id: string) => all.filter((c) => c.parentId === id);
    // 청실홍실 — 글을 올린 이와 처음 붙은 다른 사람. 그 둘이 이어진 자리다.
    const tied = all.find((c) => c.authorUid && c.authorUid !== p.authorUid);

    return (
      <div className="px-4 pb-28 sm:px-0 md:pb-0">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={goBack}
            className="text-[13.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            ← 목록
          </button>
          {/* ⋯ 메뉴 — 고치기·내리기 (내려진 글에는 없다) */}
          {mine && !p.deleted && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="글 메뉴"
                aria-expanded={menuOpen}
                className="rounded-full px-2 py-0.5 text-[16px] leading-none tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-28 overflow-hidden rounded-[12px] border border-ink-3 bg-ink-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                  <button
                    onClick={() => startEdit(p)}
                    className="block w-full px-4 py-2.5 text-left text-[12.5px] text-hanji-dim transition-colors hover:bg-gold/10 hover:text-hanji"
                  >
                    고치기
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="block w-full border-t border-ink-3/60 px-4 py-2.5 text-left text-[12.5px] text-hanji-dim transition-colors hover:bg-vermilion/10 hover:text-vermilion"
                  >
                    내리기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 갈래 — 동행이 아닐 때만 밝힌다 (내려진 글엔 없다) */}
        {!p.deleted && p.category && p.category !== "together" && (
          <p className="mt-3 text-[11px] tracking-[0.2em] text-gold-soft">
            {categoryLabel(p.category)}
          </p>
        )}

        {/* 제목 — 바로 붙여 위로 당긴다 (내려진 글은 흐리게) */}
        <h2
          className={`mt-2 break-keep font-serif text-[21px] font-medium leading-8 ${
            p.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {p.title}
        </h2>

        {/* 글쓴이 — 프로필 태극을 누르면 쪽지 · 오른쪽 끝에 조회·시간 작게 */}
        <div className="mt-2 flex items-center gap-2">
          {profileFor(p, p.authorUid, p.authorName, p.gender, "h-9 w-9")}
          <span className="text-[13.5px] text-hanji-dim">{p.authorName}</span>
          <RankBadge hanja={p.rankHanja} />
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[10.5px] tracking-wide text-hanji-faint">
            <span className="flex items-center gap-1">
              <EyeIcon className="h-[12px] w-[12px]" />
              {p.views ?? 0}
            </span>
            <span>{stamp(p.createdAt)}</span>
          </span>
        </div>

        {/* 청실홍실 — 함께 가겠다는 이가 붙으면 실이 걸린다 */}
        {tied && (
          <div className="mt-4">
            <InyeonThread
              leftName={p.authorName}
              rightName={tied.authorName}
              leftGender={p.gender}
              rightGender={tied.gender}
            />
          </div>
        )}

        {/* 내용 */}
        <p
          className={`mt-3 whitespace-pre-line break-keep text-[15.5px] font-light leading-[1.85] ${
            p.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {p.body}
        </p>

        {/* 약속 — 절·날짜·시간 (적은 것만) */}
        {(p.templeName || p.meetDate) && (
          <p className="mt-2.5 text-[12.5px] tracking-wide text-gold-soft">
            약속{p.templeName ? ` ${p.templeName}` : ""}
            {p.meetDate ? ` · ${legacyDate(p.meetDate)}` : ""}
            {p.meetTime ? ` · ${timeLabel(p.meetTime)}` : ""}
          </p>
        )}

        {/* 합장 — 가운데 동그라미 하나 (내려진 글에는 없다) */}
        {p.deleted ? null : (
        <div className="mt-4 flex flex-col items-center gap-1">
          <button
            onClick={() => like(p)}
            aria-pressed={liked}
            aria-label="합장"
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-[19px] transition-all active:scale-90 ${
              liked
                ? "border-gold/60 bg-gold/10"
                : "border-ink-3 hover:border-gold/40"
            }`}
          >
            🙏
          </button>
          <span
            className={`text-[11px] tracking-wide ${
              liked ? "text-gold" : "text-hanji-faint"
            }`}
          >
            합장{p.hapjang > 0 ? ` ${p.hapjang}` : ""}
          </span>
          {likeHint && !user && (
            <span className="text-[10.5px] text-hanji-faint">
              로그인한 분만
            </span>
          )}
        </div>
        )}

        {/* 댓글들 — 다닥다닥, 사이를 아낀다 */}
        <div className="mt-4 border-t border-ink-3/60 pt-3">
          <p className="text-[11px] tracking-[0.25em] text-hanji-faint">
            댓글{p.commentCount > 0 ? ` · ${p.commentCount}` : ""}
          </p>
          {comments === undefined ? (
            <p className="mt-2.5 text-[12px] leading-6 text-hanji-faint">
              댓글을 살펴보는 중…
            </p>
          ) : tops.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-3">
              {tops.map((c) => (
                <li key={c.id}>
                  <ul className="flex flex-col gap-2">
                    {renderComment(p, c, false)}
                    {childrenOf(c.id).map((r) => renderComment(p, r, true))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}

          {/* 주의 — 작게 한 줄 */}
          <p className="mt-5 break-keep text-[10px] leading-4 text-hanji-faint/80">
            처음 만나는 자리는 사찰 등 열린 곳에서 · 연락처 등 개인정보는
            아껴 주세요.
          </p>
        </div>

        {/* 댓글 쓰기 — 모바일은 아래 탭 바로 위에 고정 (내려진 글은 닫힘).
            오른쪽에 떠 있는 도량 단추가 「남기기」를 덮고 있었다. 단추 자리만큼
            오른쪽을 비운다(단추 48 + 좌우 여유). 넓은 화면에서는 단추가
            바닥 구석에 있으니 그대로 둔다. */}
        <div className="fixed inset-x-0 bottom-[76px] z-[45] border-t border-ink-3 bg-ink-2/95 py-2.5 pl-4 pr-[74px] backdrop-blur md:static md:z-auto md:mt-5 md:border-0 md:bg-transparent md:p-0">
          {p.deleted ? (
            <p className="break-keep text-center text-[11px] leading-5 text-hanji-faint md:text-left">
              내려진 글에는 새 댓글을 달 수 없습니다.
            </p>
          ) : qualified ? (
            <div className="flex items-center gap-2">
              <input
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                maxLength={300}
                placeholder="댓글 쓰기"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing)
                    void submitComment(p, cBody);
                }}
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitComment(p, cBody)}
                disabled={cBusy || !cBody.trim()}
                className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2.5 text-[11px] tracking-[0.15em] text-gold transition-colors enabled:hover:bg-gold/10 disabled:opacity-40"
              >
                {cBusy ? "…" : "남기기"}
              </button>
            </div>
          ) : (
            <p className="break-keep text-center text-[11px] leading-5 text-hanji-faint md:text-left">
              {!user
                ? "댓글은 로그인한 분만 쓸 수 있습니다."
                : "댓글은 화두 하나를 회향한 뒤에 쓸 수 있습니다."}
            </p>
          )}
        </div>

        {lanternModal()}
      </div>
    );
  };

  // ── 화면 가르기 — 글쓰기 > 글 읽기 > 목록 ──────────────────
  const selected = selectedId
    ? (posts?.find((x) => x.id === selectedId) ?? null)
    : null;

  if (open) {
    return (
      <div ref={formRef} className="scroll-mt-6 px-4 sm:px-0">
        <button
          onClick={goBack}
          className="text-[13.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 뒤로
        </button>
        {!qualified ? (
          <p className="mt-4 break-keep text-[13px] leading-7 text-hanji-dim">
            {!user
              ? "글을 쓰려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주세요."
              : "화두 하나를 회향한 뒤에 글을 쓸 수 있습니다."}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.25em] text-gold-soft">
              {editingId ? "글 고치기" : "글 쓰기"}
            </p>
            {/* 갈래 — 동행 / 도반 찾기 / 울력·봉사 */}
            <div className="flex flex-wrap gap-2">
              {GATHERING_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}
                  title={c.hint}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] tracking-wide transition-colors ${
                    category === c.key
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="제목"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[16px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="내용"
              className="resize-none rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15.5px] leading-8 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            {/* 어느 절로, 언제 — 전부 선택 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* 절 — 골라 쓴다.
                  예전엔 빈 칸에 datalist 만 물려 두었는데, 브라우저가 화살표를
                  안 그려 주니 아무도 목록이 있는 줄 몰랐다. 그냥 빈 칸으로 보였고
                  「봉은사」「서울 봉은사」「봉은사(삼성동)」이 제각각 올라왔다.
                  목록에서 고르게 하면 이름이 하나로 모이고, 절 이름으로 거르는
                  일도 그제야 맞아떨어진다. 없는 절은 「직접 적기」로. */}
              <div className="min-w-0 flex-1">
                <select
                  value={TEMPLE_NAMES.includes(temple) || temple === "" ? temple : "__etc"}
                  onChange={(e) => setTemple(e.target.value === "__etc" ? " " : e.target.value)}
                  aria-label="절 고르기"
                  className={`w-full appearance-none rounded-[10px] border border-ink-3 bg-transparent bg-[length:11px] bg-[right_16px_center] bg-no-repeat px-4 py-3 pr-10 text-[15px] outline-none transition-colors focus:border-gold/40 ${
                    temple ? "text-hanji" : "text-hanji-faint"
                  }`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%238a8175' stroke-width='1.6'><path d='M1 1.5 6 6.5 11 1.5'/></svg>\")",
                  }}
                >
                  <option value="">절 고르기 (선택)</option>
                  {TEMPLES.map((t) => (
                    <option key={t.name + t.address} value={t.name} className="bg-ink-2">
                      {t.name} · {t.region}
                    </option>
                  ))}
                  <option value="__etc" className="bg-ink-2">
                    목록에 없어요 — 직접 적기
                  </option>
                </select>
                {!TEMPLE_NAMES.includes(temple) && temple !== "" && (
                  <input
                    value={temple.trim()}
                    onChange={(e) => setTemple(e.target.value)}
                    maxLength={30}
                    autoFocus
                    placeholder="절 이름을 적어 주세요"
                    className="mt-2 w-full rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                  />
                )}
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="날짜 (선택)"
                title="날짜 (선택)"
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="시간 (선택)"
                title="시간 (선택)"
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
            </div>
            <p className="text-[11.5px] leading-5 text-hanji-faint">
              양/음(남·여) 문양은 내 도량에서 설정할 수 있습니다.
            </p>
            {formError && (
              <p className="text-[12px] leading-6 text-vermilion">
                {formError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={busy || !title.trim() || !text.trim()}
                className="btn-obang rounded-[10px] px-6 py-2.5 text-[12px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {busy
                  ? editingId
                    ? "고치는 중…"
                    : "올리는 중…"
                  : editingId
                    ? "고쳐 적기"
                    : "올리기"}
              </button>
              <button
                onClick={goBack}
                className="text-[12px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                접기
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selected) return renderDetail(selected);

  // ── 목록 — 제목만 쭉, 화면 가득 ─────────────────────────
  return (
    <div>
      {/* 갈래 필터 — 전체 / 동행 / 도반 찾기 / 울력·봉사 */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2.5 pt-1 sm:px-0">
        {[{ key: "all" as const, label: "전체", hint: "" }, ...GATHERING_CATEGORIES].map(
          (c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              aria-pressed={categoryFilter === c.key}
              className={`rounded-full border px-3 py-1 text-[11.5px] tracking-wide transition-colors ${
                categoryFilter === c.key
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              {c.label}
            </button>
          )
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-2 sm:px-0">
        {/* 보기 필터 — 음(여)만·양(남)만 골라 보기, 작게 */}
        <div className="flex items-center gap-3 text-[11px] tracking-wide text-hanji-faint">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={genderFilter === "f"}
              onChange={(e) => setFilter(e.target.checked ? "f" : "all")}
              className="h-3.5 w-3.5 accent-[#D9B45B]"
            />
            음만 보기
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={genderFilter === "m"}
              onChange={(e) => setFilter(e.target.checked ? "m" : "all")}
              className="h-3.5 w-3.5 accent-[#D9B45B]"
            />
            양만 보기
          </label>
          {/* 거르고 있으면 눈에 걸리게 — 켜 둔 줄 모르고 「글이 없어졌다」고
              여기는 일이 있었다. 누르면 한 번에 풀린다. */}
          {filtering && (
            <button
              onClick={clearFilters}
              className="ml-1 shrink-0 rounded-full border border-gold/55 bg-gold/15 px-2.5 py-1 text-[11px] text-gold transition-colors hover:bg-gold/25"
            >
              풀기 ✕
            </button>
          )}
        </div>

        {/* 서랍 사본으로 버티는 중 — 이 말이 없으면 「왜 새 글이 없지」 한다 */}
        {loadError && !!posts?.length && (
          <p className="mt-2 flex items-center gap-2 break-keep text-[11.5px] leading-5 text-hanji-faint">
            <span>지금은 연결이 안 되어 지난번에 본 목록을 보이고 있습니다.</span>
            <button
              onClick={refresh}
              className="shrink-0 rounded-full border border-gold/45 px-2.5 py-1 text-[11px] text-gold transition-colors hover:bg-gold/10"
            >
              다시
            </button>
          </p>
        )}
        <div className="flex shrink-0 items-center gap-2">
        {/* 연꽃 잔고 — 누르면 연꽃 공양(구매)으로 */}
        <Link
          href="/lotus"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[13.5px] tracking-[0.1em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          <Yeonkkot className="h-[17px] w-[17px]" />
          연꽃{user && lotusBal !== null ? ` ${lotusBal}` : ""}
        </Link>
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
            pushLayer();
          }}
          className="rounded-[10px] border border-gold/50 px-4 py-2 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
        >
          글 쓰기
        </button>
        </div>
      </div>

      <ul className="divide-y divide-ink-3/60 border-y border-ink-3/60">
        {/* ★ 못 읽어 온 것을 먼저 본다.
            앞서는 posts === null 을 먼저 보느라, 읽기가 엎어지면
            「살펴보는 중…」에 영영 갇혔다. */}
        {/* 못 불러왔을 때 — 서랍에 사본이 있으면 **그것을 보여 준다.**
            한동안 사본을 읽어 상태에 담아 두고도 이 갈래가 먼저 걸려
            빈 칸 하나만 그렸다. 애써 받아 둔 것을 안 보여 주면 없는 것과
            같다. 위에 한 줄로 「지난번 것」이라고만 밝힌다. */}
        {loadError && !posts?.length ? (
          <li className="flex flex-col items-start gap-2.5 px-4 py-6">
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              지금 목록을 불러오지 못했습니다.
              <br />
              <span className="text-hanji-faint">
                글은 그대로 있습니다 — 사라진 것이 아닙니다.
              </span>
            </p>
            <button
              onClick={refresh}
              className="rounded-full border border-gold/45 px-4 py-2 text-[12px] text-gold transition-colors hover:bg-gold/10"
            >
              다시 불러오기
            </button>
          </li>
        ) : posts === null ? (
          <li className="px-4 py-4 text-[13px] leading-7 text-hanji-faint">
            글을 살펴보는 중…
          </li>
        ) : sorted.length === 0 && filtering ? (
          /* ★ 거른 탓에 안 보이는 것을 「없다」고 말하면 안 된다.
              「음만 보기」를 켜 둔 채 「아직 아무도 없네요」를 보고
              **글이 지워진 줄 알았다.** 있는 것을 없다고 한 셈이다. */
          <li className="flex flex-col items-center gap-3 px-4 py-10">
            <p className="break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
              거른 조건에 맞는 글이 없습니다.
              <br />
              <span className="text-hanji-faint">
                글 {(posts ?? []).filter((p) => !p.deleted).length}건이 걸러져 있습니다.
              </span>
            </p>
            <button
              onClick={clearFilters}
              className="rounded-full border border-gold/50 px-5 py-2 text-[12.5px] text-gold transition-colors hover:bg-gold/12"
            >
              전체 보기
            </button>
          </li>
        ) : sorted.length === 0 ? (
          <li className="flex flex-col items-center gap-3 px-4 py-12">
            <Dudu stage={0} mood="tilt" uid="empty" className="h-[112px] w-[112px] opacity-90" />
            <p className="break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
              아직 아무도 없네요.
              <br />
              첫 글을 올리면 제일 잘 보여요.
            </p>
          </li>
        ) : (
          sorted.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {
                  setSelectedId(p.id);
                  pushLayer();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gold/5 sm:px-2"
              >
                {/* 음양 프로필 — 왼쪽, 오른쪽 위는 제목·아래는 시간/조회/댓글 */}
                <GenderMark g={p.gender} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {!p.deleted && p.category && p.category !== "together" && (
                      <span className="shrink-0 rounded-full border border-gold/30 px-1.5 py-px text-[9.5px] leading-tight tracking-wide text-gold-soft">
                        {categoryLabel(p.category)}
                      </span>
                    )}
                    <span
                      className={`block truncate text-[15px] font-medium leading-6 ${
                        p.deleted ? "text-hanji-faint" : "text-hanji"
                      }`}
                    >
                      {p.title}
                    </span>
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-2.5 text-[11.5px] tracking-wide text-hanji-faint">
                    <span className="shrink-0">{stamp(p.createdAt)}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <EyeIcon />
                      {p.views ?? 0}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <CommentIcon />
                      {p.commentCount}
                    </span>
                    {/* 약속 — 어느 절, 언제 가고 싶은지 (적은 것만) */}
                    {(p.templeName || p.meetDate) && (
                      <span className="truncate text-gold-soft">
                        {[
                          p.templeName,
                          p.meetDate ? legacyDate(p.meetDate) : null,
                          p.meetTime ? timeLabel(p.meetTime) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
