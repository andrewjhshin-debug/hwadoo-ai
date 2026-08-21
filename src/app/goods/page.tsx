import type { Metadata } from "next";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// 굿즈 — 수행 곁에 둘 만한 물건들.
// · 쿠팡 파트너스 링크로 잇는다 — iframe 배너 대신 우리 결의 카드.
// · 목록은 GOODS 배열 하나 — 링크·이름·한 줄을 더하면 줄이 는다.
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
  by?: string; // 지은이 · 만든 곳
  note: string; // 한두 문장 — 담백하게
  url: string; // 쿠팡 파트너스 링크
};

const GOODS: Goods[] = [
  {
    id: "book-buddha-words",
    tag: "책",
    name: "초역 부처의 말",
    by: "코이케 류노스케 · 포레스트북스",
    note: "부처의 말을 짧게 추려 옮긴 책. 아무 쪽이나 펴서 한 토막씩 읽기 좋습니다.",
    url: "https://coupa.ng/coVoy6",
  },
];

export default function GoodsPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        褓 · 굿즈
      </h1>
      <p className="rise mt-6 break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
        수행 곁에 둘 만한 것들을 하나씩 골라 둡니다.
        <br />
        누르면 쿠팡으로 이어집니다 — 값·재고·배송은 그곳에서 확인됩니다.
      </p>

      <div className="rise rise-d1 mt-7 flex flex-col gap-3">
        {GOODS.map((g) => (
          <a
            key={g.id}
            href={g.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="block rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 transition-colors hover:border-gold/40"
          >
            <p className="flex items-center gap-2">
              <span className="shrink-0 rounded-full border border-gold/30 px-2 py-0.5 text-[10px] tracking-wider text-gold-soft">
                {g.tag}
              </span>
              <span className="text-[15px] text-hanji">{g.name}</span>
            </p>
            {g.by && (
              <p className="mt-1.5 text-[11px] tracking-wide text-hanji-faint">
                {g.by}
              </p>
            )}
            <p className="mt-2 break-keep text-[12.5px] leading-6 text-hanji-dim">
              {g.note}
            </p>
            <p className="mt-2.5 text-[12px] tracking-wide text-gold-soft">
              쿠팡에서 보기 →
            </p>
          </a>
        ))}
      </div>

      {/* 대가성 고지 — 공정거래위원회 심사지침에 따른 필수 문구 */}
      <p className="mt-6 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
        제공받습니다.
      </p>

      <div className="mt-10 text-center">
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
