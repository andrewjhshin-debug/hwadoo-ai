import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "이용약관 — 화두",
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
            기록은 이용자 브라우저에만 저장됩니다(개인정보처리방침 참조).
            브라우저 데이터 삭제, 기기 변경 등으로 인한 기록의 소실에 대해
            서비스는 복구 수단을 갖고 있지 않습니다. 소중한 기록은 별도로
            옮겨 적어 두시기를 권합니다.
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
          <h2 className="text-[15px] text-gold-soft">7. 약관의 변경</h2>
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
          시행일: 2026년 8월 23일
        </p>
      </div>
    </div>
  );
}
