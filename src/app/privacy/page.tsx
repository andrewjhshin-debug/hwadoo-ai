import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 화두",
};

// 개인정보처리방침 — 현재는 서버 수집이 없는 구조라 그대로 정직하게 적는다.
// 로그인(Firebase) 도입 시 반드시 이 문서를 갱신할 것.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        개인정보처리방침
      </h1>

      <div className="rise rise-d1 mt-12 space-y-8 text-sm font-light leading-8 text-hanji-dim">
        <p className="text-hanji">
          {SITE_NAME}(이하 "서비스")는 이용자의 사생활을 존중합니다. 이 문서는
          서비스가 어떤 정보를 다루는지 설명합니다.
        </p>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            1. 수집하는 개인정보가 없습니다
          </h2>
          <p className="mt-3">
            현재 서비스는 회원가입·로그인 기능이 없으며, 이용자의 어떤
            개인정보도 서버로 수집·전송·저장하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            2. 기록은 이용자의 브라우저에만 남습니다
          </h2>
          <p className="mt-3">
            화두 진행 상황, 단상, 회향(답)은 이용자 기기의 브라우저 저장소
            (localStorage)에만 보관됩니다. 이 기록은 서비스 운영자를 포함해
            누구에게도 전송되지 않으며, 브라우저의 사이트 데이터를 삭제하면
            함께 삭제됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">3. 쿠키와 분석 도구</h2>
          <p className="mt-3">
            현재 서비스는 자체 쿠키를 사용하지 않으며, 광고·추적 도구를
            사용하지 않습니다. 향후 도입 시 이 문서를 먼저 갱신하고
            알려드립니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">4. 향후 변경</h2>
          <p className="mt-3">
            로그인, 기록 동기화, 커뮤니티 등 새 기능이 추가되어 개인정보를
            다루게 되는 경우, 시행 전에 이 방침을 개정하고 시행일과 함께
            공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">5. 문의</h2>
          <p className="mt-3">
            개인정보와 관련한 문의는{" "}
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
          시행일: 2026년 8월 10일
        </p>
      </div>
    </div>
  );
}
