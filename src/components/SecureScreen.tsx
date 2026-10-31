"use client";
// 인연 화면에서만 캡처를 막는다 — 설치 앱일 때만 일이 있다(웹은 못 막는다).
// 형: 「인연만 캡처 안 되게 하는 건 어때」
import { useEffect } from "react";
type 다리 = { isNativePlatform?: () => boolean; Plugins?: { SecureScreen?: { on(): Promise<void>; off(): Promise<void> } } };
export default function SecureScreen() {
  useEffect(() => {
    const cap = (globalThis as { Capacitor?: 다리 }).Capacitor;
    const p = cap?.isNativePlatform?.() ? cap.Plugins?.SecureScreen : null;
    if (!p) return;
    void p.on().catch(() => {});
    return () => { void p.off().catch(() => {}); };
  }, []);
  return null;
}
