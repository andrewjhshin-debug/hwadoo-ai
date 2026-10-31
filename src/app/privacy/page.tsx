import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 화두",
  alternates: { canonical: "/privacy" },
};

// 개인정보처리방침 — 실제 수집·저장 구조(구글 로그인, Firestore, 메일 알림,
// 계좌이체 주문)를 그대로 적는다. 기능이 바뀌면 반드시 이 문서를 함께 갱신할 것.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        개인정보처리방침
      </h1>

      <div className="rise rise-d1 mt-12 space-y-8 text-sm font-light leading-8 text-hanji-dim">
        <p className="text-hanji">
          {SITE_NAME}(이하 ‘서비스’)는 이용자의 사생활을 존중합니다. 이 문서는
          서비스가 어떤 정보를 왜 모으고, 어디에 맡기고, 언제 지우는지
          설명합니다.
        </p>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            1. 수집하는 개인정보와 목적
          </h2>
          <p className="mt-3">
            서비스는 다음 정보를 수집·저장합니다.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <span className="text-hanji">구글 로그인 정보</span> — 이메일
              주소, 이름, 프로필 사진, 계정 식별자(UID). 목적: 로그인, 기록
              동기화, 화두 익음·쪽지 도착 등 알림 이메일 발송.
            </li>
            <li>
              <span className="text-hanji">수행 기록</span> — 로그인한 경우
              화두 진행 상황과 회향(답)이 계정에 동기화되어 서버에
              저장됩니다. 목적: 기기 간 기록 동기화.
            </li>
            <li>
              <span className="text-hanji">커뮤니티 활동</span> — 게시글,
              댓글, 쪽지 내용. 목적: 게시판·쪽지 기능 제공, 신고 처리.
            </li>
            <li>
              <span className="text-hanji">주문 정보</span> — 연꽃(유료
              재화) 주문 시 입금자명, 주문 내역, 계정 이메일. 목적: 입금
              확인과 지급, 환불 처리, 전자상거래법상 거래기록 보존.
            </li>
            <li>
              <span className="text-hanji">알림 수단</span> — 웹푸시 토큰.
              목적: 아침 문안 등 브라우저 알림 발송.
            </li>
            <li>
              <span className="text-hanji">산신각(선택 기능)</span> — 입력한 출생일·시각·
              음양력·윤달을 서버에서 계산하고, 변환한 양력 생일·명식·오행·시각 입력 여부·
              관심사를 계정에 보관합니다. 원래 입력한 출생 시각 문자열은 보관하지 않습니다.
              무료 요약은 정해진 설명을 사용하며 외부 AI에 보내지 않습니다.
              내 풀이와 질문은 다른 이용자에게 공개하지 않으며 탈퇴 시 삭제합니다.
              판매가 열리면 입금자명·금액·주문 상태를 수동 입금 확인에 사용하고,
              생성된 상세 풀이와 후속 질문·답변을 본인 보관함에 저장합니다.
            </li>
            {/* 인연 항목은 여태 방침에 없었다 — 사진과 출생연도가 오가는 기능인데
                적히지 않은 수집이 되어 있었다. 법적 문구이므로 출시 전에
                사람이 한 번 읽고 확인한다(2026-10-28 초안). */}
            <li>
              <span className="text-hanji">인연(도반 찾기) 프로필</span> —
              표시 이름(법명), 출생연도, 지역, 한 줄 소개, 프로필 사진(최대
              5장). 목적: 인연 추천과 카드 표시, 만 19세 이상 확인. 사진은
              운영자가 확인한 뒤에야 다른 이용자에게 보입니다.
            </li>
            <li>
              <span className="text-hanji">즉석 인증 사진</span> — 카메라로
              그 자리에서 촬영한 얼굴 사진 1장과 요청한 동작 표시. 목적: 프로필
              사진의 본인 여부 확인. 운영자만 볼 수 있고 다른 이용자에게는
              절대 보이지 않으며, 심사 후 30일이 지나면 삭제합니다. 눈
              깜박임 확인을 위한 얼굴 위치 분석은 이용자 기기 안에서만
              이루어지며, 영상과 얼굴 분석 결과는 서버로 전송하거나 저장하지
              않습니다.
            </li>
            <li>
              <span className="text-hanji">위치 정보(절 방문 인증)</span> —
              인증 순간의 현재 위치. 목적: 선택한 절 근처에 있는지 확인. 거리
              확인에만 쓰고 좌표는 저장하지 않으며, 방문한 절 이름·날짜·시각만
              기록합니다.
            </li>
          </ul>
          <p className="mt-3">
            로그인하지 않고 쓰는 경우, 화두 진행 상황과 단상은 이용자 기기의
            브라우저 저장소(localStorage)에만 남고 서버로 전송되지 않습니다.
          </p>
        </section>

        {/* 종교는 민감정보다 — 개인정보보호법 23조가 다른 동의와 **별도로**
            받으라고 한다. 인연 프로필의 「다니는 절」「가고 싶은 절」이
            그것이라, 그 칸은 따로 동의한 사람만 쓴다. 적어 두지 않으면
            받은 적 없는 동의가 된다. */}
        <section>
          <h2 className="text-[15px] text-gold-soft">
            1-1. 민감정보 — 종교에 관한 정보
          </h2>
          <p className="mt-3">
            인연(도반 찾기) 프로필의 「다니는 절」과 「가고 싶은 절」은
            개인정보 보호법 제23조의 민감정보(종교)에 해당합니다. 이 두
            항목은 <span className="text-hanji">다른 항목과 별도로 동의</span>
            를 받은 경우에만 수집하며, 동의하지 않아도 인연 기능을 포함한
            모든 서비스를 그대로 이용할 수 있습니다.
          </p>
          <p className="mt-3">
            수집 목적은 같은 절에 다니는 도반을 추천하는 것 하나뿐입니다.
            동의를 철회하면 즉시 다른 이용자에게 표시되지 않으며 추천
            계산에서도 제외됩니다. 철회는 인연 프로필에서 체크를 해제하는
            것으로 바로 됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">2. 보유 기간과 파기</h2>
          <p className="mt-3">
            수집한 정보는 회원 탈퇴(계정 삭제 요청) 시 지체 없이 파기합니다.
            즉석 인증 사진은 탈퇴와 관계없이 심사 후 30일이 지나면 삭제하며,
            프로필 사진은 이용자가 지우거나 탈퇴하면 저장소에서 함께
            삭제합니다.
            다만 전자상거래 등에서의 소비자보호에 관한 법률에 따라 거래기록
            (주문·결제·환불)은 5년간 보존한 뒤 파기하며, 다른 법령이 보존을
            요구하는 경우 그 기간을 따릅니다. 탈퇴·삭제 요청은 아래 문의처로
            보내주시면 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            3. 처리 위탁과 국외 이전
          </h2>
          <p className="mt-3">
            서비스는 안정적인 운영을 위해 다음 업체에 정보 처리를 위탁하며,
            이들 업체의 서버는 국외에 있을 수 있습니다.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Google Firebase — 로그인 인증, 데이터베이스(기록·게시글·쪽지·
              주문), 푸시 알림
            </li>
            <li>Vercel — 웹사이트 호스팅, 방문 통계(익명)</li>
            <li>Google Analytics — 방문 통계(익명). 개인을 식별하지 않습니다</li>
            <li>네이버 애널리틱스 — 방문 통계(익명)</li>
            <li>Sentry — 오류 기록. 사용자가 쓴 글은 보내지 않습니다</li>
            <li>Resend — 알림 이메일 발송</li>
          </ul>
          <p className="mt-3">
            산신각의 상세 AI 풀이와 판매는 현재 준비 중으로, 산신각 정보를 Gemini에
            전송하지 않습니다. 유료 프로젝트 확인과 필요한 개인정보 안내 정비 후
            판매를 열 때에는 Google Gemini API에 계산한 명식·오행·관심사와 후속 질문·
            기존 풀이를 전송해 답변을 생성합니다. 정확한 생일·계정 식별자·이메일은
            AI 요청에 넣지 않습니다. 질문에 연락처 등 불필요한 개인정보를 쓰지 마세요.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">4. 쿠키와 분석 도구</h2>
          <p className="mt-3">
            서비스는 광고·추적 쿠키를 사용하지 않습니다. 로그인 유지를 위한
            필수 저장소와, 개인을 식별하지 않는 방문 통계(Vercel Analytics ·
            Google Analytics · 네이버 애널리틱스), 그리고 오류를 고치기 위한 기록(Sentry)만
            사용합니다. 오류 기록에는 이용자가 쓴 글을 담지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">
            5. 이용자의 권리
          </h2>
          <p className="mt-3">
            이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를
            요구할 수 있습니다. 알림 이메일은 내 도량(설정)의 알림 항목에서
            끌 수 있습니다. 요청은 아래 문의처로 보내주시면 지체 없이
            처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] text-gold-soft">6. 문의</h2>
          <p className="mt-3">
            개인정보 보호책임자: 신준혁(대표). 개인정보와 관련한 문의·요청은{" "}
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
          시행일: 2026년 10월 31일 (산신각 무료 요약·보관 항목 추가. 이전 판: 2026년 10월 28일)
        </p>
      </div>
    </div>
  );
}
