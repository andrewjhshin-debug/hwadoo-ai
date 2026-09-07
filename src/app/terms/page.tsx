import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "이용약관 — 화두",
  alternates: { canonical: "/terms" },
};

// 이용약관 — 서비스의 성격과 한계를 정직하게 밝힌다.
export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        이용약관
      </h1>

      <div className="rise rise-d1 mt-12 space-y-8 text-sm font-light leading-8 text-hanji-dim">
        <section>
          <h2 className="text-[15px] text-gold-soft">1. 서비스의 성격</h2>
          <p className="mt-3">
            {SITE_NAME}는 한국 선(禪)의 화두 수행 형식을 빌린 사유·기록
            서비스입니다. 특정 종단이나 종교 단체와 무관하며, 종교 활동의
            대체물이 아닙니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">2. 이용 자격</h2>
          <p className="mt-3">
            서비스는 만 19세 이상만 이용할 수 있습니다. 인연(연지원 모임)
            게시판은 수행자 간 만남을 잇는 성격을 가지므로, 만 19세 미만은
            이용할 수 없습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            3. 의료·상담의 대체가 아닙니다
          </h2>
          <p className="mt-3">
            서비스가 건네는 물음과 어록은 사유를 돕기 위한 것일 뿐, 의학적
            진단·치료·심리 상담을 대신하지 않습니다. 마음이 크게 힘든 시기에는
            전문가의 도움을 먼저 구하시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">4. 기록의 보관과 책임</h2>
          <p className="mt-3">
            로그인하지 않고 쓰는 경우 기록은 이용자 브라우저에만 저장되며,
            브라우저 데이터 삭제·기기 변경으로 소실된 기록에 대해 서비스는
            복구 수단을 갖고 있지 않습니다. 로그인한 경우 화두 기록·게시글·
            쪽지·주문 내역은 계정에 동기화되어 서버에 저장됩니다
            (개인정보처리방침 참조). 회원 탈퇴를 요청하면 법령상 보존
            의무가 있는 거래기록을 제외하고 지체 없이 삭제합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">5. 콘텐츠와 저작권</h2>
          <p className="mt-3">
            서비스가 제공하는 화두와 어록은 전승된 고전(무문관·벽암록·조주록
            등)을 우리말로 풀어 옮긴 것이며, 그 번역·편집·풀이와 서비스의
            디자인은 서비스에 귀속됩니다. 이용자가 쓴 단상과 회향은 전적으로
            이용자의 것입니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">6. 이용료와 차 한 잔</h2>
          <p className="mt-3">
            서비스는 무료로 제공됩니다. "차 한 잔"은 서비스 유지를 위한
            자발적 결제이며, 결제 즉시 사용되어 환불되지 않습니다. 차 한 잔을
            올리는지 여부는 서비스 이용에 어떤 차등도 만들지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">7. 연꽃(유료 디지털 재화)</h2>
          <p className="mt-3">
            연꽃은 인연 게시판에서 쪽지를 청할 때 쓰는 유료 디지털 재화입니다.
            결제와 동시에 이용자 계정에 지급되며, 유효기간의 제한 없이
            계정에 남습니다. 이용자는 전자상거래 등에서의 소비자보호에 관한
            법률 제17조에 따라 결제일로부터 7일 이내에 청약철회(환불)할 수
            있습니다 — 사용하지 않은 연꽃은 전액, 일부를 사용한 경우 남은
            수량을 기준으로 환불합니다. 환불 문의는{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-hanji underline decoration-gold/30 underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            로 받습니다. 상품·가격은 연꽃 공양 화면에 표시된 바를 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            8. 분쟁의 해결과 준거법
          </h2>
          <p className="mt-3">
            서비스와 이용자 사이에 분쟁이 생기면 우선 성실히 협의해
            해결합니다. 협의가 이루어지지 않는 경우 공정거래위원회가 고시한
            소비자분쟁해결기준에 따르며, 이용자는 한국소비자원 또는
            전자문서·전자거래분쟁조정위원회에 조정을 신청할 수 있습니다. 이
            약관은 대한민국 법을 따르고, 소송은 민사소송법상 관할 법원에
            제기합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">9. 약관의 변경</h2>
          <p className="mt-3">
            약관이 바뀌는 경우 시행 전에 이 페이지에 게시합니다. 문의는{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-hanji underline decoration-gold/30 underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            로 보내주십시오.
          </p>
        </section>

        <p className="border-t border-ink-3 pt-6 text-xs text-hanji-faint">
          시행일: 2026년 9월 7일 (이전 판: 2026년 8월 24일)
        </p>
      </div>
    </div>
  );
}
