import type { Metadata } from "next";

// 체험하기 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "화두 체험하기 — 물음 하나 품어 보기 | 화두",
  description:
    "가입 없이 화두 하나를 받아 품어 보는 곳. 물음은 오래된 것, 답은 나의 것.",
  alternates: { canonical: "/try" },
  openGraph: {
    title: "화두 체험하기 — 물음 하나 품어 보기 | 화두",
    description: "가입 없이 화두 하나를 받아 품어 보는 곳.",
    url: "/try",
  },
};

export default function TryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
