import { DONATION_URL } from "@/lib/config";

// 복전함(福田函) — 절 마당의 복전함처럼, 강요 없이 놓여만 있다.
// DONATION_URL이 정해지면 lib/config.ts 에서 주소만 바꾸면 된다.
export default function Bokjeonham() {
  return (
    <section className="mx-auto w-full max-w-md border border-ink-3 bg-ink-2/60 px-8 py-7 text-center">
      <p className="text-xs tracking-[0.5em] text-hanji-faint">福田函</p>
      <h3 className="mt-2 text-base tracking-[0.2em] text-hanji-dim">복전함</h3>
      <p className="mt-4 text-sm leading-7 text-hanji-dim">
        마음에 무언가 놓였다면,
        <br />
        작은 시주로 이 도량의 등불을 밝힐 수 있습니다.
      </p>
      {DONATION_URL ? (
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block border border-vermilion/60 px-8 py-2.5 text-sm tracking-[0.3em] text-hanji transition-colors duration-500 hover:bg-vermilion/15"
        >
          시주하기
        </a>
      ) : (
        <p className="mt-6 text-xs tracking-widest text-hanji-faint">
          복전함을 마련하고 있습니다
        </p>
      )}
      <p className="mt-4 text-[11px] text-hanji-faint">
        시주하지 않으셔도 됩니다. 도량은 늘 열려 있습니다.
      </p>
    </section>
  );
}
