"use client";
// 인연 윗단 — 종 옆 「호감 N」. 받은 호감함으로 간다
import Link from "next/link";
import { useEffect, useState } from "react";
import { watchAuth } from "@/lib/sync";
import { 호감함 } from "@/lib/yeonLike";

export default function LikesCount() {
  const [수, 수잡기] = useState<number | null>(null);
  useEffect(() => watchAuth((u) => { if (u) void 호감함().then((j) => 수잡기(j ? j.got.length + j.pairs.length : null)); }), []);
  if (수 === null) return null;
  return (
    <Link href="/gathering/likes" className="hip-yh-likes" aria-label={`호감 ${수}`}>
      호감{수 > 0 && <b>{수}</b>}
    </Link>
  );
}
