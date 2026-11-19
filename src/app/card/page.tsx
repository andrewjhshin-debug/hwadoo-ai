"use client";

// ─────────────────────────────────────────────────────────────
// 신도증 — 형(2026-11-18): 「모바일 신도증? 이런거 만들어주고 … 계급 좀더 선명하게」
// 앱 안의 회원증이다. 종단이 내주는 신도증이 아니라서 이름도 「화두 신도증」으로 쓴다.
// 법명·다니는 절·입문일·운력·계급을 한 장에 — 계급은 여섯 빛깔로 한눈에.
// 다니는 절과 입문일만 여기서 적는다(서랍 hwadu.card.v1, 계정에 올라간다).
// QR 은 지금은 화두로 오는 길이다. 절에서 운력을 확인해 주는 QR 은 절과 손잡은 뒤에.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import HipRoom from "@/components/HipRoom";
import s from "@/components/ext.module.css";
import { loadMe, ME_EVENT } from "@/lib/me";
import { isOwner, loadMerit, MERIT_EVENT, RANKS, rankByNeed } from "@/lib/merit";
import { nextRealm, realmOf } from "@/lib/realm";
import { loadStore } from "@/lib/store";
import { loadUnryeok, unryeokHours, UNRYEOK_EVENT } from "@/lib/unryeok";
import { visitDayKey } from "@/components/VisitLedger";

const CARD_KEY = "hwadu.card.v1";
/** 계급 여섯 빛깔 — 오방색에서. 지나온 자리는 차분히, 높을수록 밝게 */
const RANK_COLOR: Record<string, string> = {
  童: "#CFC8BD", 沙: "#C9CED8", 首: "#9DB4D6", 禪: "#9CCFBF", 薩: "#F0B3BE", 佛: "#EBCB86",
};

type CardInfo = { temple: string; since: string };

function loadCard(): CardInfo {
  try {
    const v = JSON.parse(localStorage.getItem(CARD_KEY) || "null");
    if (v && typeof v.since === "string") return { temple: String(v.temple ?? ""), since: v.since };
  } catch {}
  const fresh = { temple: "", since: visitDayKey() };
  try { localStorage.setItem(CARD_KEY, JSON.stringify(fresh)); } catch {}
  return fresh;
}

function no(name: string, since: string) {
  let h = 7;
  for (const c of name + since) h = (h * 31 + c.charCodeAt(0)) % 999983;
  return String(h % 1000000).padStart(6, "0");
}

