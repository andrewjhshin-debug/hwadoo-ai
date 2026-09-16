import type { Metadata } from "next";
import Link from "next/link";
import { goodsCount, liveItems, liveShelves, type Goods } from "@/lib/goods";

// ─────────────────────────────────────────────────────────────
// 굿즈 — 수행 곁에 둘 만한 물건들.
//
// ■ 무엇이 달라졌나
//   예전엔 물건 셋이 격자 한 판에 나란했다. 책 · 책 · 책. 그래서 이 자리가
//   「제휴 링크 세 개」로만 읽혔다. 물건은 물건끼리 놓으면 광고가 되고,
//   **하는 일 곁에 놓으면 준비물**이 된다. 그래서 선반을 앱의 방에 맞췄다 —
//   절하는 자리 · 소리 내는 것 · 손에 쥐는 것 · 사르는 것 · 읽고 쓰는 것 ·
//   방에 두는 것. 선반마다 「왜 여기 있는지」 한 줄과 그 방으로 가는 문을 단다.
//
// ■ 목록은 여기 없다
//   물건은 src/lib/goods.ts 에 있다. 링크가 빈 물건은 그리지 않는다 —
//   링크를 적는 순간 저절로 걸린다(빈 칸을 지우거나 되돌릴 일이 없다).
//
// ■ 그림이 없는 물건
//   쿠팡 썸네일 주소를 못 구했으면 비워 둬도 된다. 그 자리에 한자 도장을
//   세운다. 빈 회색 네모보다 낫고, 격자 높이도 안 무너진다.
//
// ■ 대가성 문구는 공정거래위원회 심사지침에 따른 필수 고지다 — 지우면 안 된다.
//   글자는 한 자도 손대지 않고 자리만 맨 아래에 둔다.
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

/**
 * 그림 자리. 사진이 있으면 사진, 없으면 선반의 도장 글자.
 * 도장은 가운데에 크게 하나 — 작게 넣으면 「그림이 안 떴다」로 보인다.
 */
function Cover({ g, hanja }: { g: Goods; hanja: string }) {
  if (g.img) {
    return (
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
    );
  }
  return (
    <span
      className="flex aspect-square w-full items-center justify-center bg-ink-2"
      style={{
        backgroundImage:
          "radial-gradient(70% 70% at 50% 40%, rgba(217,180,91,.09), transparent 70%)",
      }}
      aria-hidden
    >
      <span className="font-serif text-[40px] font-light leading-none text-gold/35 transition-colors duration-500 group-hover:text-gold/60">
        {g.seal ?? hanja}
      </span>
    </span>
  );
}

function Card({ g, hanja }: { g: Goods; hanja: string }) {
  return (
    <a
      href={g.url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50 transition-colors hover:border-gold/40"
    >
      <Cover g={g} hanja={hanja} />
      <span className="flex flex-1 flex-col p-3">
        <span className="line-clamp-2 break-keep text-[13px] leading-5 text-hanji">
          {g.name}
        </span>
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
  );
}

export default function GoodsPage() {
  const shelves = liveShelves();
  const n = goodsCount();

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
            {n}
          </span>
          <span className="ml-1 text-[12px] text-hanji-faint">가지</span>
        </p>
      </header>

      {/* 선반마다 한 칸 — 이름·까닭 한 줄·그 방으로 가는 문, 그리고 격자 */}
      {shelves.map((s, i) => (
        <section key={s.id} className={`rise rise-d${Math.min(i + 1, 3)} mt-12`}>
          <div className="flex items-baseline justify-between gap-3 border-b border-ink-3 pb-2.5">
            <h2 className="flex items-baseline gap-2">
              <span className="font-serif text-[13px] font-light text-gold/70">
                {s.hanja}
              </span>
              <span className="font-serif text-[17px] font-light text-hanji">
                {s.title}
              </span>
            </h2>
            {s.href && (
              <Link
                href={s.href}
                className="shrink-0 text-[11px] text-hanji-faint transition-colors hover:text-gold"
              >
                그 자리로 →
              </Link>
            )}
          </div>
          <p className="mt-2.5 break-keep text-[12px] leading-[19px] text-hanji-dim">
            {s.why}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {liveItems(s).map((g) => (
              <Card key={g.id} g={g} hanja={s.hanja} />
            ))}
          </div>
        </section>
      ))}

      {/* 대가성 고지 — 공정거래위원회 심사지침에 따른 필수 문구.
          문장은 원문 그대로, 자리만 맨 아래로 내리고 작게 둔다 */}
      <div className="mt-12 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5">
        <p className="break-keep text-center text-[12px] leading-6 text-hanji-dim">
          받은 수수료의 <span className="text-gold">일부는 사찰과 불교 단체에 기부</span>합니다.
        </p>
        <p className="mt-2 break-keep text-center text-[11px] leading-5 text-hanji-faint">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </p>
      </div>

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
