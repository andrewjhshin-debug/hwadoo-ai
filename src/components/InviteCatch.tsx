"use client";

// 초대 고리 받기 — ?ref= 로 들어오면 적어 두었다가, 로그인하면 한 번 서버에 알린다.
import { useEffect } from "react";
import { watchAuth } from "@/lib/sync";
import { pingLotus } from "@/components/LotusCount";

const KEY = "hwadu.invite-ref";

export default function InviteCatch() {
  useEffect(() => {
    try {
      const r = new URLSearchParams(location.search).get("ref");
      if (r && /^[A-Za-z0-9]{6,64}$/.test(r)) localStorage.setItem(KEY, r);
    } catch { /* 못 적으면 그만 */ }
    return watchAuth(async (u) => {
      let ref: string | null = null;
      try { ref = localStorage.getItem(KEY); } catch { /* */ }
      if (!u || !ref) return;
      try { localStorage.removeItem(KEY); } catch { /* */ }
      const r = await fetch("/api/invite", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await u.getIdToken()}` }, body: JSON.stringify({ ref }) }).catch(() => null);
      if (r?.ok) pingLotus();
    });
  }, []);
  return null;
}

/** 내 초대 고리 — 공유 판이 있으면 그걸로, 없으면 복사 */
export async function 초대하기(uid: string) {
  const url = `https://hwa-du.com/?ref=${uid}`;
  try {
    if (navigator.share) await navigator.share({ title: "화두", url });
    else await navigator.clipboard.writeText(url);
  } catch { /* 닫음 */ }
}
