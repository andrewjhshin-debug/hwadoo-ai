import { DONATION_URL } from "@/lib/config";

// 차 한 잔(喫茶去) — 후원 상자.
// 조주의 '차나 마시게'에서 빌린 이름. 강요 없이, 조용히 놓여만 있다.
// DONATION_URL이 정해지면 lib/config.ts 에서 주소만 바꾸면 된다.
export default function Donation() {
  return (
    <section className="mx-auto w-full max-w-md border border-ink-3 bg-ink-2/60 px-8 py-7 text-center">
      <p className="text-xs tracking-[0.5em] text-hanji-faint">喫茶去</p>
      <h3 className="mt-2 text-base tracking-[0.2em] text-hanji-dim">
        차 한 잔
      </h3>
      <p className="mt-4 text-sm leading-7 text-hanji-dim">
        이 도량이 마음에 머물렀다면,
        <br />차 한 잔 값으로 등불을 보태 주실 수 있습니다.
      </p>
      {DONATION_URL ? (
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block border border-gold/50 px-8 py-2.5 text-sm tracking-[0.3em] text-hanji transition-colors duration-500 hover:bg-gold/10"
        >
          차 한 잔 보내기
        </a>
      ) : (
        <p className="mt-6 text-xs tracking-widest text-hanji-faint">
          찻자리를 마련하고 있습니다
        </p>
      )}
      <p className="mt-4 text-[11px] text-hanji-faint">
        보내지 않으셔도 됩니다. 도량은 늘 열려 있습니다.
      </p>
    </section>
  );
}
