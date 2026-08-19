import type { Metadata } from "next";
import Donation from "@/components/Donation";
import DonorList from "@/components/DonorList";

export const metadata: Metadata = {
  title: "차 한 잔 — 화두",
  description: "이 도량이 마음에 머물렀다면, 차 한 잔.",
};

// 차 한 잔 — 도량에 차 한 잔을 올리는 찻자리. 조주의 끽다거에서 빌린 이름.
export default function TeaPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-14">
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        喫茶去
      </p>
      <p className="question-glow rise rise-d1 mt-8 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        찾아온 모두에게
        <br />
        조주는 같은 말을 건넸습니다.
        <br />
        <span className="text-gold-grad">— 차나 마시게.</span>
      </p>
      <p className="rise rise-d2 mt-8 text-center text-[13px] leading-8 text-hanji-dim">
        이 도량은 무료이며, 앞으로도 그렇습니다.
        <br />
        다만 이곳이 마음에 머물렀다면, 도량에 차 한 잔을 올려 주실 수 있습니다.
        <br />
        찻값은 이 도량을 잇는 데 쓰입니다.
      </p>
      <div className="rise rise-d3 mt-10">
        <Donation />
      </div>
      {/* 차 한 잔 보태주신 분 — 명단이 비어 있으면 아무것도 그리지 않는다 */}
      <DonorList />
    </div>
  );
}
