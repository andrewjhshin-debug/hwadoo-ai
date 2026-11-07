"use client";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// 공유창 — 형: 「공유하기는 어디로 공유하겠습니까, 흔히 앱에서 뜨는 그거를 팝업처럼 띄워」
// 안드로이드 앱(WebView)에는 navigator.share 가 없어서 앱 안의 공유 단추가 모두 「복사」로만 빠졌다.
// 그래서 navigator.share 자리를 여기서 한 번 채운다 — 앱 곳곳의 공유 단추는 고칠 것이 없다.
//  · 앱(@capacitor/share 가 든 APK) → 안드로이드 기본 공유창(카톡·문자·…)
//  · 그 밖(옛 APK·공유창 없는 브라우저) → 아래에서 올라오는 작은 공유판(문자·메일·링크 복사)
// ─────────────────────────────────────────────────────────────

type 짐 = { title?: string; text?: string; url?: string };
type 다리 = { isNativePlatform?: () => boolean; Plugins?: { Share?: { share(o: 짐 & { dialogTitle?: string }): Promise<unknown> } } };

function 공유판(d: 짐): Promise<void> {
  return new Promise((done, fail) => {
    const 글 = [d.text, d.url].filter(Boolean).join("\n");
    const 판 = document.createElement("div");
    판.className = "share-sheet";
    판.setAttribute("role", "dialog");
    판.setAttribute("aria-modal", "true");
    판.innerHTML = `<button type="button" class="share-sheet-scrim" aria-label="닫기"></button>
      <div class="share-sheet-box"><p>어디로 공유할까?</p>
        <a data-k="sms">문자</a><a data-k="mail">메일</a><button type="button" data-k="copy">링크 복사</button>
        <button type="button" data-k="close" class="share-sheet-x">닫기</button></div>`;
    (판.querySelector('[data-k="sms"]') as HTMLAnchorElement).href = `sms:?body=${encodeURIComponent(글)}`;
    (판.querySelector('[data-k="mail"]') as HTMLAnchorElement).href = `mailto:?subject=${encodeURIComponent(d.title ?? "화두")}&body=${encodeURIComponent(글)}`;
    const 닫기 = (ok: boolean) => { 판.remove(); if (ok) done(); else fail(new DOMException("닫음", "AbortError")); };
    판.addEventListener("click", async (e) => {
      const k = (e.target as HTMLElement).closest("[data-k]")?.getAttribute("data-k");
      if (k === "copy") { try { await navigator.clipboard.writeText(글); } catch { /* 복사 막힘 */ } 닫기(true); }
      else if (k === "sms" || k === "mail") window.setTimeout(() => 닫기(true), 300);
      else if (k === "close" || (e.target as HTMLElement).classList.contains("share-sheet-scrim")) 닫기(false);
    });
    document.body.appendChild(판);
  });
}

export default function NativeShare() {
  useEffect(() => {
    const cap = (globalThis as { Capacitor?: 다리 }).Capacitor;
    const 앱 = cap?.isNativePlatform?.() ? cap.Plugins?.Share : undefined;
    if (앱) {
      navigator.share = async (d?: 짐) => { await 앱.share({ ...d, dialogTitle: "어디로 공유할까?" }); };
    } else if (!navigator.share) {
      navigator.share = (d?: 짐) => 공유판(d ?? {});
    }
  }, []);
  return null;
}
