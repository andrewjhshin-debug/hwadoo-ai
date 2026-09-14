import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import DoryangMenu from "@/components/DoryangMenu";
import NextDoors from "@/components/NextDoors";
import MeritBar from "@/components/MeritBar";
import ConfirmProvider from "@/components/Confirm";
import VisitLedger from "@/components/VisitLedger";
import InstallBanner from "@/components/InstallBanner";
import {
  BIZ_ADDRESS,
  BIZ_MAIL_ORDER_NO,
  BIZ_NAME,
  BIZ_OWNER,
  BIZ_PHONE,
  BIZ_REG_NO,
  CONTACT_EMAIL,
  SITE_NAME,
  SITE_URL,
  SLOGAN,
} from "@/lib/config";
import "./globals.css";

const serifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
});

const sansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} 話頭 — ${SLOGAN}`,
  description: `${SLOGAN} 물음은 혼자, 절은 둘이 — 손잡고 절로. 같은 물음을 품은 사람과 절에 가는 인연, 여기서 만납니다.`,
  keywords: ["화두", "명상", "선", "불교", "간화선", "참선", "koan", "사유"],
  // 홈 화면에 앱처럼 담기 (PWA)
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "BqX1kBAkQqF6iJWIwqDm2U--7OKwpybmbGP3cOpVufk",
    other: {
      "naver-site-verification": "e3edd090a8e5cfcaab987a6d90d5b0a6f8774189",
    },
  },
  // 링크 썸네일 — 카톡·SNS 에 붙였을 때 이것 하나로 승부가 난다.
  // 설명하지 말고 후려라. 그림은 public/og.png (캐릭터 둘이 나온다).
  openGraph: {
    title: "AI한테 그만 물어봐",
    description: "이번엔 AI가 너한테 묻는다. 매일 물음 하나 · 절 같이 갈 사람 · 가입 없이 무료.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [
      { url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "화두 — AI한테 그만 물어봐" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI한테 그만 물어봐",
    description: "이번엔 AI가 너한테 묻는다. 매일 물음 하나 · 절 같이 갈 사람 · 가입 없이 무료.",
    images: [`${SITE_URL}/og.png`],
  },
};

// 노치·홈바가 있는 기기에서도 화면 끝까지 그리되, 안전 영역을 알 수 있게 한다
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0b09",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 낮 모드는 접었다 — 밤 하나로 간다.
    // 서버에서부터 같은 값을 새겨 첫 그림이 깜빡이지도, 수화(hydration)가
    // 어긋나지도 않게 한다.
    <html
      lang="ko"
      data-theme=""
      className={`${serifKR.variable} ${sansKR.variable} h-full antialiased`}
    >
      <body className="flex h-dvh overflow-hidden">
        <ConfirmProvider>
        {/* 발자국 장부 — 화면에 아무것도 그리지 않고, 다녀간 날만 적는다 */}
        <VisitLedger />
        <Sidebar />
        {/* 스크롤 통에는 여백을 주지 않는다.
            min-h-full 은 통의 **안쪽 상자(content box)** 높이를 기준으로 재므로,
            통에 아래 여백을 주면 본문이 그만큼 짧아져 아래 띠가 한 화면 안으로
            올라온다 — 떠 있는 메뉴 단추와 겹치던 까닭이 이것이다.
            여백은 안쪽 두 조각(본문·띠)이 각자 진다. */}
        <div className="obang-aura flex-1 overflow-x-hidden overflow-y-auto">
          {/* 공덕 줄 — 어느 방에 있든 맨 위에 금빛 실 한 가닥 */}
          <MeritBar />
          {/* 본문은 꼭 한 화면을 채운다 — 그래야 아래 띠가 내려야 나온다 */}
          <div className="flex min-h-full flex-col pt-16 md:pt-0">
            <main className="flex flex-1 flex-col">{children}</main>
            {/* 이어지는 방 — 화면을 다 쓰고 내려오면 다음 문 셋이 나온다 */}
            <NextDoors />
          </div>
          {/* 아래 띠 — 아래 탭 바(76)와 떠 있는 메뉴 단추 자리를 여기서 비운다 */}
          <footer className="border-t border-ink-3 px-6 pb-[150px] pt-5 md:pb-9">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-hanji-faint">
              <Link href="/about" className="transition-colors hover:text-hanji-dim">
                서비스 소개
              </Link>
              <Link href="/ganhwaseon" className="transition-colors hover:text-hanji-dim">
                간화선이란
              </Link>
              <Link href="/terms" className="transition-colors hover:text-hanji-dim">
                이용약관
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-hanji-dim">
                개인정보처리방침
              </Link>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="transition-colors hover:text-hanji-dim"
              >
                문의
              </a>
            </nav>
            {/* 사업자 정보 — 전자상거래법 제10조는 초기화면에서 '볼 수 있게'
                하라고 한다. 한 줄로 접어 두고 누르면 펴지게 하면 그 요건을
                지키면서도 화면은 서비스만 보인다(대부분의 상거래 사이트 방식). */}
            <details className="group mt-4">
              <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1.5 text-[10.5px] text-hanji-faint transition-colors hover:text-hanji-dim [&::-webkit-details-marker]:hidden">
                사업자 정보
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden
                  className="h-3 w-3 transition-transform group-open:rotate-180"
                >
                  <path d="M6 9.5 12 15.5 18 9.5" />
                </svg>
              </summary>
              <p className="mt-2.5 text-center text-[10.5px] leading-6 text-hanji-faint">
                {BIZ_NAME} · 대표 {BIZ_OWNER} · 사업자등록번호 {BIZ_REG_NO} ·
                통신판매업신고 {BIZ_MAIL_ORDER_NO}
                <br />
                {BIZ_ADDRESS} · 연락처 {BIZ_PHONE ?? CONTACT_EMAIL}
              </p>
            </details>
            <p className="mt-3 text-center text-[11px] tracking-widest text-hanji-faint">
              © {new Date().getFullYear()} {SITE_NAME} · 물음은 오래된 것, 답은
              나의 것
            </p>
          </footer>
        </div>
        <MobileTabBar />
        {/* 도량 한눈에 — 오른쪽 아래 단추 하나로 방 전부를 펼친다 */}
        <DoryangMenu />
        {/* 홈 화면에 담기 — 세션마다 한 번, 탭바 위에 낮게 깔려 묻는다 */}
        <InstallBanner />
        </ConfirmProvider>
        <Analytics />
      </body>
    </html>
  );
}