export default function CardPage() {
  const [card, setCard] = useState<CardInfo | null>(null);
  const [name, setName] = useState("");
  const [rank, setRank] = useState<(typeof RANKS)[number]>(RANKS[0]);
  const [up, setUp] = useState<{ hanja: string; left: number } | null>(null);
  const [hours, setHours] = useState(0);
  const [returned, setReturned] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const read = () => {
      setCard(loadCard());
      setName(loadMe()?.name || "이름 없는 이");
      const total = loadMerit().total;
      const ret = loadStore().history.length;
      setReturned(ret);
      if (isOwner()) { setRank(RANKS[RANKS.length - 1]); setUp(null); }
      else {
        setRank(rankByNeed(realmOf(total, ret).need));
        const n = nextRealm(total, ret);
        setUp(n ? { hanja: rankByNeed(n.to.need).hanja, left: n.left } : null);
      }
      setHours(unryeokHours(loadUnryeok()));
    };
    read();
    for (const e of [ME_EVENT, MERIT_EVENT, UNRYEOK_EVENT, "storage"]) window.addEventListener(e, read);
    return () => { for (const e of [ME_EVENT, MERIT_EVENT, UNRYEOK_EVENT, "storage"]) window.removeEventListener(e, read); };
  }, []);

  const saveTemple = () => {
    const next = { ...(card ?? loadCard()), temple: draft.trim().slice(0, 20) };
    try { localStorage.setItem(CARD_KEY, JSON.stringify(next)); } catch {}
    setCard(next);
    setEditing(false);
  };

  const since = card?.since.replaceAll("-", ". ") ?? "";
  const upRank = up ? RANKS.find((r) => r.hanja === up.hanja) : null;

  return (
    <HipRoom here="/card" lanes={false} rail="/settings">
      <div className={s.wrap}>
        <div>
          <p className={s.kicker}>證 · 화두 신도증</p>
          <h1 className={s.title}>절에 갈 때 꺼내는 한 장</h1>
        </div>

        <div className={s.id}>
          <span className={s.idHz} aria-hidden>{rank.hanja}</span>
          <div className={s.idOrg}><span>話頭 信徒證</span><span>No. {card ? no(name, card.since) : ""}</span></div>
          <p className={s.idName}>{name}</p>
          <dl className={s.idMeta}>
            <dt>다니는 절</dt><dd>{card?.temple || "아직 적지 않았어요"}</dd>
            <dt>입문</dt><dd>{since}</dd>
            <dt>운력</dt><dd>{hours ? `${hours}시간` : "—"}</dd>
            <dt>회향한 화두</dt><dd>{returned}</dd>
          </dl>
          <span className={s.idRank} style={{ background: RANK_COLOR[rank.hanja] }}>{rank.hanja} {rank.name}</span>
          <span className={s.idQr} aria-label="화두로 오는 QR"><QRCodeSVG value="https://www.hwa-du.com" size={64} bgColor="#ffffff" fgColor="#17140f" /></span>
        </div>

        {/* 계급 — 여섯 자리를 빛깔로. 지금 자리만 굵게 테를 두른다 */}
        <div className="card-ranks" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {RANKS.map((r) => {
            const here = r.hanja === rank.hanja;
            const got = r.need <= rank.need;
            return (
              <div key={r.hanja} style={{ textAlign: "center", fontSize: 11, color: here ? "#17140f" : got ? "#6e665c" : "#c3bab0", fontWeight: here ? 700 : 400 }}>
                <b style={{ display: "grid", placeItems: "center", height: 44, borderRadius: 12, marginBottom: 5, fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 400, color: got ? "#17140f" : "#c3bab0", background: got ? RANK_COLOR[r.hanja] : "#fff", boxShadow: here ? "0 0 0 2px #fbf8f1, 0 0 0 3.5px #17140f" : "0 0 0 1px rgba(26,23,20,.08)" }}>{r.hanja}</b>
                {r.name}
              </div>
            );
          })}
        </div>
        {upRank && up && <p className={s.lead}>{upRank.name}까지 공덕 {up.left.toLocaleString("ko-KR")}</p>}

        <div className={s.rows}>
          {editing ? (
            <div className={s.row} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <label className={s.field}>다니는 절
                <input className={s.input} value={draft} maxLength={20} placeholder="예: 조계사" onChange={(e) => setDraft(e.target.value)} autoFocus />
              </label>
              <div className={s.two}><button className={s.btnw} onClick={() => setEditing(false)}>그만두기</button><button className={s.btn} onClick={saveTemple}>적기</button></div>
            </div>
          ) : (
            <button className={s.row} style={{ width: "100%", border: 0, background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => { setDraft(card?.temple ?? ""); setEditing(true); }}>
              <span className={s.mark}>寺</span>다니는 절<em>{card?.temple ? "고치기" : "적기"} ›</em>
            </button>
          )}
          <Link href="/unryeok" className={s.row}><span className={s.mark}>力</span>운력 기록<em>{hours}시간 ›</em></Link>
          <Link href="/wish" className={s.row}><span className={s.mark}>願</span>소원<em>›</em></Link>
        </div>
        <p className={s.lead} style={{ fontSize: 11.5, textAlign: "center" }}>앱 안의 회원증이에요. 종단에서 내주는 신도증과는 다릅니다.</p>
      </div>
    </HipRoom>
  );
}
