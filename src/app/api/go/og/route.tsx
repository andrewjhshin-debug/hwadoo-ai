// 같이 가요 카드 — 카톡·토스에 뜨는 1200×630. 글자 셋: 누가 · 언제 · 같이 가요
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

let cached: Promise<ArrayBuffer> | null = null;
function font(origin: string) {
  cached ??= fetch(new URL("/fonts/noto-sans-kr-700.woff", origin)).then((r) => { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); }).catch((e) => { cached = null; throw e; });
  return cached;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const d = u.searchParams.get("d") ?? "";
  const n = (u.searchParams.get("n") ?? "").trim().slice(0, 8);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(d);
  const 날 = ok ? `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : "";
  const data = await font(u.origin).catch(() => null);
  if (!data) return new Response("font missing", { status: 500 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #fde7ef 0%, #fbfaf8 45%, #e6f1ec 100%)", fontFamily: "NotoKR", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 88px", width: 1200 }}>
          <div style={{ fontSize: 34, color: "#8a8378", letterSpacing: 2 }}>{n ? `${n}이 같이 가자고 해요` : "같이 가요"}</div>
          <div style={{ fontSize: 150, color: "#1a1a1c", lineHeight: 1.05, letterSpacing: -4, marginTop: 10 }}>{날 || "절에"}</div>
          <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 40, color: "#fff", background: "#1a1a1c", padding: "14px 34px", borderRadius: 48 }}>같이 가요</div>
            <div style={{ display: "flex" }}>
              {["#f2789f", "#dda01c", "#5fae8f", "#5b7fae"].map((c, i) => (
                <div key={i} style={{ width: 54, height: 54, borderRadius: 27, background: c, border: "4px solid #fbfaf8", marginLeft: i ? -16 : 0 }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", right: 80, top: 60, fontSize: 200 }}>🪷</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "NotoKR", data, weight: 700, style: "normal" }] }
  );
}
