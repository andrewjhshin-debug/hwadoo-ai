"use client";
// ─────────────────────────────────────────────────────────────
// 인연판 알림 — 형: 「활동·호감·쪽지·키워드, 골스처럼」
// 키워드 칸에서 낱말을 걸어 두면 누가 제목·본문에 그 말을 쓸 때 울린다.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import type { 알림 } from "@/lib/alerts";
import "@/components/alerts.css";

const 탭 = [
  { k: "all", 이름: "전체" },
  { k: "activity", 이름: "활동" },
  { k: "like", 이름: "호감" },
  { k: "dm", 이름: "쪽지" },
  { k: "keyword", 이름: "키워드" },
] as const;

function 언제(at: number) {
  const 분 = Math.floor((Date.now() - at) / 60000);
  if (분 < 1) return "방금";
  if (분 < 60) return `${분}분 전`;
  if (분 < 1440) return `${Math.floor(분 / 60)}시간 전`;
  const d = new Date(at);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function AlertsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [목록, set목록] = useState<알림[] | null>(null);
  const [고른, set고른] = useState<(typeof 탭)[number]["k"]>("all");
  const [말들, set말들] = useState<string[]>([]);
  const [새말, set새말] = useState("");

  useEffect(() => watchAuth((u) => setUid(u?.uid ?? null)), []);
  useEffect(() => {
    if (!uid) return;
    const 끊기 = onSnapshot(
      query(collection(db, `alerts/${uid}/list`), orderBy("at", "desc"), limit(100)),
      (s) => set목록(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<알림, "id">) }))),
      () => set목록([])
    );
    getDoc(doc(db, "alert-keywords", uid)).then((s) => set말들((s.data()?.words as string[]) ?? [])).catch(() => {});
    return 끊기;
  }, [uid]);

  const 보일것 = useMemo(() => (목록 ?? []).filter((a) => 고른 === "all" || a.kind === 고른), [목록, 고른]);

  const 말저장 = async (next: string[]) => {
    if (!uid) return;
    const 앞 = 말들;
    set말들(next);
    // 못 적었으면 되돌린다 — 화면엔 걸린 것처럼 보이는데 알림이 안 오는 게 제일 나쁘다
    await setDoc(doc(db, "alert-keywords", uid), { words: next }).catch(() => set말들(앞));
  };
  const 말더하기 = () => {
    const w = 새말.trim().slice(0, 12);
    set새말("");
    if (!w || 말들.includes(w) || 말들.length >= 10) return;
    void 말저장([...말들, w]);
  };

  const 열기 = (a: 알림) => {
    if (uid && !a.read) void updateDoc(doc(db, `alerts/${uid}/list/${a.id}`), { read: true }).catch(() => {});
    if (a.kind === "dm") router.push("/letters");
    else if (a.postId) router.push(`/gathering?post=${a.postId}`);
  };

  return (
    <div className="hip-alerts">
      <header>
        <Link href="/gathering" aria-label="뒤로">←</Link>
        <h1>알림</h1>
      </header>
      <nav className="hip-alerts-tabs">
        {탭.map((t) => (
          <button key={t.k} type="button" aria-pressed={고른 === t.k} onClick={() => set고른(t.k)}>{t.이름}</button>
        ))}
      </nav>

      {고른 === "keyword" && (
        <section className="hip-alerts-kw">
          <div className="hip-alerts-kw-in">
            <input value={새말} maxLength={12} placeholder="예) 진관사" onChange={(e) => set새말(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) 말더하기(); }} />
            <button type="button" disabled={!새말.trim() || 말들.length >= 10} onClick={말더하기}>추가</button>
          </div>
          <p>제목이나 내용에 이 말이 들어간 새 글이 올라오면 알려 드려요 · {말들.length}/10</p>
          {말들.length > 0 && (
            <ul>
              {말들.map((w) => (
                <li key={w}>{w}<button type="button" aria-label={`${w} 지우기`} onClick={() => void 말저장(말들.filter((x) => x !== w))}>✕</button></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {uid === null ? (
        <p className="hip-alerts-empty">로그인하면 알림을 받을 수 있어요</p>
      ) : 목록 === null ? (
        <p className="hip-alerts-empty">불러오는 중</p>
      ) : 보일것.length === 0 ? (
        <p className="hip-alerts-empty">아직 알림이 없어요</p>
      ) : (
        <ul className="hip-alerts-list">
          {보일것.map((a) => (
            <li key={a.id} data-read={a.read ? "1" : undefined}>
              <button type="button" onClick={() => 열기(a)}>
                <em>{탭.find((t) => t.k === a.kind)?.이름}</em>
                <span>{a.text}</span>
                <small>{언제(a.at)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
