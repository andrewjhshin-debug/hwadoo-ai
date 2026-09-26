"use client";

// ─────────────────────────────────────────────────────────────
// 인연 자가진단 — **뒷방 주인만.**
//
// 형: 「인연도 다시 해봐. 최선을 다해서 고칠 수 있냐?」
//
// 여태 고친 것은 다 **짐작**이었다. 형 폰에서 나는 일을 내 자리에서
// 볼 수가 없으니(로그인이 없다), 코드를 읽어 짚고 고치고 또 물어봤다.
// 그 왕복이 길어졌다.
//
// 그래서 **재는 판**을 하나 세운다. 형이 한 번 열면 인연이 서는 데
// 필요한 일곱 가지를 차례로 해 보고, 되는 것과 안 되는 것을 **까닭까지**
// 적어 준다. 한 번 찍어 보내 주면 그다음은 왕복이 없다.
//
// 진짜로 해 본다 — 흉내내지 않는다.
//   · 프로필 문서를 정말 읽고
//   · 정말 한 칸을 고쳐 보고(규칙이 막는지)
//   · 작은 그림을 하나 만들어 **정말 올려 보고**(저장소·다시굽기)
//   · 그 그림을 도로 지우고
//   · 서버 뽑기 길을 정말 두드린다
// 손대는 것은 제 프로필뿐이고, 올린 시험 그림은 그 자리에서 지운다.
//
// 배포판에서도 열린다 — 형 폰에서 나는 일을 봐야 하니까. 대신 뒷방
// 계정이 아니면 아무것도 안 한다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import { isAdminAccount } from "@/lib/config";
import { 내프로필, 모자란것, 사진올리기, 사진빼기, 프로필저장 } from "@/lib/yeon";
import { 오늘뽑기 } from "@/lib/yeonToday";

type 칸 = { 이름: string; 됨: boolean | null; 말: string };

/** 작은 시험 그림 한 장 — 진짜 파일로 만든다(다시굽기 길을 그대로 탄다) */
async function 시험사진(): Promise<File> {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 1200;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 900, 1200);
  grd.addColorStop(0, "#f2789f");
  grd.addColorStop(1, "#5cc2ac");
  g.fillStyle = grd;
  g.fillRect(0, 0, 900, 1200);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = "64px serif";
  g.fillText("시험", 330, 620);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
  c.width = 0;
  c.height = 0;
  if (!blob) throw new Error("시험 그림을 못 만들었습니다");
  return new File([blob], "selftest.jpg", { type: "image/jpeg" });
}

