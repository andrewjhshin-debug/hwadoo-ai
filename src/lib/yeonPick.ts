import type { Firestore } from "firebase-admin/firestore";
// 문턱 스위치 하나 — 켜면 확인 안 된 사람은 판에도 못 서고 뽑히지도 않는다
import { 본인확인_켬 } from "@/lib/yeon";
import { ADMIN_UID } from "@/lib/config";

// 인연 — 서버끼리 나눠 쓰는 값과 셈.
//
// Next 의 route.ts 는 **핸들러 말고는 못 내보낸다.** 상수나 헬퍼를 거기
// 두면 빌드가 타입에서 막힌다. 나눠 쓸 것은 여기로 뺀다.

/** 그냥 볼 수 있는 수. 더 보려면 연꽃 한 송이에 한 사람 */
export const FREE_PICKS = 1;
/** 연꽃을 써도 하루 이만큼까지. 무한 스와이프는 하지 않는다 */
export const MAX_PICKS = 3;
/** 한 번 뽑힌 사람은 이만큼 지나야 다시 온다 */
export const COOLDOWN_DAYS = 90;
/** 인연이 닿으면 양쪽에 붙는 공덕 — 만남도 수행이다 */
export const MERIT_ON_MATCH = 30;
/** 아무 말 없이 이만큼 지나면 방이 조용히 닫힌다 */
export const QUIET_HOURS = 72;

