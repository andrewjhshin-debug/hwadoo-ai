import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
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
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "BqX1kBAkQqF6iJWIwqDm2U--7OKwpybmbGP3cOpVufk",
    other: {
      "naver-site-verification": "e3edd090a8e5cfcaab987a6d90d5b0a6f8774189",
    },
  },
  openGraph: {
    title: "화두AI — 당신에게 묻는다",
    description:
      "물음은 혼자, 절은 둘이 — 손잡고 절로. 같은 물음을 품은 사람과 절에 가는 인연, 여기서 만납니다.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "화두AI — 당신에게 묻는다",
    description:
      "물음은 혼자, 절은 둘이 — 손잡고 절로. 같은 물음을 품은 사람과 절에 가는 인연, 여기서 만납니다.",
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
    <html
      lang="ko"
      className={`${serifKR.variable} ${sansKR.variable} h-full antialiased`}
    >
      <body className="flex h-dvh overflow-hidden">
        <ConfirmProvider>
        {/* 발자국 장부 — 화면에 아무것도 그리지 않고, 다녀간 날만 적는다 */}
        <VisitLedger />
        <Sidebar />
        <div className="obang-aura flex flex-1 flex-col overflow-x-hidden overflow-y-auto pt-16 pb-[76px] md:pb-0 md:pt-0">
          {/* 본문은 내용만큼 자란다 — 넘치면 바깥(.obang-aura)이 스크롤한다.
              min-h-0 을 주면 본문이 줄어들어 아래 띠 위로 삐져나온다. */}
          <main className="flex flex-1 flex-col">{children}</main>
          {/* 아래 띠 — 손안에서는 하단 탭 바와 겹쳐 잘려 보이므로 감춘다.
              같은 내용은 '내 도량 → 도량 안내'에 모아 두었다. */}
          <footer className="hidden border-t border-ink-3 px-6 py-5 md:block">
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
            {/* 사업자 정보 — 전자상거래법상 표기 의무 */}
            <p className="mt-4 text-center text-[10.5px] leading-6 text-hanji-faint">
              {BIZ_NAME} · 대표 {BIZ_OWNER} · 사업자등록번호 {BIZ_REG_NO} ·
              통신판매업신고 {BIZ_MAIL_ORDER_NO}
              <br />
              {BIZ_ADDRESS} · 연락처 {BIZ_PHONE ?? CONTACT_EMAIL}
            </p>
            <p className="mt-3 text-center text-[11px] tracking-widest text-hanji-faint">
              © {new Date().getFullYear()} {SITE_NAME} · 물음은 오래된 것, 답은
              나의 것
            </p>
          </footer>
        </div>
        <MobileTabBar />
        {/* 홈 화면에 담기 — 세션마다 한 번, 탭바 위에 낮게 깔려 묻는다 */}
        <InstallBanner />
        </ConfirmProvider>
        <Analytics />
      </body>
    </html>
  );
}
