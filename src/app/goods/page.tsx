import type { Metadata } from "next";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// 굿즈 — 수행 곁에 둘 만한 물건들.
// · 쿠팡 파트너스 링크로 잇는다 — iframe 배너 대신 우리 결의 격자 카드.
// · 상품 이미지는 쿠팡 썸네일 서버(t5c.coupangcdn.com)의 주소를 그대로 쓴다.
//   coupa.ng 링크를 따라가면 리다이렉트 주소의 image 파라미터에서 얻는다 —
//   /thumbnails/remote/{W}x{H}ex/image/{경로} 꼴이라 크기는 주소로 조절.
// · 격자 — 모바일 2칸, 넓어지면 3칸. 칸을 크게 잡아야 표지가 산다.
// · 대가성 문구는 공정거래위원회 심사지침에 따른 필수 고지 — 지우면 안 된다.
//   글자는 그대로 두고 자리만 맨 아래로 내렸다. 머리에 설명이 겹치면
//   물건이 안 보이기 때문. (문구 자체는 한 글자도 손대지 않는다)
// ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "굿즈 — 화두",
  description: "수행 곁에 둘 만한 물건들 — 하나씩 골라 둡니다.",
  alternates: { canonical: "/goods" },
  openGraph: {
    title: "굿즈 — 화두",
    description: "수행 곁에 둘 만한 물건들 — 하나씩 골라 둡니다.",
    url: "/goods",
  },
};

type Goods = {
  id: string;
  tag: string; // 책 · 좌복 · 향 …
  name: string;
  note: string; // 한두 문장 — 담백하게 (세 줄에서 잘린다)
  img: string; // 쿠팡 상품 이미지 (정사각 썸네일)
  url: string; // 쿠팡 파트너스 직행 링크 (link.coupang.com/a/…) —
  // coupa.ng 는 배너 위젯 페이지로 가므로 쓰지 않는다.
  // 리다이렉트 주소의 link 파라미터에서 직행 링크를 얻는다 (추적 코드 포함).
};

const GOODS: Goods[] = [
  {
    id: "book-buddha-words",
    tag: "책",
    name: "초역 부처의 말",
    note: "코이케 류노스케. 부처의 말을 짧게 추려, 아무 쪽이나 펴서 읽기 좋습니다.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/250194790/268392228/main/9791193506516_L.jpg",
    url: "https://link.coupang.com/a/goeYjLKPpQ",
  },
  {
    id: "book-buddha-lessons",
    tag: "책",
    name: "부처님 말씀대로 살아보니",
    note: "토니 페르난도. 인생이 가벼워지는 15가지 불교 수업.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/63160356377690-742fecc5-eefd-4e0a-a330-932d18c12656.jpg",
    url: "https://link.coupang.com/a/gojlTssRvo",
  },
  {
    id: "book-sea-broken",
    tag: "책",
    name: "천 번을 부서져도 그대는 여전히 바다다",
    note: "정상교. 내 삶을 사랑하게 하는 붓다의 말.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/356253657/377147819/main/9791191731798_L.jpg",
    url: "https://link.coupang.com/a/grs88qXt0K",
  },
  // ── 받아 둔 링크 두 개 — 상품명·이미지가 오면 위 형식대로 넣는다 ──
  // 쿠팡은 봇 접근을 막아 상품명과 썸네일을 자동으로 못 읽어 온다.
  //   https://link.coupang.com/a/g2v8SgScyO  (상품 8123777368 / item 23053834471)
  //   https://link.coupang.com/a/g2wbnn4BO0  (상품 9181647726 / item 27078016787)
];

/** 바깥으로 나가는 링크 표시 — 이모지 대신 직접 그린 화살 */
function OutArrow() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.4 2.4h5.2v5.2" />
      <path d="M9.6 2.4 2.4 9.6" />
    </svg>
  );
}

export default function GoodsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {/* 머리 — 한자 뱃지 + 제목 두 겹까지만. 오른쪽 큰 숫자가 설명 한 줄을 대신한다 */}
      <header className="rise flex items-end justify-between gap-4">
        <div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 font-serif text-[15px] leading-none text-gold">
            褓
          </span>
          <h1 className="mt-3 font-serif text-[30px] font-light leading-tight text-hanji">
            굿즈
          </h1>
        </div>
        <p className="shrink-0 text-right leading-none">
          <span className="font-serif text-[52px] font-light leading-none text-hanji sm:text-[68px]">
            {GOODS.length}
          </span>
          <span className="ml-1 text-[12px] text-hanji-faint">가지</span>
        </p>
      </header>

      {/* 격자 — 한 물건이 한 칸, 아래로 계속 이어진다 */}
      <div className="rise rise-d1 mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GOODS.map((g) => (
          <a
            key={g.id}
            href={g.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50 transition-colors hover:border-gold/40"
          >
            <span className="block overflow-hidden bg-ink-2">
              {/* 외부 CDN 이미지 — next/image 없이 그대로 단다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.img}
                alt={g.name}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </span>
            <span className="flex flex-1 flex-col p-3">
              <span className="line-clamp-2 break-keep text-[13px] leading-5 text-hanji">
                {g.name}
              </span>
              {/* 세 줄까지 — 칸이 커졌으니 설명을 잘라 없애지 않고 다 보여 준다 */}
              <span className="mt-1 line-clamp-3 break-keep text-[11px] leading-[17px] text-hanji-faint">
                {g.note}
              </span>
              {/* 갈래와 화살을 한 줄로 눌러 둔다 — 글줄 수를 늘리지 않으려고 */}
              <span className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="rounded-full border border-gold/30 px-2 py-px text-[9px] leading-tight tracking-wider text-gold-soft">
                  {g.tag}
                </span>
                <span className="text-hanji-faint transition-colors group-hover:text-gold">
                  <OutArrow />
                </span>
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* 대가성 고지 — 공정거래위원회 심사지침에 따른 필수 문구.
          문장은 원문 그대로, 자리만 맨 아래로 내리고 작게 둔다 */}
      <p className="mt-10 break-keep rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-center text-[11px] leading-5 text-hanji-faint">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
        제공받습니다.
      </p>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}
