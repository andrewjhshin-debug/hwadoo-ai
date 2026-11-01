"use client";
// 인연판 종 — 안 읽은 알림이 있으면 점 하나. 누르면 알림판으로
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import "./alerts.css";

export default function AlertBell() {
  const [uid, setUid] = useState<string | null>(null);
  const [새것, set새것] = useState(false);
  useEffect(() => watchAuth((u) => setUid(u?.uid ?? null)), []);
  useEffect(() => {
    if (!uid) { set새것(false); return; }
    return onSnapshot(
      query(collection(db, `alerts/${uid}/list`), where("read", "==", false), limit(1)),
      (s) => set새것(!s.empty),
      () => set새것(false)
    );
  }, [uid]);
  if (!uid) return null;
  return (
    <Link href="/gathering/alerts" className="hip-bell" aria-label={새것 ? "새 알림" : "알림"}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
      {새것 && <i />}
    </Link>
  );
}
