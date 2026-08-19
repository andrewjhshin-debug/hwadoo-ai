"use client";

// 차 한 잔 보태주신 분 — 찻자리 아래 조용히 남기는 이름들.
// 명단은 뒷방(admin-content/donors)에서 적고,
// 여기서는 가운데를 ○로 가려 보인다 (신준혁 → 신○혁, 김수 → 김○).
// 아무도 없으면 아무것도 그리지 않는다.

import { useEffect, useState } from "react";
import { fetchAdminContent } from "@/lib/adminContent";

// 이름 가리기 — 석 자 이상은 가운데 글자들을 ○로, 두 자는 끝 자를 ○로
function mask(name: string): string {
  const chars = [...name];
  if (chars.length >= 3)
    return chars[0] + "○".repeat(chars.length - 2) + chars[chars.length - 1];
  if (chars.length === 2) return chars[0] + "○";
  return name;
}

export default function DonorList() {
  const [donors, setDonors] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    // 읽기에 실패하면 빈 명단 — 찻자리는 그대로 조용하다
    fetchAdminContent()
      .then((c) => {
        if (alive) setDonors(c.donors);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (donors.length === 0) return null;

  return (
    <section className="mt-12 text-center">
      <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
        차 한 잔 보태주신 분
      </p>
      <p className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] text-hanji-dim">
        {donors.map((name, i) => (
          <span key={i}>{mask(name)}</span>
        ))}
      </p>
    </section>
  );
}
