import type { Metadata } from "next";

// 선지식 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "선지식의 한마디 | 화두",
  description:
    "옛 선사들의 어록에서 매일 한 구절 — 무문관·벽암록·조주록의 말들을 우리말로 만납니다.",
  alternates: { canonical: "/masters" },
  openGraph: {
    title: "선지식의 한마디 | 화두",
    description: "옛 선사들의 어록에서 매일 한 구절.",
    url: "/masters",
  },
};

export default function MastersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
