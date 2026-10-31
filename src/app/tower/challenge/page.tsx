// ─────────────────────────────────────────────────────────────
// 돌탑 도전장 — 공유 링크가 여기로 온다.
//
// 형: 「공유할 때 썸넬 링크를 제대로 해야지. 토스가 마케팅하는 거 마냥」
// /tower 는 클라이언트 판이라 OG 를 못 들고 있었다. 이 장은 서버가 그려
// 카톡·토스가 긁어 가는 그림(/api/tower/og)과 제목을 달고, 사람이 열면
// 바로 /tower 로 보낸다.
// ─────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Go from "./Go";

type Q = { seed?: string; target?: string; n?: string };
const num = (v?: string) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 10000 ? n : 0; };
const who = (v?: string) => (v ?? "").trim().slice(0, 8);

export async function generateMetadata({ searchParams }: { searchParams: Promise<Q> }): Promise<Metadata> {
  const q = await searchParams;
  const h = num(q.target), n = who(q.n);
  const title = h ? `${n ? `${n}의 ` : ""}돌탑 ${h.toFixed(1)} cm — 이 높이, 넘을 수 있어?` : "화두 돌탑 — 쌓아 봐";
  const og = `/api/tower/og?h=${h}&n=${encodeURIComponent(n)}`;
  return {
    title,
    description: "흔들림을 보고 타이밍 맞춰 누르면 쌓인다. 10cm 넘길 때마다 공덕.",
    openGraph: { title, description: "흔들림을 보고 타이밍 맞춰 누르면 쌓인다.", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function Challenge({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const to = `/tower?seed=${encodeURIComponent(q.seed ?? "")}&target=${num(q.target).toFixed(1)}`;
  return <Go to={to} />;
}
