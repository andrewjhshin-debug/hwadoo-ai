// ─────────────────────────────────────────────────────────────
// 상황판 셈 — 뒷방 계정만.
//
// 형: 「대시보드 만들어. 선배가 만든 이런 느낌으로 우리도 관리 되냐」
//
// 선배 것은 컨설팅 수기 장부라 사람이 json 을 채워야 한다. 우리는
// **이미 파이어스토어에 다 있다** — 계정·주문·공양·인연. 읽어다 셀 뿐이다.
//
// 세는 일은 전부 **집계 질의(count)** 로 한다. 문서를 끌어오면 사람이
// 늘수록 값이 오르는데, count 는 몇이든 한 번 값이다.
// 목록으로 끌어오는 것은 **주문뿐**이다(장부에 줄로 보여야 하므로).
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type Query } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 한국 날짜의 자정 — 서버가 어디 있든 우리 하루로 센다 */
function 자정(앞으로 = 0): Date {
  const 한국 = new Date(Date.now() + 9 * 3_600_000);
  한국.setUTCHours(0, 0, 0, 0);
  한국.setUTCDate(한국.getUTCDate() + 앞으로);
  return new Date(한국.getTime() - 9 * 3_600_000);
}

async function 셈(q: Query): Promise<number> {
  try {
    return (await q.count().get()).data().count;
  } catch {
    return -1; // 색인이 없으면 음수 — 화면이 「—」로 적는다
  }
}

/** 형 블로그 — blog.naver.com/<이것> */
const BLOG_ID = "supplier-999";

type 블로그판 = {
  id: string;
  이름: string;
  최근: { 제목: string; 날: number; 길: string }[];
  피드수: number;
  마지막: number;
} | null;

async function 블로그읽기(id: string): Promise<블로그판> {
  try {
    const r = await fetch(`https://rss.blog.naver.com/${id}.xml`, {
      // 하루 네 번이면 넉넉하다 — 글은 그보다 자주 안 올라간다
      next: { revalidate: 21_600 },
    });
    if (!r.ok) return null;
    const xml = await r.text();
    const 한칸 = (t: string, k: string) => {
      const m = t.match(new RegExp(`<${k}>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</${k}>`));
      return m ? m[1].trim() : "";
    };
    const 이름 = 한칸(xml.split("<item>")[0], "title");
    const 칸들 = xml.split("<item>").slice(1);
    const 최근 = 칸들.slice(0, 5).map((t) => ({
      제목: 한칸(t, "title").slice(0, 60),
      날: Date.parse(한칸(t, "pubDate")) || 0,
      길: 한칸(t, "link"),
    }));
    return {
      id,
      이름,
      최근,
      피드수: 칸들.length,
      마지막: 최근[0]?.날 ?? 0,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: { uid: string; email?: string; verified: boolean };
  try {
    const t = await getAuth(app).verifyIdToken(token);
    me = { uid: t.uid, email: t.email, verified: !!t.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  const 뒷방 =
    me.uid === ADMIN_UID ||
    (me.verified && isAdminAccount({ uid: me.uid, email: me.email, emailVerified: me.verified }));
  if (!뒷방) return Response.json({ error: "not-admin" }, { status: 403 });

  const db = getFirestore(app);
  const 오늘 = Timestamp.fromDate(자정());
  const 이레 = Timestamp.fromDate(자정(-7));
  const 서른 = Timestamp.fromDate(자정(-30));

  const [
    계정,
    오늘움직임,
    이레움직임,
    서른움직임,
    공양,
    공개공양,
    기와,
    인연,
    인연활동,
    글,
    주문문서,
  ] = await Promise.all([
    셈(db.collection("users")),
    셈(db.collection("users").where("updatedAt", ">=", 오늘)),
    셈(db.collection("users").where("updatedAt", ">=", 이레)),
    셈(db.collection("users").where("updatedAt", ">=", 서른)),
    셈(db.collection("candles")),
    셈(db.collection("candles").where("visibility", "==", "public")),
    셈(db.collection("candles").where("gift", "==", "giwa")),
    셈(db.collection("yeon-profiles")),
    셈(db.collection("yeon-profiles").where("state", "==", "활동")),
    셈(db.collection("posts")),
    db.collection("orders").orderBy("createdAt", "desc").limit(40).get().catch(() => null),
  ]);

  // ── 돈 ── 주문은 수가 적으니 끌어와서 직접 센다
  type 주문 = { id: string; n: number; price: number; status: string; depositor: string; email: string | null; at: number };
  const 주문들: 주문[] =
    주문문서?.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        n: typeof x.n === "number" ? x.n : 0,
        price: typeof x.price === "number" ? x.price : 0,
        status: typeof x.status === "string" ? x.status : "pending",
        depositor: typeof x.depositor === "string" ? x.depositor : "",
        email: typeof x.email === "string" ? x.email : null,
        at: x.createdAt?.seconds ? x.createdAt.seconds * 1000 : 0,
      };
    }) ?? [];

  const 받은것 = 주문들.filter((o) => o.status === "paid");
  const 달력 = new Map<string, number>();
  for (const o of 받은것) {
    if (!o.at) continue;
    const d = new Date(o.at + 9 * 3_600_000);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    달력.set(k, (달력.get(k) ?? 0) + o.price);
  }

  // ── 블로그 ──
  // 네이버 애널리틱스·애드포스트는 형 계정으로 로그인해야 보이는 수라
  // 서버가 못 가져온다. 대신 **RSS 는 누구나 읽는다** — 글이 언제
  // 올라갔는지, 무엇이 올라갔는지는 여기서 자동으로 채운다.
  const 블로그 = await 블로그읽기(BLOG_ID);

  return Response.json({
    at: Date.now(),
    블로그,
    사람: { 계정, 오늘: 오늘움직임, 이레: 이레움직임, 서른: 서른움직임 },
    도량: { 공양, 공개공양, 기와, 인연, 인연활동, 글 },
    돈: {
      누적: 받은것.reduce((s, o) => s + o.price, 0),
      건수: 받은것.length,
      기다림: 주문들.filter((o) => o.status === "pending").length,
      달별: [...달력.entries()].sort().map(([달, 원]) => ({ 달, 원 })),
    },
    주문: 주문들.slice(0, 12),
  });
}
