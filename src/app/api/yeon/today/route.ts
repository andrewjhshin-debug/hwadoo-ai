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
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
// 라우트 파일은 핸들러 말고 못 내보낸다 — 나눠 쓸 것은 lib 에 둔다
// 뽑기·추려서·점수는 **lib 으로 옮겼다.** 라우트 파일은 핸들러 말고 못
// 내보내는데, 연꽃으로 한 사람 더 받는 길(api/yeon/more)도 같은 뽑기를
// 써야 한다 — 두 군데에 베껴 두면 쿨다운·차단·점수 셈이 갈린다.
import { FREE_PICKS, MAX_PICKS, today, 뽑기, 추려서 } from "@/lib/yeonPick";
import { ADMIN_UID } from "@/lib/config";
import type { 프로필 } from "@/lib/yeonPick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


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
      return d.exists ? 추려서({ uid: id, ...d.data() }) : null;
    })
  );
  const 운카드 = 붙박이
    ? await db.doc(`yeon-profiles/${붙박이}`).get().then((d) =>
        d.exists ? 추려서({ uid: 붙박이, ...d.data() }, true) : null
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
