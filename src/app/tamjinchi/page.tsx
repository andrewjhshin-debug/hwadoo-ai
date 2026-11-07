// 불심투자 — 공유 링크(?w=sell&n=엔비디아)가 여기로 온다. 카톡에는 그림 카드(/api/bulsim/og)로 펼쳐진다.
import type { Metadata } from "next";
import { 말, 이름다듬기 } from "@/lib/invest-cool";
import Cool from "./Cool";

type Q = { w?: string; n?: string };
const 쪽 = (w?: string) => (w === "sell" ? "sell" : "buy") as "buy" | "sell";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Q> }): Promise<Metadata> {
  const q = await searchParams;
  const n = 이름다듬기(q.n);
  const w = 쪽(q.w);
  const shared = q.w === "buy" || q.w === "sell";
  const title = shared ? `${n ? `${n} ` : ""}${w === "buy" ? "▼30% 하한가" : "▲30% 상한가"} · 화두 불심투자` : "화두 불심투자";
  const description = shared ? 말(w, 0, false).replace("\n", " ") : "사기 전에, 팔기 전에 목탁 108번";
  const og = `/api/bulsim/og?w=${w}&n=${encodeURIComponent(n)}${shared ? "" : "&plain=1"}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  // 받은 사람은 보낸 사람과 같은 쪽·같은 종목으로 바로 친다
  return <Cool first={쪽(q.w)} firstName={이름다듬기(q.n)} />;
}
