"use client";

// ─────────────────────────────────────────────────────────────
// 같이 가요 — 절 가는 날 카드에 붙는 한 줄.
//
// 형: 「절 좋지? 근데 어떻게 가는지 모르지? 아는 사람 같이 가자 — 이성이랑」
//     「같이 가요 기능 넣어. 도전장이란 표현은 말고」
//
// 손 든 사람 얼굴(법명 첫 자)이 줄지어 서고, 「같이 가요」를 누르면 나도 선다.
// 「↗」는 그날 링크를 보낸다 — 받은 사람이 열면 바로 그 카드. 글자는 최소.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { loadMe } from "@/lib/me";
import { loadMerit, rankOf } from "@/lib/merit";

type 사람 = { name: string; sex?: "m" | "f"; rank?: string; at: number };

export default function GoTogether({ date, eventName }: { date: string; eventName: string }) {
  const [people, setPeople] = useState<Record<string, 사람> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const uid = auth.currentUser?.uid ?? "";
  const mine = !!(uid && people?.[uid]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/go?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { people?: Record<string, 사람> }) => { if (alive) setPeople(j.people ?? {}); })
      .catch(() => { if (alive) setPeople({}); });
    return () => { alive = false; };
  }, [date]);

  const toggle = async () => {
    const u = auth.currentUser;
    if (!u) { setNote("들어온 뒤에 손들 수 있어요"); return; }
    if (busy) return;
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/go", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await u.getIdToken()}` },
        body: JSON.stringify({ date, eventName, on: !mine, name: loadMe()?.name ?? "", rank: rankOf(loadMerit().total).hanja }),
      });
      const j = (await r.json().catch(() => ({}))) as { people?: Record<string, 사람>; error?: string };
      if (r.ok && j.people) setPeople(j.people);
      else setNote(j.error === "past" ? "지난 날이에요" : "잠시 뒤 다시");
    } catch { setNote("잠시 뒤 다시"); }
    finally { setBusy(false); }
  };

  const share = async () => {
    const url = `${location.origin}/go?d=${date}&n=${encodeURIComponent(loadMe()?.name ?? "")}`;
    const text = `${eventName} — 같이 가요`;
    try {
      if (navigator.share) await navigator.share({ title: "화두 · 같이 가요", text, url });
      else { await navigator.clipboard.writeText(url); setNote("링크 복사"); }
    } catch { /* 취소 */ }
  };

  const list = Object.entries(people ?? {}).sort((a, b) => a[1].at - b[1].at);
  return (
    <div className="hip-go">
      <div className="hip-go-row">
        {/* 손 든 사람들 — 법명 첫 자. 다섯까지, 나머지는 수로 */}
        <div className="hip-go-faces" aria-label={list.length ? `${list.length}명 가요` : undefined}>
          {list.slice(0, 5).map(([id, p]) => (
            <i key={id} data-me={id === uid ? "1" : undefined} title={p.name}>{p.name.slice(0, 1) || "行"}</i>
          ))}
          {list.length > 5 && <em>+{list.length - 5}</em>}
        </div>
        <button type="button" className="hip-go-btn" data-on={mine ? "1" : undefined} disabled={busy || people === null} onClick={toggle}>
          {mine ? "가요 ✓" : "같이 가요"}
        </button>
        {(mine || list.length > 0) && (
          <button type="button" className="hip-go-share" aria-label="같이 가자고 알리기" onClick={share}>↗</button>
        )}
      </div>
      {note && <p className="hip-go-note">{note}</p>}
    </div>
  );
}
