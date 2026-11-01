"use client";
// 호감 보내기 — 게시판 얼굴 · 글 머리 · 오늘의 인연 · 법당 좌복, 어디서든 이 한 판.
// 형: 「주관식으로 쓰게 해」 — 고르는 문장은 없다. 한 줄 쓰고, 호감 🪷1 또는 진심 🪷3.
// 저쪽이 먼저 보냈으면 그 자리에서 청실홍실이 이어진다(값 없음).
import Link from "next/link";
import { flowEvent } from "@/lib/flow-events";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { watchAuth, loginWithGoogle } from "@/lib/sync";
import { isAdminAccount } from "@/lib/config";
import { LIKE, LIKE_SINCERE } from "@/lib/dmLadder";
import { 호감보내기 } from "@/lib/yeonLike";
import { loadMe } from "@/lib/me";
import { Yeonkkot } from "@/components/icons";
import MatchScreen from "@/components/MatchScreen";
import { pingLotus } from "@/components/LotusCount";

type G = "m" | "f" | "" | null | undefined;

export default function LikeSheet({ to, name, sex, onClose, onDone }: { to: string; name: string; sex?: G; onClose: () => void; onDone?: () => void }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [말, 말잡기] = useState("");
  const [상태, 상태잡기] = useState<"" | "busy" | "sent" | "lotus" | "fail" | "nope">("");
  const [짝, 짝잡기] = useState<string | null>(null);
  useEffect(() => watchAuth(setUser), []);
  const 주인 = isAdminAccount(user ?? null);
  const 보내기 = async (sincere: boolean) => {
    if (상태 === "busy") return;
    상태잡기("busy");
    const r = await 호감보내기(to, 말, sincere);
    if (r === "login") { 상태잡기(""); await loginWithGoogle(); return; }
    if (r === "need-lotus") { 상태잡기("lotus"); return; }
    if (r === "fail") { 상태잡기("fail"); return; }
    if (r === "nope") { 상태잡기("nope"); return; }
    // 연꽃을 썼으니 윗단 알약을 새로 읽힌다 — 안 그러면 쓰기 전 숫자 그대로 보인다
    if (!r.already) flowEvent("like_sent");
    if (r.matched && !r.already) flowEvent("match_created");
    pingLotus();
    onDone?.();
    if (r.matched && r.pair) { 짝잡기(r.pair); 상태잡기(""); return; }
    상태잡기("sent");
  };
  if (user?.uid === to) return null;
  return (
    <div className="hip-like-veil" role="dialog" aria-label={`${name}님에게 호감`} onClick={onClose}>
      <div className="hip-like" onClick={(e) => e.stopPropagation()}>
        {짝 ? (
          <MatchScreen pair={짝} myName={loadMe()?.name || "나"} name={name} sex={sex} onClose={onClose} />
        ) : 상태 === "sent" ? (
          <>
            <p className="hip-like-title">호감을 보냈어요</p>
            <p className="hip-like-say">{name}님이 「나도」를 누르면 청실홍실이 이어져요.</p>
            <button className="hip-like-main" onClick={onClose}>닫기</button>
          </>
        ) : (
          <>
            <p className="hip-like-title">{name}님에게 호감</p>
            <textarea value={말} maxLength={80} rows={2} placeholder="한 줄" onChange={(e) => 말잡기(e.target.value)} />
            <div className="hip-like-acts">
              <button className="hip-like-main" disabled={상태 === "busy"} onClick={() => void 보내기(false)}>
                호감 보내기{!주인 && <> · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{LIKE}</>}
              </button>
              <button className="hip-like-gold" disabled={상태 === "busy"} onClick={() => void 보내기(true)}>
                진심{!주인 && <> · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{LIKE_SINCERE}</>}
              </button>
            </div>
            <p className="hip-like-note">진심은 상대 받은 호감 맨 위에, 처음부터 누군지 보여요</p>
            {상태 === "lotus" && <Link href="/lotus" className="hip-contact-lotus">연꽃이 모자라요 · 채우기</Link>}
            {상태 === "fail" && <p className="hip-like-note">보내지 못했어요. 잠시 뒤 다시 눌러 주세요</p>}
            {상태 === "nope" && <p className="hip-like-note">지금은 이 분께 호감을 보낼 수 없어요</p>}
          </>
        )}
      </div>
    </div>
  );
}
