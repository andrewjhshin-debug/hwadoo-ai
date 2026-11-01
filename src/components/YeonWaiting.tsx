"use client";

// 받은 호감 — 몇 명인지는 그냥 보이고, 누구인지는 받은 호감함에서(누군지 보기 🪷1).
// 형: 「호감 보내기가 하나뿐인 입구」 — 옛 「나를 합장한 인연」 자리
import { useEffect, useState } from "react";
import Link from "next/link";
import { watchAuth } from "@/lib/sync";
import { 호감함 } from "@/lib/yeonLike";

export default function YeonWaiting() {
  const [수, 수잡기] = useState(0);
  useEffect(() => watchAuth((u) => { if (u) void 호감함().then((j) => 수잡기(j?.got.length ?? 0)); }), []);
  if (!수) return null;
  return (
    <Link href="/gathering/likes" className="hip-wait-open">
      나에게 온 호감 <b>{수}</b> · 보러 가기
    </Link>
  );
}
