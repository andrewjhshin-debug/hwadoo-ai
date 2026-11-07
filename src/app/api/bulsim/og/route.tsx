// 불심투자 공유 카드 — 카톡에 펼쳐지는 1200×630. 종목 · ▲30% · 멘트 두 줄 · 봉 · 도장
import { ImageResponse } from "next/og";
import { 말, 이름다듬기 } from "@/lib/invest-cool";

export const runtime = "nodejs";

let cached: Promise<ArrayBuffer> | null = null;
function font(origin: string) {
  cached ??= fetch(new URL("/fonts/noto-sans-kr-700.woff", origin)).then((r) => { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); }).catch((e) => { cached = null; throw e; });
  return cached;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const buy = u.searchParams.get("w") !== "sell";
  const plain = u.searchParams.has("plain");
  const n = 이름다듬기(u.searchParams.get("n"));
  const c = buy ? "#2f6bd8" : "#e0344a";
  const [줄1, 줄2] = 말(buy ? "buy" : "sell", 0, false).split("\n");
  const data = await font(u.origin).catch(() => null);
  if (!data) return new Response("font missing", { status: 500 });
  const budai = new URL("/obj/bulsim-budai.png", u.origin).href;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(160deg, #fff1f5 0%, #f8f7f4 55%, #e9f4ef 100%)", fontFamily: "NotoKR", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 0 0 80px", width: 820 }}>
          <div style={{ fontSize: 30, color: "#8a8378" }}>{plain ? "화두" : `불심투자 · ${buy ? "산다" : "판다"}`}</div>
          <div style={{ fontSize: 76, color: "#1a1a1c", marginTop: 4, letterSpacing: -2 }}>{plain ? "불심투자" : n || "내 종목"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 120, color: c, lineHeight: 1, marginTop: 14, letterSpacing: -4 }}>
            {/* 폰트에 ▲▼ 가 없어서 세모는 그려 넣는다 */}
            {!plain && <svg width="92" height="80" viewBox="0 0 92 80"><path d={buy ? "M0 0H92L46 80Z" : "M46 0L92 80H0Z"} fill={c} /></svg>}
            {plain ? "목탁 108번" : "30.0%"}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 38, color: "#33302c", marginTop: 34, lineHeight: 1.5 }}>
            <div style={{ display: "flex" }}>{plain ? "사기 전에, 팔기 전에" : 줄1}</div>
            {!plain && <div style={{ display: "flex" }}>{줄2}</div>}
          </div>
        </div>
        {/* 봉 */}
        <div style={{ position: "absolute", right: 120, top: 50, bottom: 50, width: 70, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 33, width: 4, background: buy ? "#cdd8ee" : "#efcdd2" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: buy ? 30 : 60, bottom: buy ? 60 : 30, background: c, borderRadius: 6 }} />
        </div>
        {/* 도장 */}
        {!plain && (
          <div style={{ position: "absolute", right: 180, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center", border: `8px solid ${c}`, borderRadius: 14, padding: "6px 24px 10px", color: c, background: "rgba(255,255,255,0.75)", transform: "rotate(-12deg)" }}>
            <span style={{ fontSize: 70, letterSpacing: 8, lineHeight: 1.1 }}>{buy ? "下限價" : "上限價"}</span>
            <span style={{ fontSize: 24 }}>{buy ? "하한가" : "상한가"} · 108</span>
          </div>
        )}
        <div style={{ position: "absolute", left: 80, bottom: 44, display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: "#8a8378" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={budai} width={56} height={56} alt="" />
          <span>화두 · {buy ? "사기" : "팔기"} 전에 목탁 108번</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "NotoKR", data, weight: 700, style: "normal" }] }
  );
}
