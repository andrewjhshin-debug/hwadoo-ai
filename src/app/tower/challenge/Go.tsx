"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Go({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><a href={to}>돌탑으로 가는 중…</a></main>;
}
