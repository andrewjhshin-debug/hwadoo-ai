"use client";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// 공유창 — 형: 「어디로 공유하겠습니까, 흔히 앱에서 뜨는 그거를 팝업처럼」
//          「(토스처럼) 링크 복사 · 인스타그램 · 페이스북 · X · 더보기」
// navigator.share 자리를 여기서 한 번 채운다 — 앱 곳곳의 공유 단추는 고칠 것이 없다.
// 아래에서 동그라미 다섯이 올라온다. 「더보기」는 폰의 기본 공유창
//  (앱=@capacitor/share, 브라우저=원래 navigator.share)으로 넘긴다 — 카톡은 거기 있다.
// ─────────────────────────────────────────────────────────────

type 짐 = { title?: string; text?: string; url?: string };
type 다리 = { isNativePlatform?: () => boolean; Plugins?: { Share?: { share(o: 짐 & { dialogTitle?: string }): Promise<unknown> } } };

const 아이콘 = {
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>`,
  insta: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1" fill="#fff" stroke="none"/></svg>`,
  fb: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M13.6 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.4H7.4v3.3h2.8V22z"/></svg>`,
  x: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.9 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>`,
  more: `<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.9" fill="#8a8f97"/><circle cx="12" cy="12" r="1.9" fill="#8a8f97"/><circle cx="18" cy="12" r="1.9" fill="#8a8f97"/></svg>`,
};

function 공유판(d: 짐, 더보기: (d: 짐) => Promise<void>, 앱안: boolean): Promise<void> {
  return new Promise((done, fail) => {
    const url = d.url ?? location.href;
    const 글 = [d.text, d.url].filter(Boolean).join("\n");
    const 판 = document.createElement("div");
    판.className = "share-sheet";
    판.setAttribute("role", "dialog");
    판.setAttribute("aria-modal", "true");
    판.setAttribute("aria-label", "공유");
    const 칸 = (k: keyof typeof 아이콘, 이름: string) => `<button type="button" data-k="${k}"><i class="share-ico share-${k}">${아이콘[k]}</i><span>${이름}</span></button>`;
    판.innerHTML = `<button type="button" class="share-sheet-scrim" aria-label="닫기"></button>
      <div class="share-sheet-box"><span class="share-sheet-grip" aria-hidden="true"></span>
        ${칸("copy", "링크 복사")}${칸("insta", "인스타그램")}${칸("fb", "페이스북")}${칸("x", "X")}${칸("more", "더보기")}
      </div>`;
    const 닫기 = (ok: boolean) => { 판.remove(); if (ok) done(); else fail(new DOMException("닫음", "AbortError")); };
    const 복사 = async () => { try { await navigator.clipboard.writeText(글); return true; } catch { return false; } };
    // 앱(WebView)에선 바깥 주소로 가면 Capacitor 가 폰 브라우저·앱으로 넘긴다. 브라우저에선 새 탭
    const 열기 = (href: string) => { if (앱안) location.href = href; else window.open(href, "_blank", "noopener"); };
    판.addEventListener("click", async (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains("share-sheet-scrim")) return 닫기(false);
      const k = t.closest("[data-k]")?.getAttribute("data-k");
      if (!k) return;
      if (k === "copy") { await 복사(); 닫기(true); }
      // 인스타는 링크를 받는 길이 없다 — 글을 복사해 두고 앱을 연다(붙여 넣으면 된다)
      else if (k === "insta") { await 복사(); 닫기(true); location.href = "instagram://app"; }
      else if (k === "fb") { 닫기(true); 열기(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`); }
      else if (k === "x") { 닫기(true); 열기(`https://twitter.com/intent/tweet?text=${encodeURIComponent(d.text ?? "")}&url=${encodeURIComponent(url)}`); }
      else if (k === "more") { 판.remove(); 더보기(d).then(done, fail); }
    });
    document.body.appendChild(판);
  });
}

export default function NativeShare() {
  useEffect(() => {
    const cap = (globalThis as { Capacitor?: 다리 }).Capacitor;
    const 앱 = cap?.isNativePlatform?.() ? cap.Plugins?.Share : undefined;
    const 원래 = navigator.share?.bind(navigator);
    const 더보기 = async (d: 짐) => {
      if (앱) await 앱.share({ ...d, dialogTitle: "어디로 공유할까?" });
      else if (원래) await 원래(d);
      else await navigator.clipboard.writeText([d.text, d.url].filter(Boolean).join("\n"));
    };
    navigator.share = (d?: 짐) => 공유판(d ?? {}, 더보기, !!cap?.isNativePlatform?.());
  }, []);
  return null;
}
