// ─────────────────────────────────────────────────────────────
// 선지식(善知識) — 막히면 묻는다. 하루 세 번.
//
// 형: 「선문답? 선지식의 도움 이런 느낌으로. 막히면 묻기 정도로」
//     「AI 시대 엣지 — 논술·논리까지 높일 수 있어」
//
// 답을 주지 않는다. 내가 쓴 한 줄을 받아 **되묻는다** — 어디서 머리로
// 풀었는지, 어디서 남의 말을 빌렸는지 짚고 한 걸음 더 보게 한다.
// 제미나이 2.5 Flash, 생각 끔(thinkingBudget 0) — 한 마디에 0.5원 꼴.
// 열쇠(GEMINI_API_KEY)가 없으면 503 — 화면은 단추를 숨긴다.
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const 하루몫 = 3;

const 선지식 = `너는 한국 간화선(看話禪)의 선지식이다. 수행자가 화두를 품고 적은 한 줄을 받는다.
규칙:
- 절대 답을 주지 않는다. 정답·해설·불교 교리 강의 금지.
- 두 문장 이내, 60자 안쪽. 존댓말(하십시오체 아닌 해요체 섞인 낮은 목소리).
- 첫 문장은 수행자의 말에서 **머리로 푼 자리** 또는 **남의 말을 빌린 자리**를 정확히 짚는다. 책에서 본 말, 논리로 세운 말, 멋있게 다듬은 말을 가려낸다.
- 둘째 문장은 되묻는다. 「그걸 아는 놈은 누구입니까」 「그 말 하기 전엔 뭐였습니까」처럼, 수행자가 지금 이 자리에서 다시 보게 하는 물음 하나.
- 칭찬도 위로도 하지 않는다. 다만 비웃지도 않는다. 가끔은 짧게 「딱.」 하고 죽비 한 번으로 끝내도 된다(열에 하나).
- 수행자가 농담이나 딴소리를 하면 그것도 화두로 돌려세운다.
- 이모지·마크다운·따옴표 금지. 글자만.`;

/** 열쇠가 있나 — 화면이 단추를 그릴지 말지 */
export async function GET() {
  return Response.json({ ok: !!process.env.GEMINI_API_KEY, quota: 하루몫 });
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "no-key" }, { status: 503 });
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }

  const body = (await req.json().catch(() => null)) as { question?: unknown; answer?: unknown; day?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim().slice(0, 500) : "";
  const day = typeof body?.day === "number" && Number.isFinite(body.day) ? Math.max(1, Math.floor(body.day)) : 1;
  if (!question || !answer) return Response.json({ error: "bad-request" }, { status: 400 });

  // 하루 세 번 — 한국 날짜로 센다. 문서 하나에 {day, n}
  const 오늘 = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const db = getFirestore(app);
  const ref = db.doc(`zen-asks/${uid}`);
  const left = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() as { day?: string; n?: number } | undefined;
    const n = d?.day === 오늘 ? d.n ?? 0 : 0;
    if (n >= 하루몫) return -1;
    tx.set(ref, { day: 오늘, n: n + 1, at: FieldValue.serverTimestamp() });
    return 하루몫 - (n + 1);
  });
  if (left < 0) return Response.json({ error: "quota", left: 0 }, { status: 429 });

  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: 선지식 }] },
      contents: [{ role: "user", parts: [{ text: `화두: ${question}\n품은 지 ${day}일째.\n수행자의 한 줄: ${answer}` }] }],
      generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 120, temperature: 0.9 },
    }),
  }).catch(() => null);
  if (!r || !r.ok) return Response.json({ error: "upstream", left }, { status: 502 });
  const j = (await r.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim().replace(/[*_`"“”]/g, "").slice(0, 140);
  if (!text) return Response.json({ error: "empty", left }, { status: 502 });
  return Response.json({ say: text, left });
}