/** 오늘 — 한국 시각으로 가른다 */
export function today(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 둘을 늘 같은 순서로 — 방 이름이 하나여야 한다 */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export type 프로필 = {
  uid: string;
  name?: string;
  sex?: "m" | "f";
  born?: number;
  area?: string;
  job?: string;
  tall?: number;
  mbti?: string;
  smoke?: string;
  drink?: string;
  vibe?: string[];
  like?: string[];
  care?: string[];
  date?: string[];
  temple?: string;
  wantTemple?: string;
  religionOk?: boolean;
  verified?: boolean;
  line?: string;
  photos?: { url: string; state: string }[];
  merit?: { rank?: string; total?: number };
  state?: string;
  seen?: number;
};

/** 남에게 내보낼 만큼만 — 프로필을 통째로 넘기지 않는다 */
export function 추려서(p: 프로필, 붙박이 = false) {
  return {
    uid: p.uid,
    // 붙박이 — 운영자 한 장. 화면이 이걸 보고 카드를 키운다
    pinned: 붙박이 || undefined,
    name: p.name ?? "",
    // 청실홍실의 빛깔을 가르는 데 쓴다 — 청실은 음, 홍실은 양
    sex: p.sex ?? "",
    born: p.born ?? 0,
    area: p.area ?? "",
    // 절은 **따로 동의한 사람 것만** 내보낸다. 동의를 껐는데 옛 값이
    // 문서에 남아 있을 수 있으니, 내보내는 자리에서 한 번 더 막는다 —
    // 지우는 것에 기대지 않는다.
    temple: p.religionOk ? (p.temple ?? "") : "",
    wantTemple: p.religionOk ? (p.wantTemple ?? "") : "",
    job: p.job ?? "",
    tall: p.tall ?? 0,
    mbti: p.mbti ?? "",
    vibe: p.vibe ?? [],
    like: p.like ?? [],
    care: p.care ?? [],
    date: p.date ?? [],
    line: p.line ?? "",
    rank: p.merit?.rank ?? "",
    // **거부된 것만** 뺀다.
    //
    // 예전에는 `state === "ok"` 만 내보냈다. 그런데 "ok" 를 찍는 코드가
    // 이 저장소 어디에도 없었다 — 사진올리기(yeon.ts)는 늘 "pending" 을
    // 적고, 뒷방에도 심사 칸이 없다. 그래서 프로필을 다 채운 사람도
    // 영원히 아무에게도 안 보였고, 후보가 늘 0이라 화면은 가안 석 장으로
    // 떨어졌다. **인연이 통째로 안 돌고 있었다.**
    // 베타에서는 올라온 것을 일단 세우고, 신고가 들어오면 "no" 로 내린다.
    photos: (p.photos ?? []).filter((f) => f.state !== "no").map((f) => f.url),
  };
  // 흡연·음주는 **안 보낸다.** 카드에서 먼저 물을 것이 아니다 —
  // 알약이 열두 개면 사람이 안 읽힌다(형: 「심플리시티가 핵심」).
  // 프로필에는 받아 두고, 쪽지가 열린 뒤에 쓸 자리를 따로 둔다.
}

/**
 * 누구를 보낼까 — 점수로 줄을 세운다.
 *
 * 형이 원하는 것은 소개팅이 아니라 **절에 같이 갈 사람**이다.
 * 그래서 절과 지역이 나이·성별보다 앞선다. 성별은 거르는 잣대가 아니라
 * 본인이 원할 때만 좁히는 것이다 — 그래야 「동행 매칭」이 말이 아니라
 * 사실이 된다.
 */
function 점수(나: 프로필, 너: 프로필): number {
  let s = 0;
  // 동의하지 않은 절은 셈에도 안 쓴다 — 안 보여 줄 것으로 짝을 지으면
  // 그 자체가 종교 정보를 쓴 것이다
  const 절 = (p: 프로필, k: "temple" | "wantTemple") => (p.religionOk ? p[k] : undefined);
  if (절(나, "temple") && 절(너, "temple") && 나.temple === 너.temple) s += 50;
  if (나.area && 너.area && 나.area === 너.area) s += 30;
  // 형: 「수행 지우고 MBTI 랑 … 취향도 골프 와인 … 요즘 어떤 것에 관심이」
  // 겹치는 것이 곧 말 붙일 거리다. 관심이 취향보다 세다 — 지금 마음이
  // 가 있는 쪽이라서.
  const 겹 = (a?: string[], b?: string[]) =>
    (a ?? []).filter((x) => (b ?? []).includes(x)).length;
  s += 겹(나.care, 너.care) * 7;
  s += 겹(나.like, 너.like) * 5;
  s += 겹(나.date, 너.date) * 4;
  s += 겹(나.vibe, 너.vibe) * 2;
  // 가 보고 싶은 절이 상대가 다니는 절이면 — 이보다 좋은 구실이 없다
  if (절(나, "wantTemple") && 절(너, "temple") && 나.wantTemple === 너.temple) s += 40;
  if (절(너, "wantTemple") && 절(나, "temple") && 너.wantTemple === 나.temple) s += 40;
  // 계급이 비슷하면 결이 맞는다 — 꾸준함의 결
  const a = 나.merit?.total ?? 0, b = 너.merit?.total ?? 0;
  if (a && b) s += Math.max(0, 12 - Math.abs(Math.log10(a + 1) - Math.log10(b + 1)) * 8);
  // 나이 차 — 멀수록 덜
  if (나.born && 너.born) s += Math.max(0, 14 - Math.abs(나.born - 너.born));
  // 요즘 들른 사람 — 죽은 계정은 보내지 않는다
  const 날 = (Date.now() - (너.seen ?? 0)) / 86_400_000;
  s += 날 < 3 ? 14 : 날 < 14 ? 7 : 날 < 40 ? 2 : -20;
  return s;
}

export async function 뽑기(
  db: Firestore,
  uid: string,
  몇: number,
  /** 오늘 이미 뽑힌 사람 — 연꽃으로 한 장 더 받을 때 겹치지 않게 */
  이미: string[] = []
) {
  const 나s = await db.doc(`yeon-profiles/${uid}`).get();
  if (!나s.exists) return { err: "no-profile" as const };
  const 나 = { uid, ...나s.data() } as 프로필;
  if (나.state !== "활동") return { err: "not-open" as const };
  if (본인확인_켬 && !나.verified) return { err: "need-verify" as const };

  // 내가 막은 사람 · 이미 본 사람
  const [막음, 지난] = await Promise.all([
    db.collection(`yeon-blocks/${uid}/list`).get(),
    db
      .collection("yeon-daily")
      .where("uid", "==", uid)
      .orderBy("day", "desc")
      .limit(COOLDOWN_DAYS)
      .get(),
  ]);
  const 빼기 = new Set<string>([uid]);
  // 운영자는 **붙박이로만** 선다 — 보통 후보 통에서는 뺀다.
  // 안 빼면 사진 달린 '활동' 프로필이 운영자뿐인 판(= 붙박이를 만든 바로
  // 그 상황)에서 첫 뽑기가 운영자를 집어가고, 그러면 붙박이 조건
  // (`!picks.includes(ADMIN_UID)`)이 막아 **큰 카드가 한 번도 안 뜬다.**
  // 덤으로 하루 한 장을 운영자가 먹어 진짜 인연을 그날 못 본다.
  if (ADMIN_UID) 빼기.add(ADMIN_UID);
  이미.forEach((x) => 빼기.add(x));
  막음.forEach((d) => 빼기.add(d.id));
  지난.forEach((d) => (d.data().picks ?? []).forEach((x: string) => 빼기.add(x)));

  // 후보 — 같은 지역을 먼저, 모자라면 전국
  const 모으기 = async (area?: string) => {
    let q = db
      .collection("yeon-profiles")
      .where("state", "==", "활동")
      .limit(300);
    if (area) q = q.where("area", "==", area).limit(300) as typeof q;
    const s = await q.get();
    return s.docs.map((d) => ({ uid: d.id, ...d.data() }) as 프로필);
  };
  let 후보 = (await 모으기(나.area)).filter((p) => !빼기.has(p.uid));
  if (후보.length < 몇 * 4) {
    const 더 = (await 모으기()).filter((p) => !빼기.has(p.uid));
    const 본 = new Set(후보.map((p) => p.uid));
    후보 = 후보.concat(더.filter((p) => !본.has(p.uid)));
  }
  // 사진이 있는 사람만 — 얼굴 없는 계정은 판에 안 선다.
  // 「통과(ok)된 것만」이었는데 통과를 찍는 코드가 없어 늘 0명이었다.
  후보 = 후보.filter((p) => (p.photos ?? []).some((f) => f.state !== "no"));
  if (본인확인_켬) 후보 = 후보.filter((p) => p.verified);
  if (!후보.length) return { picks: [] as string[] };

  후보.sort((a, b) => 점수(나, b) - 점수(나, a));
  // 위에서 세 배쯤 추린 뒤 그 안에서 섞는다 — 늘 같은 사람만 오면 재미가 없다
  const 통 = 후보.slice(0, Math.max(몇 * 3, 8));
  for (let i = 통.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [통[i], 통[j]] = [통[j], 통[i]];
  }
  return { picks: 통.slice(0, 몇).map((p) => p.uid) };
}

