// ─────────────────────────────────────────────────────────────
// 오늘의 인연 — 서버가 뽑는다.
//
// 형: 「인연으로 데이팅앱 갈 거야」 · 설계: docs/인연-데이팅-설계.md
//
// 왜 서버인가 —
//  · 뽑기를 브라우저가 하면 **남의 프로필을 다 내려받아야** 한다. 그러면
//    내가 안 만난 사람까지 전부 손에 들어온다. 규칙으로 막아도 목록을
//    받는 순간 끝이다
//  · 「하루 한 사람」이 값의 근거다(더 보려면 연꽃). 브라우저가 세면
//    새로고침 한 번에 무너진다
//  · 「누가 나에게 합장했나」는 연꽃으로 파는 것이라 서버만 알아야 한다
//
// 하루치는 yeon-daily/{uid}_{날짜} 한 칸에 적어 둔다. 같은 날 다시 물으면
// 적어 둔 그대로 준다 — 새로고침해도 사람이 안 바뀐다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// GET  → { picks: [프로필…], left: 남은 장, cap: 오늘 볼 수 있는 수 }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
// 라우트 파일은 핸들러 말고 못 내보낸다 — 나눠 쓸 것은 lib 에 둔다
import { COOLDOWN_DAYS, FREE_PICKS, MAX_PICKS, today } from "@/lib/yeonPick";
import { ADMIN_UID } from "@/lib/config";
// 문턱 스위치 하나 — 켜면 확인 안 된 사람은 판에도 못 서고 뽑히지도 않는다
import { 본인확인_켬 } from "@/lib/yeon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


type 프로필 = {
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
function 추려서(p: 프로필, 붙박이 = false) {
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

async function 뽑기(db: Firestore, uid: string, 몇: number) {
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

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const db = getFirestore(app);
  const day = today();
  const 칸 = db.doc(`yeon-daily/${uid}_${day}`);
  const s = await 칸.get();
  const 지금 = s.exists ? s.data()! : null;
  const cap: number = 지금?.cap ?? FREE_PICKS;
  let picks: string[] = 지금?.picks ?? [];

  // 아직 덜 뽑았으면 채운다(연꽃으로 cap 을 올린 경우)
  if (picks.length < cap) {
    const r = await 뽑기(db, uid, cap - picks.length);
    if ("err" in r) return Response.json({ error: r.err }, { status: 409 });
    picks = picks.concat(r.picks.filter((x) => !picks.includes(x)));
    await 칸.set({ uid, day, picks, cap }, { merge: true });
  }

  // ── 붙박이 한 장 — 운영자 ────────────────────────────────
  // 형: 「새 인연찾기에서 관리자인 내 카드를 키워줘」
  //
  // 판이 비어 있는 동안 처음 들어온 사람이 보는 것은 가안 한 장뿐이다.
  // 사람이 찰 때까지, 문을 연 사람이 맨 앞에 선다 — 누가 하는 곳인지가
  // 「소개」가 아니라 **한 장의 카드**로 읽힌다.
  //
  // 하루치 몫(cap)에서 빼지 않는다. 빼면 무료 한 장을 운영자가 먹어
  // 진짜 인연을 하루에 한 사람도 못 보게 된다.
  // 한 번 합장하거나 넘긴 사람에게는 다시 안 선다 — yeon-pins 에 적는다.
  let 붙박이 = "";
  if (ADMIN_UID && ADMIN_UID !== uid && !picks.includes(ADMIN_UID)) {
    const [운, 본적, 내가막음, 쟤가막음] = await Promise.all([
      db.doc(`yeon-profiles/${ADMIN_UID}`).get(),
      db.doc(`yeon-pins/${uid}`).get(),
      db.doc(`yeon-blocks/${uid}/list/${ADMIN_UID}`).get(),
      db.doc(`yeon-blocks/${ADMIN_UID}/list/${uid}`).get(),
    ]);
    const p = 운.exists ? ({ uid: ADMIN_UID, ...운.data() } as 프로필) : null;
    const 섰나 = !!p && p.state === "활동" && (p.photos ?? []).some((f) => f.state !== "no");
    const 이미: string[] = 본적.exists ? (본적.data()!.done ?? []) : [];
    if (섰나 && !이미.includes(ADMIN_UID) && !내가막음.exists && !쟤가막음.exists)
      붙박이 = ADMIN_UID;
  }
  // 합장 길목이 「오늘 뽑힌 사람인가」를 보므로, 붙박이도 그 칸에 적어 둔다
  if (붙박이 && !(지금?.pin ?? []).includes(붙박이))
    await 칸.set({ uid, day, pin: [붙박이] }, { merge: true });

  // 오늘 뽑힌 사람들의 프로필을 **서버가 추려서** 준다
  const 사람 = await Promise.all(
    picks.map(async (id) => {
      const d = await db.doc(`yeon-profiles/${id}`).get();
      return d.exists ? 추려서({ uid: id, ...d.data() } as 프로필) : null;
    })
  );
  const 운카드 = 붙박이
    ? await db.doc(`yeon-profiles/${붙박이}`).get().then((d) =>
        d.exists ? 추려서({ uid: 붙박이, ...d.data() } as 프로필, true) : null
      )
    : null;

  // 내가 오늘 이미 합장했거나 넘긴 사람
  const 한것: string[] = 지금?.done ?? [];

  return Response.json({
    picks: [운카드, ...사람].filter(Boolean),
    done: 한것,
    cap,
    max: MAX_PICKS,
  });
}
