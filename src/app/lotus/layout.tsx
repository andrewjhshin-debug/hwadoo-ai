import type { Metadata } from "next";

// 연꽃 공양(결제) — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "연꽃 공양 | 화두",
  description:
    "인연 게시판에서 쪽지를 청할 때 쓰는 연꽃 — 한 송이 1,000원부터.",
  alternates: { canonical: "/lotus" },
  openGraph: {
    title: "연꽃 공양 | 화두",
    description: "인연 게시판에서 쪽지를 청할 때 쓰는 연꽃.",
    url: "/lotus",
  },
};

export default function LotusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