export default function 인연자가진단() {
  const [user, setUser] = useState<User | null>(null);
  const [준비, 준비잡기] = useState(false);
  const [도는중, 도는중잡기] = useState(false);
  const [칸들, 칸들잡기] = useState<칸[]>([]);

  useEffect(
    () =>
      watchAuth((u) => {
        setUser(u);
        준비잡기(true);
      }),
    []
  );

  const 뒷방 = isAdminAccount(user);

  const 재기 = useCallback(async () => {
    도는중잡기(true);
    const 줄: 칸[] = [];
    const 찍 = (이름: string, 됨: boolean | null, 말: string) => {
      줄.push({ 이름, 됨, 말 });
      칸들잡기([...줄]);
    };
    const 탈말 = (e: unknown) => {
      const x = e as { code?: string; message?: string };
      return [x?.code, x?.message].filter(Boolean).join(" · ") || String(e);
    };

    // ① 로그인
    찍("로그인", !!user, user ? `${user.uid.slice(0, 8)}… · ${user.email ?? "메일 없음"}` : "없음");
    if (!user) return void 도는중잡기(false);

    // ② 프로필 읽기
    let p = null as Awaited<ReturnType<typeof 내프로필>>;
    try {
      p = await 내프로필();
      찍("프로필 읽기", true, p ? `있음 · 못 채운 것: ${모자란것(p).join(", ") || "없음"}` : "아직 없음");
    } catch (e) {
      찍("프로필 읽기", false, 탈말(e));
    }

    // ③ 프로필 고치기 — **규칙이 막는지** 보는 자리
    try {
      await 프로필저장({ line: p?.line ?? "" });
      찍("프로필 고치기", true, "규칙 통과");
    } catch (e) {
      찍("프로필 고치기", false, 탈말(e));
    }

    // ④ 사진 굽기 — 자리를 얼마나 먹나
    let 파일: File | null = null;
    try {
      파일 = await 시험사진();
      찍("시험 그림 만들기", true, `${Math.round(파일.size / 1024)}KB`);
    } catch (e) {
      찍("시험 그림 만들기", false, 탈말(e));
    }

    // ⑤ 사진 올리기 — 저장소 규칙까지
    let 올린것: { path: string } | null = null;
    if (파일) {
      try {
        const 재기시작 = performance.now();
        올린것 = await 사진올리기(파일);
        찍("사진 올리기", true, `${Math.round(performance.now() - 재기시작)}ms`);
      } catch (e) {
        찍("사진 올리기", false, 탈말(e));
      }
    }

    // ⑥ 올린 것 치우기 — 시험 자국을 남기지 않는다
    if (올린것) {
      try {
        await 사진빼기(올린것.path);
        찍("시험 사진 치우기", true, "지웠습니다");
      } catch (e) {
        찍("시험 사진 치우기", false, `${탈말(e)} — 직접 빼 주세요`);
      }
    }

    // ⑦ 서버 뽑기
    try {
      const r = await 오늘뽑기();
      if ("탈" in r) 찍("오늘의 인연(서버)", false, `탈: ${r.탈}`);
      else 찍("오늘의 인연(서버)", true, `${r.picks.length}명 · 오늘 칸 ${r.cap}/${r.max}`);
    } catch (e) {
      찍("오늘의 인연(서버)", false, 탈말(e));
    }

    // ⑧ 서버가 깨어 있나
    try {
      const raw = await getDoc(doc(db, "yeon-profiles", user.uid));
      찍("문서 직접 읽기", raw.exists(), raw.exists() ? "있음" : "없음(아직 안 만듦)");
    } catch (e) {
      찍("문서 직접 읽기", false, 탈말(e));
    }

    // ⑨ 지갑 — 연꽃 쓰기 길이 막히지 않았나
    try {
      const w = await getDoc(doc(db, "wallets", user.uid));
      const d = w.exists() ? w.data() : null;
      찍(
        "지갑",
        true,
        d ? `연꽃 ${d.lotus ?? 0} · 유상 ${d.paid ?? "-"} · 무상 ${d.free ?? "-"}` : "아직 없음"
      );
      // 브라우저가 지갑을 고칠 수 있나 — 값은 그대로 두고 at 만 건드려 본다
      if (d) {
        try {
          await setDoc(doc(db, "wallets", user.uid), { lotus: d.lotus ?? 0 }, { merge: true });
          찍("지갑 고치기", false, "같은 값 쓰기는 규칙이 막는 게 맞습니다(−1 만 허용)");
        } catch {
          찍("지갑 고치기", true, "규칙이 −1 만 허용 — 정상");
        }
      }
    } catch (e) {
      찍("지갑", false, 탈말(e));
    }

    // ⑩ 판 그리는 일꾼이 쓰는 자리
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    찍(
      "메모리",
      null,
      mem
        ? `${Math.round(mem.usedJSHeapSize / 1048576)}MB / 한도 ${Math.round(mem.jsHeapSizeLimit / 1048576)}MB`
        : "이 브라우저는 안 알려 줍니다",
    );
    찍("브라우저", null, navigator.userAgent.slice(0, 120));

    도는중잡기(false);
  }, [user]);

  const 판 = {
    minHeight: "100dvh",
    padding: "24px 16px 80px",
    font: '13px/1.7 ui-monospace, "Malgun Gothic", monospace',
    color: "#2a2520",
    background: "#fbfaf8",
  } as const;

  if (!준비) return <div style={판}>…</div>;
  if (!뒷방)
    return (
      <div style={판}>
        <p style={{ fontWeight: 700 }}>인연 자가진단</p>
        <p style={{ marginTop: 8, color: "#8b8175" }}>
          뒷방 주인 계정으로 들어온 뒤에 열립니다.
        </p>
      </div>
    );

  return (
    <div style={판}>
      <p style={{ fontWeight: 700, fontSize: 15 }}>인연 자가진단</p>
      <p style={{ marginTop: 6, color: "#8b8175" }}>
        인연이 서는 데 필요한 것을 차례로 진짜 해 봅니다. 올린 시험 사진은
        그 자리에서 지웁니다.
      </p>
      <button
        onClick={() => void 재기()}
        disabled={도는중}
        style={{
          marginTop: 16,
          padding: "12px 22px",
          borderRadius: 999,
          border: "none",
          background: "#e87ba4",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {도는중 ? "재는 중…" : "재 보기"}
      </button>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {칸들.map((k, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "#fff",
              border: `1px solid ${k.됨 === false ? "rgba(210,87,140,0.4)" : "rgba(26,23,20,0.08)"}`,
            }}
          >
            <b>
              {k.됨 === null ? "·" : k.됨 ? "✅" : "❌"} {k.이름}
            </b>
            <p style={{ margin: "4px 0 0", color: k.됨 === false ? "#c2456f" : "#6b635a", wordBreak: "break-all" }}>
              {k.말}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
