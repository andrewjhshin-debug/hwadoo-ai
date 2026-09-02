// ─────────────────────────────────────────────────────────────
// 메일 — Resend 로 보낸다. RESEND_API_KEY 가 없으면 조용히 건너뛴다
// (push 가 FIREBASE_SERVICE_ACCOUNT 없을 때 503으로 받아치는 것과 같은 결 —
// 메일이 안 나가도 서비스 흐름은 막지 않는다).
// · RESEND_FROM 이 없으면 Resend 의 시험 발신 주소를 쓴다 — 이 주소는
//   도메인 인증 전이라 계정 소유자의 메일함으로만 갈 수 있다. hwa-du.com
//   도메인을 Resend 에 인증하면 RESEND_FROM 을 "화두 <no-reply@hwa-du.com>"
//   으로 바꿔 누구에게나 보낼 수 있다.
// · 화면은 이메일 클라이언트가 제각각이라 인라인 스타일 + 테이블 골격만 쓴다.
// ─────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { SITE_URL } from "./config";

let client: Resend | null | undefined; // undefined = 아직 안 만들어 봄

function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  client = key ? new Resend(key) : null;
  return client;
}

const FROM = process.env.RESEND_FROM || "화두 <onboarding@resend.dev>";

// 편지지 — 먹빛 바탕, 금빛 띠와 꽉 찬 금 단추. 화두 화면과 같은 결이되,
// 메일함에서 한눈에 각인되도록 크고 또렷하게 (인라인 스타일만 — 지메일 호환)
function letter(opts: {
  eyebrow: string;
  title: string;
  body: string;
  quote?: string; // 가운데 인용 상자 — 화두/핵심 한 줄
  cta?: { label: string; url: string };
}): string {
  const { eyebrow, title, body, quote, cta } = opts;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0d0b09;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b09;padding:44px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#1a1410;border:1px solid #3a3226;border-radius:16px;overflow:hidden;">
            <!-- 위 금빛 띠 -->
            <tr>
              <td style="height:4px;background:#d9b45b;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <!-- 문양 + 눈썹 -->
            <tr>
              <td style="padding:42px 36px 0;text-align:center;">
                <p style="margin:0;font-size:22px;line-height:1;color:#d9b45b;">☸</p>
                <p style="margin:14px 0 0;font-size:12px;letter-spacing:0.5em;color:#d9b45b;">${eyebrow}</p>
              </td>
            </tr>
            <!-- 제목 -->
            <tr>
              <td style="padding:20px 36px 0;text-align:center;">
                <p style="margin:0;font-size:26px;font-weight:700;color:#f2ead9;line-height:1.5;letter-spacing:-0.01em;">${title}</p>
              </td>
            </tr>
            ${
              quote
                ? `<!-- 인용 상자 -->
            <tr>
              <td style="padding:26px 36px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#241c13;border-left:3px solid #d9b45b;border-radius:0 10px 10px 0;padding:18px 20px;text-align:left;">
                      <p style="margin:0;font-size:15px;line-height:1.9;color:#e5dcc8;">${quote}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ""
            }
            <!-- 본문 -->
            <tr>
              <td style="padding:20px 40px 0;text-align:center;">
                <p style="margin:0;font-size:15px;line-height:2;color:#c9c0ab;">${body}</p>
              </td>
            </tr>
            ${
              cta
                ? `<!-- 단추 — 꽉 찬 금색 -->
            <tr>
              <td style="padding:32px 36px 8px;text-align:center;">
                <a href="${cta.url}" style="display:inline-block;background:#d9b45b;color:#1a120b;font-weight:700;font-size:15px;letter-spacing:0.12em;padding:15px 46px;border-radius:999px;text-decoration:none;">${cta.label}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 36px 0;text-align:center;">
                <a href="${cta.url}" style="font-size:12px;color:#8a7f6c;text-decoration:underline;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
              </td>
            </tr>`
                : ""
            }
            <!-- 발 — 표어와 도장 -->
            <tr>
              <td style="padding:36px 36px 30px;text-align:center;">
                <p style="margin:0;font-size:12px;letter-spacing:0.2em;color:#7d6f5e;">물음은 오래된 것, 답은 나의 것</p>
                <p style="margin:10px 0 0;font-size:11px;color:#5c5348;">話頭 · 화두 — 당신에게 묻는 도량</p>
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:16px auto 0;font-size:10.5px;line-height:1.7;color:#4d453b;text-align:center;">
            이 메일은 hwa-du.com 의 알림입니다.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// 참구 기간 한글 이름 — src/lib/store.ts durationLabel 과 같은 매핑
function durationLabel(days: number): string {
  if (days === 1) return "하루";
  if (days === 2) return "이틀";
  if (days === 3) return "사흘";
  if (days === 5) return "닷새";
  if (days === 7) return "이레";
  if (days === 21) return "삼칠일";
  if (days === 108) return "백팔일";
  return `${days}일`;
}

function subjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "이";
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

// 화두 하루·사흘·이레 익음 — 잠금이 풀렸을 때 보내는 메일
export function milestoneMail(days: number) {
  const label = durationLabel(days);
  return {
    subject: `🪷 ${label} 품은 물음이 익었습니다 — 이제 답을 쓸 수 있습니다`,
    html: letter({
      eyebrow: "話頭",
      title: `${label}${subjectParticle(label)} 지났습니다`,
      quote: `${label} 동안 품고 계셨던 그 물음 — 무엇이 보였습니까.`,
      body: "이제 붓을 들 수 있습니다.<br/>답을 쓰고 회향하면, 다음 화두가 옵니다.",
      cta: { label: "붓을 들다", url: SITE_URL },
    }),
  };
}

// 새 쪽지 청 — 답장 요청이 아니라 '새 인연이 청했다'는 첫 알림
export function dmRequestMail(name: string) {
  return {
    subject: `🪷 ${name}님이 그대에게 쪽지를 청했습니다`,
    html: letter({
      eyebrow: "因緣",
      title: `${name}님이\n쪽지를 청했습니다`.replace("\n", "<br/>"),
      quote: "물음은 혼자, 절은 둘이 — 누군가 그대에게 연을 청했습니다.",
      body: "쪽지함에서 청을 읽고,<br/>받아들일지는 그대가 정합니다.",
      cta: { label: "쪽지함 열기", url: `${SITE_URL}/letters` },
    }),
  };
}

// 새 연꽃 주문 — 관리자(뒷방)에게 가는 입금 확인 요청
export function orderMail(o: { n: number; price: number; depositor: string; email: string | null }) {
  return {
    subject: `[주문] 연꽃 ${o.n}송이 — 입금자 ${o.depositor}`,
    html: letter({
      eyebrow: "蓮 · 주문",
      title: `연꽃 ${o.n}송이 · ${o.price.toLocaleString("ko-KR")}원`,
      body: `입금자명 — ${o.depositor}<br/>계정 — ${o.email ?? "이메일 없음"}<br/><br/>입금이 확인되면 뒷방 주문 탭에서 [지급]을 눌러 주십시오.`,
      cta: { label: "뒷방 열기", url: `${SITE_URL}/admin` },
    }),
  };
}

// 보내기 — 실패해도 부른 쪽 흐름은 막지 않는다 (콘솔에도 남긴다).
// error 는 시험 발송 화면에서 바로 보여주기 위한 것 — 평소엔 무시해도 된다.
export async function sendMail(
  to: string,
  mail: { subject: string; html: string }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY 없음" };
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: mail.subject,
      html: mail.html,
    });
    if (error) {
      console.error("[mail] send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mail] send threw:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
