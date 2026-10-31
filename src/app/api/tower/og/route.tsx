// 돌탑 도전장 그림 — 카톡·토스 카드에 뜨는 1200×630.
// 돌은 다시 못 그리니(엔진은 클라) 높이만큼 쌓인 돌 실루엣으로 그린다.
import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 한글 글꼴 — public/fonts 의 woff(구글은 woff2 만 줘서 satori 가 못 읽는다). 한 번 받으면 모듈에 쥔다 */
let cached: Promise<ArrayBuffer> | null = null;
function font(origin: string) {
  cached ??= fetch(new URL("/fonts/noto-sans-kr-700.woff", origin)).then((r) => { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); }).catch((e) => { cached = null; throw e; });
  return cached;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const h = Math.max(0, Math.min(9999, Number(u.searchParams.get("h")) || 0));
  const n = (u.searchParams.get("n") ?? "").trim().slice(0, 8);
  const label = n ? `${n}의 돌탑` : "화두 돌탑";
  const ask = h ? "이 높이, 넘을 수 있어?" : "쌓아 봐";
  const data = await font(u.origin).catch(() => null);
  if (!data) return new Response("font missing", { status: 500 });
  // 진짜 돌 — 판에서 쓰는 그 아틀라스(1254²)를 잘라 쌓는다. 높이 7cm 에 한 개꼴
  const atlas = new URL("/obj/stone-cairn-atlas-v5.png", u.origin).toString();
  const CROPS = [[17,192,427,228],[459,288,437,117],[907,196,334,226],[16,561,432,251],[467,615,431,194],[926,580,312,227],[17,969,451,201],[479,941,349,225],[841,1034,399,122]];
  const count = Math.max(2, Math.min(9, Math.round(h / 7)));
  const K = 0.52;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #fde7ef 0%, #fbfaf8 45%, #e6f1ec 100%)", fontFamily: "NotoKR", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 88px", width: 700 }}>
          <div style={{ fontSize: 34, color: "#8a8378", letterSpacing: 2 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 6 }}>
            <div style={{ fontSize: 168, color: "#1a1a1c", lineHeight: 1, letterSpacing: -6 }}>{h ? h.toFixed(1) : "0.0"}</div>
            <div style={{ fontSize: 56, color: "#5a6068", marginLeft: 14 }}>cm</div>
          </div>
          <div style={{ marginTop: 22, display: "flex" }}>
            <div style={{ fontSize: 40, color: "#fff", background: "#1a1a1c", padding: "14px 34px", borderRadius: 48 }}>{ask}</div>
          </div>
          <div style={{ marginTop: 34, fontSize: 24, color: "#9aa0a8" }}>hwa-du.com · 화두</div>
        </div>
        <div style={{ position: "absolute", right: 120, bottom: 40, display: "flex", flexDirection: "column-reverse", alignItems: "center" }}>
          {Array.from({ length: count }, (_, i) => {
            const c = CROPS[(i * 4 + 1) % CROPS.length];
            const w = Math.round(c[2] * K), hh = Math.round(c[3] * K), rot = ((i * 53) % 7) - 3, dx = (((i * 29) % 5) - 2) * 6;
            return <div key={i} style={{ width: w, height: hh, marginTop: -Math.round(hh * 0.28), backgroundImage: `url(${atlas})`, backgroundSize: `${Math.round(1254 * K)}px ${Math.round(1254 * K)}px`, backgroundPosition: `-${Math.round(c[0] * K)}px -${Math.round(c[1] * K)}px`, backgroundRepeat: "no-repeat", transform: `rotate(${rot}deg) translateX(${dx}px)` }} />;
          })}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "NotoKR", data, weight: 700, style: "normal" }] }
  );
}
