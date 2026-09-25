// ─────────────────────────────────────────────────────────────
// 받이 창구 — **개발 중에만** 열린다.
//
// 제미나이에서 구운 그림을 받아 오는 길이 브라우저 내려받기 하나뿐이었다.
// 그런데 그 길이 막히면(내려받기 창이 안 뜨거나 크롬이 물어보는 중이면)
// 그림을 손에 못 넣는다. 화면에서 base64 로 읽어 오는 길도 있지만,
// 한 장에 오십만 자라 말로 실어 나르기엔 너무 무겁다.
//
// 그래서 **판이 직접 받는다.** 제미나이 쪽 화면에서 이 길로 한 번 던지면
// 파일로 떨어진다. 다른 사이트에서 던지는 것이라 CORS 를 열어 둔다.
//
// 열어 두는 것이 무섭지 않은 까닭 —
//   · `process.env.NODE_ENV === "production"` 이면 **404 로 죽는다.**
//     배포판에는 이 길이 아예 없다
//   · 받은 것은 저장고 밖(.next 밖)의 임시 칸에만 떨어진다
//   · 이름은 [a-z0-9-_.] 만 통과시킨다 — 경로를 거슬러 올라갈 수 없다
//
// 쓰는 법(제미나이 화면 콘솔에서):
//   fetch("http://localhost:3000/api/dev/drop?name=foo.png",
//         { method:"POST", body: base64문자열 })
// ─────────────────────────────────────────────────────────────

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const 열렸나 = () => process.env.NODE_ENV !== "production";
const 받는곳 = path.join(os.tmpdir(), "hwadu-drop");

const 머리 = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  if (!열렸나()) return new Response(null, { status: 404 });
  return new Response(null, { status: 204, headers: 머리 });
}

export async function POST(req: Request) {
  if (!열렸나()) return new Response("Not found", { status: 404 });

  const name = new URL(req.url).searchParams.get("name") ?? "";
  // 경로를 거슬러 올라갈 수 없게 — 이름에 쓸 수 있는 글자만
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(name) || name.includes(".."))
    return Response.json({ error: "bad-name" }, { status: 400, headers: 머리 });

  const b64 = (await req.text()).replace(/^data:[^,]+,/, "");
  if (!b64 || b64.length > 40_000_000)
    return Response.json({ error: "bad-body" }, { status: 400, headers: 머리 });

  try {
    await mkdir(받는곳, { recursive: true });
    const 어디 = path.join(받는곳, name);
    await writeFile(어디, Buffer.from(b64, "base64"));
    return Response.json({ ok: true, at: 어디, bytes: b64.length }, { headers: 머리 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "write-failed" },
      { status: 500, headers: 머리 }
    );
  }
}
