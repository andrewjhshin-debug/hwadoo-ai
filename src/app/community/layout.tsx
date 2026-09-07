import type { Metadata } from "next";

// 연지원 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "연지원 — 수행자들의 뜰 | 화두",
  description:
    "같은 물음을 품은 수행자들이 나눈 답과 이야기가 모이는 곳.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "연지원 — 수행자들의 뜰 | 화두",
    description: "같은 물음을 품은 수행자들이 나눈 답과 이야기가 모이는 곳.",
    url: "/community",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
