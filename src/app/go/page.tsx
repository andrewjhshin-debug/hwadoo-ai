// 같이 가요 — 공유 링크가 여기로 온다. 카톡 카드(OG)를 달고 손잡고 절로로 보낸다.
import type { Metadata } from "next";
import Go from "../tower/challenge/Go";

type Q = { d?: string; n?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const who = (v?: string) => (v ?? "").trim().slice(0, 8);
const 날 = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Q> }): Promise<Metadata> {
  const q = await searchParams;
  const d = DATE.test(q.d ?? "") ? q.d! : "";
  const n = who(q.n);
  const title = d ? `${n ? `${n}이 ` : ""}${날(d)} 절에 같이 가자고 해요` : "화두 · 같이 가요";
  const og = `/api/go/og?d=${d}&n=${encodeURIComponent(n)}`;
  return {
    title,
    description: "누르면 「가요」 한 번. 같이 가는 사람이 보여요.",
    openGraph: { title, description: "누르면 「가요」 한 번.", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function GoPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const d = DATE.test(q.d ?? "") ? q.d! : "";
  return <Go to={d ? `/pilgrimage?go=${d}` : "/pilgrimage"} />;
}
