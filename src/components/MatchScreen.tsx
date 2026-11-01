"use client";
// 인연이 닿았어요 — 청실홍실 끈과 단추 둘: 쪽지방 열기(🪷3, 먼저 여는 쪽이 한 번) · 번호·카톡 열기.
// 형: 「호감 보내기 하고 상대가 받으면 번호나 카톡 아이디 열기」 — 매칭 바로 그 자리에서.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import InyeonThread from "@/components/InyeonThread";
import ContactSwap from "@/components/ContactSwap";
import { watchAuth } from "@/lib/sync";
import { 방열기 } from "@/lib/yeonLike";
import { ROOM } from "@/lib/dmLadder";
import { Yeonkkot } from "@/components/icons";

type G = "m" | "f" | "" | null | undefined;

export default function MatchScreen({ pair, myName, mySex, name, sex, thread, onClose }: {
  pair: string; myName: string; mySex?: G; name: string; sex?: G; thread?: string | null; onClose?: () => void;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [번호, 번호잡기] = useState(false);
  const [바쁨, 바쁨잡기] = useState(false);
  const [모자람, 모자람잡기] = useState(false);
  useEffect(() => watchAuth(setUser), []);
  const 방 = async () => {
    if (thread) { router.push("/letters"); return; }
    if (바쁨) return;
    바쁨잡기(true);
    const r = await 방열기(pair);
    바쁨잡기(false);
    if (r === "need-lotus") { 모자람잡기(true); return; }
    if (r) router.push("/letters");
  };
  return (
    <div className="hip-match">
      <InyeonThread leftName={myName} leftGender={mySex || undefined} rightName={name} rightGender={sex || undefined} />
      <p className="hip-match-say">인연이 닿았어요</p>
      <div className="hip-match-acts">
        <button className="hip-match-main" disabled={바쁨} onClick={() => void 방()}>
          {thread ? "쪽지방 들어가기" : <>쪽지방 열기 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{ROOM}</>}
        </button>
        <button className="hip-match-sub" onClick={() => 번호잡기((v) => !v)}>번호·카톡 열기</button>
      </div>
      {!thread && <p className="hip-match-note">쪽지방은 한 번만 열면 그 뒤 무제한이에요</p>}
      {번호 && user && <ContactSwap pair={pair} user={user} />}
      {모자람 && <Link href="/lotus" className="hip-contact-lotus">연꽃이 모자라요 · 채우기</Link>}
      {onClose && <button className="hip-match-later" onClick={onClose}>나중에</button>}
    </div>
  );
}
