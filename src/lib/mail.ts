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

// 편지지 — 먹빛 바탕에 금색 강조, 화두 화면과 같은 결
function letter(opts: { eyebrow: string; title: string; body: string; cta?: { label: string; url: string } }): string {
  const { eyebrow, title, body, cta } = opts;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#171009;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#171009;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#211a10;border:1px solid #3a3226;border-radius:14px;">
            <tr>
              <td style="padding:36px 32px 8px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:0.4em;color:#d9b45b;">${eyebrow}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px 0;text-align:center;">
                <p style="margin:0;font-size:19px;font-weight:500;color:#ede6d4;line-height:1.6;">${title}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;text-align:center;">
                <p style="margin:0;font-size:14px;line-height:1.9;color:#c9c0ab;">${body}</p>
              </td>
            </tr>
            ${
              cta
                ? `<tr>
              <td style="padding:28px 32px 8px;text-align:center;">
                <a href="${cta.url}" style="display:inline-block;padding:12px 28px;border:1px solid rgba(217,180,91,0.5);border-radius:10px;color:#d9b45b;text-decoration:none;font-size:13px;letter-spacing:0.15em;">${cta.label}</a>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:32px 32px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#7d6f5e;">화두 · ${SITE_URL.replace(/^https?:\/\//, "")}</p>
              </td>
            </tr>
          </table>
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
    subject: `${label}${subjectParticle(label)} 지났습니다 — 화두`,
    html: letter({
      eyebrow: "話頭",
      title: `${label}${subjectParticle(label)} 지났습니다`,
      body: "이제 답을 쓸 수 있습니다. 물음이 기다립니다.",
      cta: { label: "화두 열기", url: SITE_URL },
    }),
  };
}

// 새 쪽지 청 — 답장 요청이 아니라 '새 인연이 청했다'는 첫 알림
export function dmRequestMail(name: string) {
  return {
    subject: "인연에서 쪽지가 왔습니다 — 화두",
    html: letter({
      eyebrow: "因緣",
      title: `${name}님이 쪽지를 청했습니다`,
      body: "쪽지함에서 확인하고, 받아들일지 정할 수 있습니다.",
      cta: { label: "쪽지함 열기", url: `${SITE_URL}/letters` },
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
