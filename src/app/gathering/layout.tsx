import type { Metadata } from "next";
import SecureScreen from "@/components/SecureScreen";

// 인연 게시판 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "인연 — 절에 같이 갈 사람 | 화두",
  description:
    "절에 같이 갈 동행, 함께 물음을 품을 도반, 울력과 봉사 — 익명 법명으로 잇는 사찰 동행 게시판. 만 19세 이상.",
  alternates: { canonical: "/gathering" },
  openGraph: {
    title: "인연 — 절에 같이 갈 사람 | 화두",
    description:
      "절에 같이 갈 동행, 함께 물음을 품을 도반 — 익명 법명으로 잇는 사찰 동행 게시판.",
    url: "/gathering",
  },
};

export default function GatheringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 설치 앱에서 인연 방(게시판·오늘의 인연·내 프로필)만 캡처를 막는다
  return (
    <>
      <SecureScreen />
      {children}
    </>
  );
}
