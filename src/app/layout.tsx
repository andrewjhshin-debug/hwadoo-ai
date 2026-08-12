import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import ConfirmProvider from "@/components/Confirm";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL, SLOGAN } from "@/lib/config";
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
  description: `${SLOGAN} 하루, 사흘, 이레 — 물음을 품고 사유한 뒤, 그대의 답을 씁니다. 옛 선사들의 화두를 받아 참구하고 기록하는 도량.`,
  keywords: ["화두", "명상", "선", "불교", "간화선", "참선", "koan", "사유"],
  verification: {
    google: "BqX1kBAkQqF6iJWIwqDm2U--7OKwpybmbGP3cOpVufk",
    other: {
      "naver-site-verification": "e3edd090a8e5cfcaab987a6d90d5b0a6f8774189",
    },
  },
  openGraph: {
    title: `${SITE_NAME} 話頭 — ${SLOGAN}`,
    description:
      "하루, 사흘, 이레 — 물음을 품고 사유한 뒤, 그대의 답을 씁니다.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} 話頭 — ${SLOGAN}`,
    description:
      "하루, 사흘, 이레 — 물음을 품고 사유한 뒤, 그대의 답을 씁니다.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${serifKR.variable} ${sansKR.variable} h-full antialiased`}
    >
      <body className="flex h-dvh overflow-hidden">
        {/* 저장된 테마를 첫 화면 그리기 전에 적용 (깜빡임 방지) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('hwadoo-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`,
          }}
        />
        <ConfirmProvider>
        <Sidebar />
        <div className="obang-aura flex flex-1 flex-col overflow-x-hidden overflow-y-auto pt-16 pb-16 md:pb-0 md:pt-0">
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
            <p className="mt-3 text-center text-[11px] tracking-widest text-hanji-faint">
              © {new Date().getFullYear()} {SITE_NAME} · 물음은 오래된 것, 답은
              그대의 것
            </p>
          </footer>
        </div>
        <MobileTabBar />
        </ConfirmProvider>
        <Analytics />
      </body>
    </html>
  );
}
