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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 그냥 볼 수 있는 수. 더 보려면 연꽃 한 송이에 한 사람 */
export const FREE_PICKS = 1;
/** 연꽃을 써도 하루 이만큼까지. 무한 스와이프는 하지 않는다 */
export const MAX_PICKS = 3;
/** 한 번 뽑힌 사람은 이만큼 지나야 다시 온다 */
const COOLDOWN_DAYS = 90;

export function today(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

type 프로필 = {
  uid: string;
  name?: string;
  sex?: "m" | "f";
  born?: number;
  area?: string;
  temple?: string;
  practice?: string[];
  line?: string;
  photos?: { url: string; state: string }[];
  merit?: { rank?: string; total?: number };
  state?: string;
  seen?: number;
};

/** 남에게 내보낼 만큼만 — 프로필을 통째로 넘기지 않는다 */
function 추려서(p: 프로필) {
  return {
    uid: p.uid,
    name: p.name ?? "",
    born: p.born ?? 0,
    area: p.area ?? "",
    temple: p.temple ?? "",
    practice: p.practice ?? [],
    line: p.line ?? "",
    rank: p.merit?.rank ?? "",
    photos: (p.photos ?? []).filter((f) => f.state === "ok").map((f) => f.url),
  };
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
  if (나.temple && 너.temple && 나.temple === 너.temple) s += 50;
  if (나.area && 너.area && 나.area === 너.area) s += 30;
  const 겹침 = (나.practice ?? []).filter((x) => (너.practice ?? []).includes(x));
  s += 겹침.length * 6;
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
  // 사진이 통과된 사람만 — 얼굴 없는 계정은 판에 안 선다
  후보 = 후보.filter((p) => (p.photos ?? []).some((f) => f.state === "ok"));
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

  // 오늘 뽑힌 사람들의 프로필을 **서버가 추려서** 준다
  const 사람 = await Promise.all(
    picks.map(async (id) => {
      const d = await db.doc(`yeon-profiles/${id}`).get();
      return d.exists ? 추려서({ uid: id, ...d.data() } as 프로필) : null;
    })
  );

  // 내가 오늘 이미 합장했거나 넘긴 사람
  const 한것: string[] = 지금?.done ?? [];

  return Response.json({
    picks: 사람.filter(Boolean),
    done: 한것,
    cap,
    max: MAX_PICKS,
  });
}
