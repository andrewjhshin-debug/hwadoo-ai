// 청소년보호정책 — 만 19세 이상 서비스라면 반드시 두어야 하는 자리.
//
// 없었다. 사진과 1:1 쪽지와 오프라인 동행이 오가는 서비스인데 청소년보호
// 책임자 표기도, 정책 페이지도 없었다. PG 심사와 앱 마켓 심사가 이것을
// 본다. 랜덤채팅 앱이 청소년유해매체물로 지정돼 19금 표시와 성인인증
// 의무를 진 전례가 있다.
//
// 글을 꾸미지 않는다. 법이 요구하는 것을 있는 그대로 적는다.
import type { Metadata } from "next";
import {
  BIZ_NAME,
  BIZ_OWNER,
  CONTACT_EMAIL,
  SITE_URL,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "청소년보호정책 | 화두",
  description:
    "화두는 만 19세 이상만 이용할 수 있습니다. 청소년 보호를 위한 조치와 책임자를 안내합니다.",
  alternates: { canonical: "/youth" },
  openGraph: { title: "청소년보호정책 | 화두", url: `${SITE_URL}/youth` },
};

const 항목: { h: string; p: string[] }[] = [
  {
    h: "1. 이용 연령",
    p: [
      "화두는 만 19세 이상만 이용할 수 있는 서비스입니다. 인연 기능은 성인 이용자 간 1:1 쪽지와 오프라인 동행(사찰 방문·법회 참석 등) 약속을 포함하므로 만 19세 미만은 가입과 이용이 제한됩니다.",
      // 적어 둔 것과 도는 것이 달랐다 — 「휴대전화 본인확인을 거쳐야
      // 한다」고 게시해 놓고, 실제로는 생년 입력 한 줄뿐이었다
      // (src/lib/yeon.ts 의 `본인확인_켬` 이 꺼져 있다).
      // 게시문은 **지금 도는 대로** 적는다. 본인확인을 붙이는 날 이 문장과
      // 그 스위치를 같이 켠다.
      "가입 시 생년을 받아 만 19세 미만은 인연 기능에 들어올 수 없습니다. 허위로 적은 것이 확인되면 이용을 즉시 제한하고 프로필을 내립니다. 휴대전화 본인확인은 결제 개시와 함께 도입할 예정입니다.",
    ],
  },
  {
    h: "2. 유해정보로부터의 보호",
    p: [
      // 「공개 전에 확인한다」고 적어 두었는데 확인하는 길이 없었다.
      // 베타에서는 올라온 뒤에 살핀다 — 적힌 대로만 적는다.
      "이용자가 올린 사진은 운영자가 살펴보며, 부적절한 사진은 내려 다른 이용자에게 보이지 않게 합니다. 신고가 들어온 사진은 우선 확인합니다.",
      "게시글·쪽지·프로필에서 청소년에게 유해한 내용, 성적 표현, 연락처·계좌 등 개인정보 노출, 상업적 광고가 발견되면 삭제하고 작성자의 이용을 제한합니다.",
      "모든 글과 쪽지에는 신고 기능이 있습니다. 신고가 접수되면 해당 대화는 즉시 중지되고 운영자가 확인합니다.",
    ],
  },
  {
    h: "3. 모니터링",
    p: [
      "운영자는 신고 건을 접수 즉시 확인하며, 공개 게시물과 신규 사진은 매일 1회 이상 점검합니다.",
      "청소년 유해 정보가 반복 확인된 이용자는 경고 없이 이용을 정지합니다.",
    ],
  },
  {
    h: "4. 피해 신고와 상담",
    p: [
      `서비스 내 신고 기능 또는 ${CONTACT_EMAIL} 으로 접수해 주십시오. 접수된 건은 3영업일 이내에 처리 결과를 알려 드립니다.`,
      "긴급한 피해는 경찰청 사이버수사국(국번 없이 182), 여성긴급전화(1366), 청소년사이버상담센터(1388)로도 신고할 수 있습니다.",
    ],
  },
];

export default function YouthPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 md:py-14">
      <h1 className="font-serif text-[22px] font-light text-hanji">
        청소년보호정책
      </h1>
      <p className="mt-3 break-keep text-[13px] leading-7 text-hanji-dim">
        화두는 만 19세 이상만 이용할 수 있습니다. 청소년이 유해한 정보에
        노출되지 않도록 아래와 같이 조치하고 있습니다.
      </p>

      <div className="mt-9 space-y-8 text-[13px] leading-7 text-hanji-dim">
        {항목.map((s) => (
          <section key={s.h}>
            <h2 className="text-[15px] text-gold-soft">{s.h}</h2>
            {s.p.map((line, i) => (
              <p key={i} className="mt-3 break-keep">
                {line}
              </p>
            ))}
          </section>
        ))}

        <section>
          <h2 className="text-[15px] text-gold-soft">5. 청소년보호책임자</h2>
          <div className="mt-3 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 text-[12.5px] leading-7">
            <p>
              <span className="text-hanji-faint">상호</span> {BIZ_NAME}
            </p>
            <p>
              <span className="text-hanji-faint">청소년보호책임자</span>{" "}
              {BIZ_OWNER}
            </p>
            <p>
              <span className="text-hanji-faint">연락처</span> {CONTACT_EMAIL}
            </p>
          </div>
        </section>
      </div>

      <p className="mt-10 text-[11.5px] leading-6 text-hanji-faint">
        이 정책은 2026년 9월 25일부터 적용됩니다.
      </p>
    </div>
  );
}
