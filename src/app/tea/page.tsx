import type { Metadata } from "next";
import Donation from "@/components/Donation";
import DonorList from "@/components/DonorList";
import { DONATION_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "차 한 잔 — 화두",
  description: "이 도량이 마음에 머물렀다면, 차 한 잔.",
};

// 차 한 잔 — 도량에 차 한 잔을 올리는 찻자리. 조주의 끽다거에서 빌린 이름.
//
// 왜 이렇게 고쳤나:
// · 예전에는 [喫茶去]+[조주 어록]+[설명 세 줄] 세 겹으로 쌓아 두었는데,
//   그 喫茶去와 설명 세 줄 중 두 줄을 바로 아래 <Donation /> 카드가 이미
//   글자 그대로 다시 보여 준다. 같은 말이 한 화면에 두 번 뜨니 길고 흐렸다.
//   그래서 겹치는 말은 이 페이지에서 내렸다 — 뜻은 카드 안에 그대로 살아 있고,
//   페이지는 '받는 쪽의 마음'만 한 장으로 말한다.
// · 선사의 말(조주 어록)은 한 자도 건드리지 않는다. 격이 여기서 나온다.
// · 올리는 방법·이름 표기처럼 알면 좋지만 급하지 않은 말은 지우지 않고
//   <details>로 접었다. 궁금한 사람만 편다.
export default function TeaPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-14">
      {/* 찻자리 한 장 — 한자 뱃지와 조주의 말, 두 겹으로만 세운다 */}
      <section className="rise rounded-[14px] border border-ink-3 bg-ink-2/50 px-7 pb-9 pt-8 text-center">
        {/* 茶 — 뜻은 아래 카드의 喫茶去가 이미 말하므로 여기서는 그림으로만 둔다 */}
        <span
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[19px] leading-none text-gold"
        >
          茶
        </span>

        {/* 선사의 말 — 줄이지 않는다 */}
        <p className="question-glow rise rise-d1 mt-7 font-serif text-xl font-light leading-[1.9] text-hanji">
          찾아온 모두에게
          <br />
          조주는 같은 말을 건넸습니다.
          <br />
          <span className="text-gold-grad">— 차나 마시게.</span>
        </p>

        {/* 금빛 실 한 올 — 어록과 안내를 가르되 칸을 나누지는 않는다 */}
        <div className="mx-auto mt-8 h-px w-10 bg-gold/40" />

        {/* 겸양 세 줄은 걷었다 — 「값을 받지 않습니다」 · 「그저 마음의
            표시입니다」 · 「올리지 않으셔도 됩니다」. 안 내도 된다는 말을
            세 번 하면 내겠다는 사람이 머쓱해진다.

            **이게 기부라는 것**과 **어디에 쓰는지**는 바로 아래 찻자리
            카드(<Donation />)가 한 번에 말한다. 여기서 또 적으면 한
            화면에서 같은 말을 두 번 하는 셈이라 뺐다. */}
      </section>

      <div className="rise rise-d3 mt-6">
        <Donation />
      </div>

      {/* 급하지 않은 안내는 접어 둔다 — 화면을 흐리지 않고 뜻은 남긴다 */}
      <details className="rise rise-d3 mt-6 rounded-[14px] border border-ink-3 bg-ink-2/40 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-[13.5px] text-hanji-dim marker:hidden">
          <span className="text-gold-soft">＋</span> 차 한 잔, 어떻게 올리나요
        </summary>
        <div className="mt-4 space-y-3 border-t border-ink-3 pt-4 text-left">
          {/* 링크가 비어 있으면 카드가 '찻자리를 마련하고 있습니다'로 뜨므로
              올리는 방법도 함께 감춘다 — 없는 길을 안내하지 않는다 */}
          {DONATION_URL && (
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              휴대폰에서는 단추를 누르면 카카오페이가 바로 열립니다. 컴퓨터에서는
              QR이 보이니, 휴대폰 카메라로 비추시면 됩니다.
            </p>
          )}
          <p className="break-keep text-[13px] leading-7 text-hanji-dim">
            보태주신 분의 이름은 찻자리 아래에 조용히 남깁니다. 가운데는 ○로
            가리고, 명단은 도량에서 손으로 적습니다.
          </p>
          {/* 위 칸에 이미 적은 말이라 여기서는 뺐다 — 같은 문단을 한 화면에
              두 번 두면 두 번째는 읽히지 않고 자리만 먹는다 */}
        </div>
      </details>

      {/* 차 한 잔 보태주신 분 — 명단이 비어 있으면 아무것도 그리지 않는다 */}
      <DonorList />
    </div>
  );
}
