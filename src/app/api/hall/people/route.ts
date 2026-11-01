// ─────────────────────────────────────────────────────────────
// 법당에 앉은 사람 — 「앉은 사람 N」을 누르면 뜨는 줄.
//
// 형: 「1만 명 들어왔다 쳐, 그래도 눌리면 쭉 리스트. 위에서부터 뭘 보여 줄지 —
//      프로필 있는 거 위주로」
// 차례: ① 프로필이 열린 사람(사진 승인) ② 나와 같은 절·지역 ③ 공덕 높은 사람 ④ 최근에 앉은 사람.
// ponytail: 지금은 좌복(hall-seats, 열 자리)에 앉은 사람만 센다. 접속(presence)은 익명 세션 열쇠라
//           누가 누군지 모른다 — 법당에 「들어와 있는」 사람까지 줄 세우려면 presence 에 uid 를 싣거나
//           hall-visitors/{uid} 같은 칸을 따로 둬야 한다.
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { getDatabaseWithUrl } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 차례, type 사람 } from "@/lib/hallOrder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RTDB = "https://hwadu-9dc7b-default-rtdb.asia-southeast1.firebasedatabase.app";
const 앉는시간 = 12 * 3_600_000; // CandleHall 과 같은 값

type 프 = {
  state?: string; reportHold?: boolean; approvedPhotoCount?: number; avatarOn?: boolean;
  sex?: string; born?: number; area?: string; temple?: string; religionOk?: boolean; line?: string;
  merit?: { total?: number };
};

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me = "";
  try { me = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }

  const 자리 = ((await getDatabaseWithUrl(RTDB, app).ref("hall-seats").get()).val() ?? {}) as Record<string, { uid?: string; name?: string; sex?: string; at?: number }>;
  const 지금 = Date.now();
  const 앉은 = Object.values(자리).filter((v) => v?.uid && typeof v.at === "number" && 지금 - v.at < 앉는시간 && v.uid !== me);
  const db = getFirestore(app);
  const 문서 = await db.getAll(db.doc(`yeon-profiles/${me}`), ...앉은.map((v) => db.doc(`yeon-profiles/${v.uid}`)));
  const 내것 = (문서[0].data() ?? {}) as 프;
  const 나 = { temple: 내것.religionOk ? (내것.temple ?? "") : "", area: 내것.area ?? "" };
  const 올해 = new Date(지금 + 9 * 3_600_000).getUTCFullYear();

  const 줄: 사람[] = 앉은.flatMap((v, i) => {
    const d = (문서[i + 1].data() ?? {}) as 프;
    // 신고로 묶였거나 쉬는·정지된 사람은 줄에 안 세운다
    if (d.reportHold === true || d.state === "정지" || d.state === "쉼") return [];
    const sex = d.sex === "m" || d.sex === "f" ? d.sex : v.sex === "m" || v.sex === "f" ? v.sex : "";
    return [{
      uid: v.uid!, name: v.name ?? "수행자", sex,
      age: d.born ? 올해 - d.born : 0, area: d.area ?? "",
      temple: d.religionOk ? (d.temple ?? "") : "", line: (d.line ?? "").slice(0, 80),
      photo: !!d.avatarOn, at: v.at!, open: (d.approvedPhotoCount ?? 0) > 0 && d.state === "활동",
      merit: d.merit?.total ?? 0,
    }];
  });
  줄.sort((a, b) => 차례(나, a, b));
  return Response.json({ people: 줄.map(({ merit: _m, ...p }) => p) }, { headers: { "cache-control": "no-store" } });
}
