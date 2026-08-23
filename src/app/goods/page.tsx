import type { Metadata } from "next";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// 굿즈 — 수행 곁에 둘 만한 물건들.
// · 쿠팡 파트너스 링크로 잇는다 — iframe 배너 대신 우리 결의 격자 카드.
// · 상품 이미지는 쿠팡 썸네일 서버(t5c.coupangcdn.com)의 주소를 그대로 쓴다.
//   coupa.ng 링크를 따라가면 리다이렉트 주소의 image 파라미터에서 얻는다 —
//   /thumbnails/remote/{W}x{H}ex/image/{경로} 꼴이라 크기는 주소로 조절.
// · 격자 — 모바일 2칸부터 화면이 넓어질수록 3·4·5칸까지 는다.
// · 대가성 문구는 공정거래위원회 심사지침에 따른 필수 고지 — 지우면 안 된다.
// ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "굿즈 — 화두",
  description: "수행 곁에 둘 만한 물건들 — 하나씩 골라 둡니다.",
};

type Goods = {
  id: string;
  tag: string; // 책 · 좌복 · 향 …
  name: string;
  note: string; // 한두 문장 — 담백하게 (두 줄에서 잘린다)
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
    note: "코이케 류노스케 지음. 부처의 말을 짧게 추려, 아무 쪽이나 펴서 읽기 좋습니다.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/250194790/268392228/main/9791193506516_L.jpg",
    url: "https://link.coupang.com/a/goeYjLKPpQ",
  },
  {
    id: "book-buddha-lessons",
    tag: "책",
    name: "부처님 말씀대로 살아보니",
    note: "토니 페르난도 지음. 인생이 가벼워지는 15가지 불교 수업.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/63160356377690-742fecc5-eefd-4e0a-a330-932d18c12656.jpg",
    url: "https://link.coupang.com/a/gojlTssRvo",
  },
  {
    id: "book-sea-broken",
    tag: "책",
    name: "천 번을 부서져도 그대는 여전히 바다다",
    note: "정상교 지음. 내 삶을 사랑하게 하는 붓다의 말.",
    img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/356253657/377147819/main/9791191731798_L.jpg",
    url: "https://link.coupang.com/a/grs88qXt0K",
  },
];

export default function GoodsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        褓 · 굿즈
      </h1>
      {/* 격자 — 한 물건이 한 칸, 아래로 계속 이어진다 */}
      <div className="rise rise-d1 mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {GOODS.map((g) => (
          <a
            key={g.id}
            href={g.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group block"
          >
            <span className="block overflow-hidden rounded-[12px] border border-ink-3 bg-white transition-colors group-hover:border-gold/50">
              {/* 외부 CDN 이미지 — next/image 없이 그대로 단다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.img}
                alt={g.name}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </span>
            <span className="mt-2 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 rounded-full border border-gold/30 px-1.5 py-px text-[9px] leading-tight tracking-wider text-gold-soft">
                {g.tag}
              </span>
              <span className="line-clamp-2 break-keep text-[13px] leading-5 text-hanji">
                {g.name}
              </span>
            </span>
            <span className="mt-1 line-clamp-2 block break-keep text-[11px] leading-[17px] text-hanji-faint">
              {g.note}
            </span>
          </a>
        ))}
      </div>

      {/* 대가성 고지 — 공정거래위원회 심사지침에 따른 필수 문구 */}
      <p className="mt-10 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
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
