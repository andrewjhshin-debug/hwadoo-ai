// 오늘의 인연 — 판이 서버에 묻는 말.
//
// 형: 「뽑기 → 오늘의 인연 한 장 → 합장 → 쪽지함 열기 → 차단·신고. 계속 간다」
//
// 뽑기와 합장은 서버가 쥔다(api/yeon/*). 까닭은 그 파일들에 적어 두었다 —
// 요컨대 **남의 프로필 목록이 브라우저로 내려오면 안 되고**, 「하루 한
// 사람」이 값의 근거라서다.
//
// 여기는 그 문을 두드리는 손잡이 하나뿐이다. 화면은 이것만 부른다.
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/** 서버가 추려서 주는 한 사람 — 프로필 통째가 아니다 */
export type 오늘사람 = {
  uid: string;
  name: string;
  born: number;
  area: string;
  temple: string;
  wantTemple: string;
  job: string;
  tall: number;
  mbti: string;
  vibe: string[];
  like: string[];
  care: string[];
  date: string[];
  line: string;
  rank: string;
  /** 통과된 사진만 */
  photos: string[];
};

export type 오늘 = {
  picks: 오늘사람[];
  /** 오늘 이미 합장했거나 넘긴 사람 */
  done: string[];
  /** 오늘 볼 수 있는 수 */
  cap: number;
  /** 연꽃을 써도 여기까지 */
  max: number;
};

/** 서버가 돌려주는 탈 — 화면이 사람 말로 바꿔 보여 준다 */
export type 인연탈 =
  | "no-token"
  | "bad-token"
  | "no-profile"
  | "not-open"
  | "not-today"
  | "blocked"
  | "bad-target"
  | "server-not-ready"
  | "무엇인가";

async function 표() {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  return `Bearer ${await u.getIdToken()}`;
}

export async function 오늘뽑기(): Promise<오늘 | { 탈: 인연탈 }> {
  const r = await fetch("/api/yeon/today", {
    headers: { authorization: await 표() },
    cache: "no-store",
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { 탈: (j?.error as 인연탈) ?? "무엇인가" };
  return j as 오늘;
}

/** 합장하거나 넘긴다. 둘 다 오늘치에서 빠진다 */
export async function 합장(
  to: string,
  act: "hap" | "pass"
): Promise<{ matched: boolean; thread?: string } | { 탈: 인연탈 }> {
  const r = await fetch("/api/yeon/hap", {
    method: "POST",
    headers: { authorization: await 표(), "content-type": "application/json" },
    body: JSON.stringify({ to, act }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { 탈: (j?.error as 인연탈) ?? "무엇인가" };
  return { matched: !!j.matched, thread: j.thread };
}

/**
 * 막는다 — 서로 다시는 뽑히지 않는다.
 *
 * 뽑기(api/yeon/today)가 이 목록을 먼저 빼고 고른다. 합장도 막힌 사이면
 * 거절한다. **판에서 사라지는 것**이라 대화 하나를 닫는 것과는 다르다.
 */
export async function 막기(uid: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await setDoc(doc(db, "yeon-blocks", u.uid, "list", uid), {
    at: serverTimestamp(),
  });
}

export async function 막은것풀기(uid: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await deleteDoc(doc(db, "yeon-blocks", u.uid, "list", uid));
}

/**
 * 신고 — 뒷방 신고함으로 간다.
 *
 * 쪽지·댓글 신고가 쓰던 `reports` 를 그대로 쓴다. 갈래(kind)만 늘린다 —
 * 신고함 하나에 다 모여야 뒷방이 한 자리에서 본다.
 */
export async function 신고(
  target: { uid: string; name?: string },
  까닭: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await addDoc(collection(db, "reports"), {
    kind: "yeon",
    targetUid: target.uid,
    byUid: u.uid,
    reason: `[인연 ${target.name ?? ""}] ${까닭}`.trim().slice(0, 300),
    status: "open",
    createdAt: serverTimestamp(),
  });
}

/** 신고 까닭 — 적게 둔다. 고르는 일이 일이 되면 아무도 안 누른다 */
export const 신고까닭 = [
  "사진이 본인이 아닙니다",
  "광고·홍보입니다",
  "불쾌한 말을 합니다",
  "미성년자로 보입니다",
] as const;
