"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Go({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  // 검수(2026-11-24): /go(손잡고 절로)도 이 틀을 쓴다 — 「돌탑으로 가는 중」 대신 어디에나 맞는 「…」
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><a href={to}>…</a></main>;
}
