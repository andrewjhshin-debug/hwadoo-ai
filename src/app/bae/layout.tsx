import type { Metadata } from "next";

// 백팔배 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "백팔배 — 절 백여덟 번 세기 | 화두",
  description:
    "죽비가 박자를 이끄는 백팔배 셈판. 번뇌 백여덟을 하나씩 내려놓습니다.",
  alternates: { canonical: "/bae" },
  openGraph: {
    title: "백팔배 — 절 백여덟 번 세기 | 화두",
    description: "죽비가 박자를 이끄는 백팔배 셈판.",
    url: "/bae",
  },
};

export default function BaeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
