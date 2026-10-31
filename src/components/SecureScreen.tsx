"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createCapturePolicy, type CapturePlugin } from "@/lib/screen-capture";

type NativeBridge = { isNativePlatform?: () => boolean; Plugins?: { SecureScreen?: CapturePlugin } };
function plugin() {
  const cap = (globalThis as { Capacitor?: NativeBridge }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.SecureScreen ?? null : null;
}
export default function SecureScreen() {
  const pathname = usePathname();
  const policy = useRef(createCapturePolicy(plugin));
  useEffect(() => { void policy.current.route(pathname).catch(() => {}); }, [pathname]);
  useEffect(() => {
    const current = policy.current;
    const sync = () => { if (!document.hidden) void current.refresh().catch(() => {}); };
    // Capacitor may attach its native bridge after hydration. Reapply the latest
    // route then, and when returning from another app or restoring navigation.
    const timers = [0, 150, 600, 1500, 4000].map(delay => window.setTimeout(sync, delay));
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { timers.forEach(timer => window.clearTimeout(timer)); window.removeEventListener("focus", sync); window.removeEventListener("pageshow", sync); document.removeEventListener("visibilitychange", sync); void current.stop().catch(() => {}); };
  }, []);
  return null;
}
