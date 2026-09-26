"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import Gongyang, { type 공양갈래 } from "@/components/Gongyang";
import LotusCount, { pingLotus } from "@/components/LotusCount";
import { Yeonkkot } from "@/components/icons";
import { loadMe } from "@/lib/me";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { EXTEND_DAYS, POUR_PER_DAY, POUR_UNIT, PRIVATE_BURN_DAYS, PRIVATE_CANDLE_PRICE, PUBLIC_BURN_DAYS, PUBLIC_CANDLE_PRICE, 자리, 향꽂이 } from "@/lib/candleSpec";
import { giveMerit } from "@/lib/merit";
import { daysLeft, fetchCandles, fetchMyCandles, lightCandle, removeCandle, type Candle, burning } from "@/lib/candle";

type Comment = { id: string; by?: string; body?: string; to?: string | null; likes?: number };

/** 게시판의 작은 그림 둘 — 글자와 같은 키로 선다 */
const 하트 = () => (
  <svg viewBox="0 0 24 24" aria-hidden width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20.3 4.3 12.9a4.7 4.7 0 0 1 6.6-6.7l1.1 1 1.1-1a4.7 4.7 0 0 1 6.6 6.7Z" />
  </svg>
);
const 말풍선 = () => (
  <svg viewBox="0 0 24 24" aria-hidden width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.5 12.2c0 3.8-3.8 6.9-8.5 6.9-1 0-2-.15-2.9-.4L4 20.5l1.5-3.3A6.6 6.6 0 0 1 3.5 12.2c0-3.8 3.8-6.9 8.5-6.9s8.5 3.1 8.5 6.9Z" />
  </svg>
);

/** 한 줄에 몇 개나 — **많이 걸릴수록 촘촘해진다.**
 *
 *  형: 「연등은 많이 걸릴수록 크기? 원근? 조절해서 이렇게 보이도록」
 *      (김부따처럼 천장이 등으로 꽉 차는 그림)
 *
 *  등 크기를 상수로 두면 열 개까지는 예쁜데 백 개가 되면 스무 줄이
 *  되어 천장이 아니라 목록이 된다. 진짜 법당은 등이 늘면 **줄 수가
 *  아니라 밀도**가 는다 — 한 줄에 더 많이, 더 작게, 더 겹쳐서.
 *  그래서 한 줄에 서는 수를 수에서 끌어낸다(√). 셋에서 아홉까지.
 */
function 한줄에(n: number) {
  return Math.min(9, Math.max(3, Math.round(Math.sqrt(n * 1.7))));
}

/** 등 하나가 차지하는 폭(%) — 옆 여백 -1.6% 를 얹은 값 */
function 폭(n: number) {
  return 100 / 한줄에(n) + 3.2;
}

function CandleMark({ c, onClick, i, 열, 줄수 = 1, mine }: { c: Candle; onClick: () => void; i: number; 열: number; 줄수?: number; mine?: boolean }) {
  // ── 원근 — **맨 아랫줄이 앞이다** ─────────────────────────
  // 형: 「이건 내가 말한 원근법 느낌이 아닌데? 겹치더라도 내가 준
  //      레퍼런스처럼 하고, 위에 다는 선은 없어도 되겠다」
  //
  // 여태 **첫 줄(맨 위)을 앞**으로 두었다. 그러니 위엣것이 크고 아랫것이
  // 작아, 천장이 아니라 벽에 붙은 포스터로 보였다.
  // 진짜 천장은 눈에 가까운 쪽 — **아래쪽 줄이 크고 앞**이고, 뒤로
  // 갈수록 위로 올라가며 작아지고 옅어진다. 뒤집는다.
  const 줄번호 = Math.floor(i / 열);
  const 뒤로 = 줄수 > 1 ? (줄수 - 1 - 줄번호) / (줄수 - 1) : 0; // 0 앞(맨 아래) ~ 1 뒤(맨 위)
  const 깊이 = 뒤로 * 0.88;
  // 줄(실)은 이제 안 그린다 — 띄우는 몫만 조금. 뒤엣것일수록 바짝
  const 줄 = (4 + (i % 3) * 3) * (1 - 뒤로 * 0.6);
  // 씨는 **사람마다 고정** — 같은 이가 오면 늘 같은 빛깔의 등이 걸린다
  const seed = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  // 옛 문서에는 갈래 칸이 없다 — 없으면 연등이다(여태 다 연등이었다)
  // 내 것인가 — 「내 것만」을 켜면 이 표를 보고 나머지가 희미해진다
  return <span className="hip-hang" data-mine={mine ? "1" : undefined}><Gongyang 갈래={c.gift ?? "deung"} name={c.forName || c.by || "이름 없는 이"} seed={seed} drop={줄} 깊이={깊이} dim={!burning(c)} onClick={onClick} /></span>;
}

/** 무엇을 올릴까 — **밑에서 올라오는 판**.
 *
 *  형: 「이거 팝업 스타일로 가자. 공양 끌어 올리면 여러 공양 아이템
 *       나오고, 또 눌리면 팝업으로 사연 쓰기. 사연 버튼은 남기고」
 *
 *  여태 고르는 알약 넷이 **사연 쓰는 판 안**에 있었다. 무엇을 올릴지
 *  아직 안 정했는데 이름 칸과 사연 칸이 먼저 보이니, 판을 열자마자
 *  「쓰는 일」로 읽혔다. 고르는 일과 쓰는 일은 다른 일이다 —
 *  먼저 고르고, 고른 다음에 쓴다.
 */
const 공양들: { k: 공양갈래; 이름: string; 그림: string; 말: string }[] = [
  { k: "deung", 이름: "연등", 그림: "/obj/deung.png", 말: "천장에 걸린다" },
  { k: "ssal", 이름: "쌀", 그림: "/obj/gong-ssal.png", 말: "불단에 올린다" },
  { k: "cho", 이름: "초", 그림: "/obj/gong-cho.png", 말: "불단에 밝힌다" },
  { k: "hyang", 이름: "향", 그림: "/obj/gong-hyang.png", 말: "향로에 꽂는다" },
];

function 공양고르기({ onPick, onClose }: { onPick: (k: 공양갈래) => void; onClose: () => void }) {
  return (
    <div className="hip-gift" role="dialog" aria-label="공양 고르기" onClick={onClose}>
      <div className="hip-gift-box" onClick={(e) => e.stopPropagation()}>
        {/* 손잡이 — 밑에서 올라온 판이라는 표 */}
        <i className="hip-gift-grip" aria-hidden />
        <div className="hip-gift-top">
          <p>供養 · 무엇을 올릴까요</p>
          <button onClick={onClose}>닫기</button>
        </div>
        <ul className="hip-gift-grid">
          {공양들.map((g) => (
            <li key={g.k}>
              <button type="button" onClick={() => onPick(g.k)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.그림} alt="" draggable={false} />
                <b>{g.이름}</b>
                <i>{g.말}</i>
                <em>
                  <Yeonkkot className="h-[12px] w-[12px]" />
                  {PRIVATE_CANDLE_PRICE}
                </em>
              </button>
            </li>
          ))}
        </ul>
        <p className="hip-gift-foot">
          공개로 걸면 연꽃 {PUBLIC_CANDLE_PRICE}송이 · {PUBLIC_BURN_DAYS}일
        </p>
      </div>
    </div>
  );
}

function CandleForm({ 갈래, onClose, onDone }: { 갈래: 공양갈래; onClose: () => void; onDone: () => void }) {
  // 형: 「연등 공양, 쌀 공양, 초 공양 이렇게 달 수 있게 하자」
  const gift = 갈래;
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [forName, setForName] = useState(""); const [wish, setWish] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef("");
  const publicCandle = visibility === "public"; const cost = publicCandle ? PUBLIC_CANDLE_PRICE : PRIVATE_CANDLE_PRICE;
  const submit = async () => {
    if (!wish.trim() || busy) return; if (!key.current) key.current = crypto.randomUUID().replaceAll("-", ""); setBusy(true); setError("");
    try { const r = await lightCandle({ forName, wish, visibility, gift }, key.current); if (!r) { setError("연꽃이 모자랍니다"); return; } pingLotus(); onDone(); }
    catch { setError("연등을 달지 못했습니다. 잠시 뒤 다시 해 주세요."); } finally { setBusy(false); }
  };
  // 달기 전에 **내 등이 어떻게 걸리는지** 보여 준다.
  // 형이 참고로 준 판은 빈 칸에 글만 쓰게 한다. 우리는 쓰는 동안 등이
  // 이미 걸려 있고 쪽지에 이름이 적힌다 — 무엇을 만드는 중인지가
  // 글이 아니라 물건으로 보인다.
  const 미리 = forName.trim() || loadMe()?.name || "이름 없는 이";
  const 씨 = 미리.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);

  return (
    <div className="hip-deung-form" role="dialog" aria-label="연등 달기">
      <div className="hip-deung-form-box">
        <div className="hip-deung-form-top">
          <p>供養 · 공양 올리기</p>
          <button onClick={onClose}>닫기</button>
        </div>
        {/* 형: 「저거 사이즈는 유지, 쌀로 될 때 너무 작아진다.
                 법명 나오게 하지 말고」
            미리보기 칸이 물건 크기를 안 잡고 있어서, 등은 크고 쌀은
            제 그림 비율대로 쪼그라들었다. 칸이 키를 쥔다 — 무엇을
            골라도 같은 자리에 같은 크기로 선다. */}
        <div className="hip-deung-preview">
          <Gongyang 갈래={gift} name={미리} seed={씨} drop={18} />
        </div>

        <label className="hip-deung-lab">쪽지에 적을 이름</label>
        <input
          value={forName}
          onChange={(e) => setForName(e.target.value.slice(0, 20))}
          placeholder={loadMe()?.name ?? "이름 없는 이"}
          className="hip-deung-in"
        />

        <label className="hip-deung-lab">
          사연
          <span>{wish.length} / 120</span>
        </label>
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value.slice(0, 120))}
          rows={4}
          placeholder="사연이나 기원하는 내용을 적어 보세요"
          className="hip-deung-in hip-deung-area"
        />

        <div className="hip-deung-pick">
          <button
            onClick={() => setVisibility("private")}
            data-on={!publicCandle ? "1" : undefined}
          >
            <b>연꽃 1송이</b>
            <i>나만 보기 · {PRIVATE_BURN_DAYS}일</i>
          </button>
          <button
            onClick={() => setVisibility("public")}
            data-on={publicCandle ? "1" : undefined}
          >
            <b>연꽃 2송이</b>
            <i>법당에 걸기 · {PUBLIC_BURN_DAYS}일</i>
          </button>
        </div>

        {error && (
          <p className="hip-deung-bad">
            {error} <Link href="/lotus">연꽃 공양</Link>
          </p>
        )}

        <button
          onClick={submit}
          disabled={!wish.trim() || busy}
          className="hip-deung-go"
        >
          <Yeonkkot className="h-4 w-4" />
          {busy ? "다는 중" : `연꽃 ${cost}송이로 달기`}
        </button>
        {/* 「3일 동안 걸립니다」 — 뺀다. 바로 위 고르는 칸에 이미
            「나만 보기 · 3일」이라 적혀 있다. 같은 말을 두 번 하면
            둘 다 안 읽힌다(형: 「개같은 멘트 넣지 말라고 했다」) */}
      </div>
    </div>
  );
}

/**
 * 사연 한 자리 — 읽고, 공감하고, 댓글 달고, 공덕을 나눈다.
 *
 * 형: 「유튜브 슬픈 노래처럼 사연이랑 댓글 달도록 하자」
 *     「2개 연꽃 받치면 7일이고, 그거 줄어드는 거 보여지도록 하고」
 *     「사람들이 내 공덕 나눠주기 기능 넣어서 얼마간 정도면 하루 늘어나도록」
 *
 * 남은 날을 **줄자로** 보여 준다 — 「3일 남음」 넉 자보다 줄어드는 띠
 * 하나가 급하다. 그 아래에 공덕 그릇이 얼마나 찼는지가 함께 선다.
 * 서른 바퀴가 차면 하루가 는다(candleSpec POUR_PER_DAY).
 */
function Story({ c, me, onClose, onChanged }: { c: Candle; me: User | null; onClose: () => void; onChanged: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [공감, 공감잡기] = useState(c.cheers ?? 0);
  const [눌렀나, 눌렀나잡기] = useState(false);
  const [모임, 모임잡기] = useState(c.pool ?? 0);
  const [나눔말, 나눔말잡기] = useState("");
  const mine = me?.uid === c.uid;
  /** 제 것 손보는 서랍(⋯) — 늘리기·고치기·내리기는 여기 들어간다 */
  const [서랍, 서랍잡기] = useState(false);
  /** 고치는 중인가 — 형: 「사연도 작성자가 편집할 수 있도록 두자」 */
  const [고침, 고침잡기] = useState(false);
  const [사연글, 사연글잡기] = useState(c.wish ?? "");
  const [이름글, 이름글잡기] = useState(c.forName ?? "");

  /** 내가 좋아요 누른 댓글 — 로그인했을 때만 온다 */
  const [좋아요한, 좋아요한잡기] = useState<string[]>([]);
  /** 어느 댓글에 답글을 쓰는 중인가 */
  const [답할것, 답할것잡기] = useState<string | null>(null);
  const [답글, 답글잡기] = useState("");
  /** 처음엔 몇 개만 — 형: 「유튜브 준 거랑 거의 동일하게, 댓글 더보기」 */
  const [다펴기, 다펴기잡기] = useState(false);
  const 첫줄 = 3;

  const read = useCallback(() => {
    void (async () => {
      const h: HeadersInit = me ? { authorization: `Bearer ${await me.getIdToken()}` } : {};
      const x = await fetch(`/api/candle/comment?id=${encodeURIComponent(c.id)}`, { headers: h })
        .then((r) => r.json())
        .catch(() => null);
      setComments(Array.isArray(x?.comments) ? x.comments : []);
      좋아요한잡기(Array.isArray(x?.liked) ? x.liked : []);
    })();
  }, [c.id, me]);

  /** 댓글 좋아요 — 눌린 티는 그 자리에서, 수는 서버 말대로 */
  const 댓글좋아요 = async (cid: string) => {
    if (!me) return;
    const 켬 = !좋아요한.includes(cid);
    좋아요한잡기((v) => (켬 ? [...v, cid] : v.filter((x) => x !== cid)));
    setComments((v) => v.map((x) => (x.id === cid ? { ...x, likes: Math.max(0, (x.likes ?? 0) + (켬 ? 1 : -1)) } : x)));
    const r = await fetch("/api/candle/comment", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` },
      body: JSON.stringify({ id: c.id, act: "like", cid }),
    }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) read(); // 어긋났으면 서버 말로 되돌린다
  };

  /** 답글 — 어미 댓글 밑에 한 겹으로만 붙는다 */
  const 답하기 = async (to: string) => {
    if (!me || !답글.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/candle/comment", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` },
        body: JSON.stringify({ id: c.id, body: 답글, to, by: loadMe()?.name ?? "이름 없는 이" }),
      });
      답글잡기(""); 답할것잡기(null); read();
    } finally { setBusy(false); }
  };
  useEffect(() => { if (c.visibility === "public") read(); }, [c.visibility, read]);
  // **이미 공감했나**를 읽어 온다. 안 읽어 오면 다시 열었을 때 눌림이
  // 꺼져 있고, 누르는 순간 서버는 「두 번째」로 보아 **조용히 거둔다** —
  // 공감하려다 공감을 무르는 꼴이 된다.
  useEffect(() => {
    if (!me) return;
    let 살아있다 = true;
    void getDoc(doc(db, "candle-cheers", `${c.id}_${me.uid}`))
      .then((s) => { if (살아있다) 눌렀나잡기(s.exists()); })
      .catch(() => {});
    return () => { 살아있다 = false; };
  }, [c.id, me]);

  const 두드리기 = async (act: "cheer" | "pour") => {
    if (!me || busy) return null;
    setBusy(true);
    try {
      const r = await fetch("/api/candle/cheer", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` },
        body: JSON.stringify({ id: c.id, act }),
      });
      return (await r.json().catch(() => null)) as { ok?: boolean; on?: boolean; added?: boolean; error?: string } | null;
    } finally {
      setBusy(false);
    }
  };

  const 공감누름 = async () => {
    const r = await 두드리기("cheer");
    if (!r?.ok) return;
    눌렀나잡기(!!r.on);
    공감잡기((v) => v + (r.on ? 1 : -1));
  };

  /** 공덕 한 바퀴를 이 자리에 붓는다 — 내 장부에서 빠지고 그릇이 찬다 */
  const 나눔누름 = async () => {
    나눔말잡기("");
    if (!giveMerit(c.uid, POUR_UNIT)) {
      나눔말잡기("오늘은 여기까지");
      return;
    }
    const r = await 두드리기("pour");
    if (!r?.ok) {
      나눔말잡기(r?.error === "already-today" ? "오늘 이미 나눴습니다" : "보내지 못했습니다");
      return;
    }
    모임잡기((v) => (r.added ? v + POUR_UNIT - POUR_PER_DAY : v + POUR_UNIT));
    나눔말잡기(r.added ? "하루가 늘었습니다" : "");
    if (r.added) onChanged();
  };

  const post = async () => {
    if (!me || !body.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/candle/comment", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` },
        body: JSON.stringify({ id: c.id, body, by: loadMe()?.name ?? "이름 없는 이" }),
      });
      setBody("");
      read();
    } finally { setBusy(false); }
  };

  const extend = async () => {
    if (!me || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/candle/extend", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` },
        body: JSON.stringify({ id: c.id }),
      });
      if (r.ok) { pingLotus(); 나눔말잡기(mine ? "" : `${EXTEND_DAYS}일 보탰습니다`); onChanged(); return; }
      // **조용히 실패하지 않는다.** 연꽃이 모자라면 402 가 오는데 화면은
      // 아무 말도 안 했다 — 눌러도 아무 일이 없으니 고장으로 읽힌다.
      // (관리자는 값을 안 치러 늘 성공하니 형 계정으로는 안 보였다)
      나눔말잡기(
        r.status === 402 ? "연꽃이 모자랍니다"
        : r.status === 409 ? "더 늘릴 수 없습니다"
        : "늘리지 못했습니다"
      );
    } finally { setBusy(false); }
  };

  /** 고친 것을 적는다 — 사연과 이름 둘뿐이다(규칙이 그 둘만 연다) */
  const 고쳐쓰기 = async () => {
    if (!me || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "candles", c.id), {
        wish: 사연글.slice(0, 120),
        forName: 이름글.trim().slice(0, 20) || (c.forName ?? "이름 없는 기원"),
      });
      고침잡기(false);
      onChanged();
    } catch {
      나눔말잡기("고치지 못했습니다");
    } finally { setBusy(false); }
  };

  const 남은 = daysLeft(c);
  const 처음 = c.visibility === "public" ? PUBLIC_BURN_DAYS : PRIVATE_BURN_DAYS;

  return (
    <div className="hip-say" role="dialog" aria-label="사연" onClick={onClose}>
      <div className="hip-say-box" onClick={(e) => e.stopPropagation()}>
        {/* 형: 「저거 하나는 지우고 맨 위가 0일 남음이 나오면 될 듯」
            이름이 머리에 한 번, 쪽지 이름으로 또 한 번 — 같은 말이 두
            줄이었다. 머리에는 이 판에서 제일 급한 것 하나만 둔다:
            **며칠 남았나.** 그 밑 줄자가 줄어드는 것을 보여 준다. */}
        <div className="hip-say-top">
          <p data-day={남은 <= 1 ? "1" : undefined}>{남은}일 남음</p>
          <button onClick={onClose}>닫기</button>
        </div>

        {/* 남은 날 — 줄자로. 글자는 위에 있으니 여기는 띠만 */}
        <div className="hip-say-left" data-bare="1">
          <i style={{ width: `${Math.max(2, Math.min(100, (남은 / 처음) * 100))}%` }} />
        </div>

        {/* ── 사연 — 제 것이면 그 자리에서 고친다 ─────────────
            형: 「사연도 작성자가 편집할 수 있도록 두자」 */}
        {고침 ? (
          <div className="hip-say-edit">
            <input
              value={이름글}
              onChange={(e) => 이름글잡기(e.target.value.slice(0, 20))}
              placeholder="쪽지에 적을 이름"
            />
            <textarea
              value={사연글}
              onChange={(e) => 사연글잡기(e.target.value.slice(0, 120))}
              rows={4}
              placeholder="사연이나 기원하는 내용"
            />
            <div>
              <span>{사연글.length} / 120</span>
              <button onClick={() => { 고침잡기(false); 사연글잡기(c.wish ?? ""); 이름글잡기(c.forName ?? ""); }}>그만</button>
              <button data-go="1" onClick={고쳐쓰기} disabled={busy}>다 고쳤다</button>
            </div>
          </div>
        ) : (
          <>
            <p className="hip-say-wish">{c.wish}</p>
            <p className="hip-say-by">{c.by || "이름 없는 이"}</p>
          </>
        )}

        {/* ── 한 줄 — 게시판의 그 줄 ─────────────────────────
            형: 「내리기가 메인이 아니잖아. 공감 버튼 크기도 너무 커.
                 자연스러운 게시판처럼 보이도록. 내리기는 구석진 데로
                 숨기고 댓글 쓰기로 가자」

            공감이 판 너비만 한 알약 한 줄, 내리기가 또 한 줄이었다.
            둘 다 크니 「이 판은 내리는 판」으로 읽혔다. 게시판의 그
            줄로 바꾼다 — 작은 글씨, 아이콘 하나, 숫자.
            제 것 손보는 일은 ⋯ 서랍 안으로 들어간다. */}
        <div className="hip-say-bar">
          {mine ? (
            /* 제 공양에 제가 공감하는 건 나눔이 아니다. 그래서 막혀
               있는데, 죽은 단추로 두니 「왜 공감이 안 되냐」가 됐다.
               단추를 없애고 **수만** 적는다 */
            <span data-stat="1"><하트 /> {공감}</span>
          ) : (
            <button onClick={공감누름} disabled={!me || busy} data-on={눌렀나 ? "1" : undefined}>
              <하트 /> {공감 > 0 ? 공감 : "공감"}
            </button>
          )}

          {c.visibility === "public" && (
            <span data-stat="1"><말풍선 /> {comments.length}</span>
          )}

          {!mine && (
            <button onClick={나눔누름} disabled={!me || busy}>공덕 {POUR_UNIT}</button>
          )}
          {/* 형: 「사람들이 내 공덕이나 연꽃 나눔 하면 기한 늘어나도록」
              공덕은 서른 사람이 모여야 하루다. 연꽃은 한 송이가 곧
              사흘 — 남의 등에도 보탤 수 있게 연다 */}
          {!mine && c.visibility === "public" && (
            <button onClick={() => void extend()} disabled={!me || busy}>
              <Yeonkkot className="h-[13px] w-[13px]" />
              {EXTEND_DAYS}일
            </button>
          )}

          <i aria-hidden />

          {mine && (
            <button data-more="1" onClick={() => 서랍잡기((v) => !v)} aria-label="내 공양 손보기">⋯</button>
          )}
        </div>

        {/* ⋯ 서랍 — 늘리기 · 고치기 · 내리기 */}
        {mine && 서랍 && (
          <div className="hip-say-drawer">
            {c.visibility === "public" && (
              <button onClick={() => { 서랍잡기(false); void extend(); }} disabled={busy}>
                연꽃 1송이로 {EXTEND_DAYS}일 더
              </button>
            )}
            <button onClick={() => { 서랍잡기(false); 고침잡기(true); }}>사연 고치기</button>
            <button data-danger="1" onClick={async () => { await removeCandle(c.id); onChanged(); onClose(); }}>
              내리기
            </button>
          </div>
        )}

        {/* 그릇 — 서른 바퀴가 차면 하루가 는다 */}
        {!mine && (
          <div className="hip-say-pool">
            <i style={{ width: `${Math.min(100, (모임 / POUR_PER_DAY) * 100)}%` }} />
            <b>{모임.toLocaleString("ko-KR")} / {POUR_PER_DAY.toLocaleString("ko-KR")} · 차면 하루</b>
          </div>
        )}
        {나눔말 && <p className="hip-say-note">{나눔말}</p>}

        {c.visibility === "public" ? (
          <>
            {/* 댓글 — 이 판의 주인공. 쓰는 칸이 목록 **위**에 선다 */}
            {me && (
              <div className="hip-say-write">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 240))}
                  placeholder="댓글 쓰기"
                  onKeyDown={(e) => { if (e.key === "Enter") void post(); }}
                />
                <button onClick={post} disabled={!body.trim() || busy}>남기기</button>
              </div>
            )}
            {/* ── 댓글 — 어미 하나에 답글 한 겹 ───────────────
                형: 「연등 댓글 좋아요·답글」
                겹을 깊이 파지 않는다. 두 겹이면 폰에서 글이 벽에
                붙는다 — 답글의 답글도 같은 겹에 붙인다(서버가 그렇게
                접어 준다). */}
            <div className="hip-say-cmt">
              {(다펴기 ? comments.filter((x) => !x.to) : comments.filter((x) => !x.to).slice(0, 첫줄))
                .map((x) => {
                  const 답들 = comments.filter((y) => y.to === x.id);
                  return (
                    <div key={x.id} className="hip-cmt">
                      <p><span>{x.by ?? "이름 없는 이"}</span>{x.body}</p>
                      <div className="hip-cmt-bar">
                        <button
                          onClick={() => void 댓글좋아요(x.id)}
                          disabled={!me}
                          data-on={좋아요한.includes(x.id) ? "1" : undefined}
                        >
                          <하트 /> {x.likes ? x.likes : ""}
                        </button>
                        {me && (
                          <button onClick={() => { 답할것잡기(답할것 === x.id ? null : x.id); 답글잡기(""); }}>
                            답글{답들.length ? ` ${답들.length}` : ""}
                          </button>
                        )}
                      </div>

                      {답들.map((y) => (
                        <div key={y.id} className="hip-cmt hip-cmt-re">
                          <p><span>{y.by ?? "이름 없는 이"}</span>{y.body}</p>
                          <div className="hip-cmt-bar">
                            <button
                              onClick={() => void 댓글좋아요(y.id)}
                              disabled={!me}
                              data-on={좋아요한.includes(y.id) ? "1" : undefined}
                            >
                              <하트 /> {y.likes ? y.likes : ""}
                            </button>
                          </div>
                        </div>
                      ))}

                      {답할것 === x.id && me && (
                        <div className="hip-say-write hip-cmt-re">
                          <input
                            autoFocus
                            value={답글}
                            onChange={(e) => 답글잡기(e.target.value.slice(0, 240))}
                            placeholder={`${x.by ?? "이름 없는 이"}에게 답글`}
                            onKeyDown={(e) => { if (e.key === "Enter") void 답하기(x.id); }}
                          />
                          <button onClick={() => void 답하기(x.id)} disabled={!답글.trim() || busy}>남기기</button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* 유튜브의 그 줄 — 접어 두고 「댓글 n개 모두 보기」 */}
              {!다펴기 && comments.filter((x) => !x.to).length > 첫줄 && (
                <button className="hip-cmt-more" onClick={() => 다펴기잡기(true)}>
                  댓글 {comments.length}개 모두 보기
                </button>
              )}
            </div>
          </>
        ) : (
          /* 나만 보는 공양에는 댓글이 없다 — 볼 사람이 나뿐이라서다.
             빈 판은 고장으로 읽히니 까닭을 한 줄로만 말한다 */
          <p className="hip-say-only">나만 보는 공양입니다</p>
        )}
      </div>
    </div>
  );
}

/**
 * 사연 목록 — 게시판 결.
 *
 * 형: 「사연 보러가기를 눌리면 게시판 느낌으로 뜨도록 해. 지금 하나하나
 *      눌리면 그건 오바 같고. 전체 보러가기 하면 사연 보여지고」
 *
 * 천장에 걸린 등을 하나씩 눌러 읽게 하면, 읽고 싶은 사람이 서른 번을
 * 눌러야 한다. 등은 **보는 것**이고 사연은 **읽는 것**이다 — 자리를 가른다.
 */
function 사연목록({
  들,
  me,
  onClose,
  onPick,
}: {
  들: Candle[];
  me: User | null;
  onClose: () => void;
  onPick: (c: Candle) => void;
}) {
  const 갈래말 = { deung: "연등", ssal: "쌀", cho: "초", hyang: "향" } as const;
  return (
    <div className="hip-say" role="dialog" aria-label="사연">
      <div className="hip-say-box">
        <div className="hip-say-top">
          <p>사연</p>
          <button onClick={onClose}>닫기</button>
        </div>
        {들.length === 0 ? (
          <p className="hip-hall-say">아직 걸린 공양이 없습니다.</p>
        ) : (
          <ul className="hip-say-list">
            {들.map((c) => (
              <li key={c.id}>
                <button onClick={() => onPick(c)}>
                  <span className="hip-say-head">
                    <b>{c.forName || "이름 없는 기원"}</b>
                    <i>{갈래말[c.gift ?? "deung"]}</i>
                    {c.uid === me?.uid && <u>내 공양</u>}
                  </span>
                  <span className="hip-say-body">{c.wish}</span>
                  {/* 형: 「쓴 이름은 나오지 않게, 제목이랑 내용만 살짝.
                           그래야 댓 다니까」
                      이름이 붙으면 「누가 썼나」가 먼저 읽힌다 — 아는
                      사람이면 눈치가 보이고, 모르는 사람이면 남의 일이
                      된다. 사연만 남기면 사연에 대고 말하게 된다.
                      쓴 이는 한 자리 안(사연 판)에서만 보인다. */}
                  <span className="hip-say-foot">
                    {(c.cheers ?? 0) > 0 && <s>공감 {c.cheers}</s>}
                    <time>{daysLeft(c)}일 남음</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function CandleHall() {
  const [me, setMe] = useState<User | null>(null); const [publicCandles, setPublicCandles] = useState<Candle[] | null>(null); const [mine, setMine] = useState<Candle[]>([]); const [form, setForm] = useState(false); const [open, setOpen] = useState<Candle | null>(null);
  // 형: 「내 연등 이렇게 하면 딱 티나게, 나머진 희미해지고 내 것만 밝아져서」
  const [내것만, 내것만잡기] = useState(false);
  // 형: 「사연 보러가기 누르면 게시판 느낌으로. 하나하나 눌리면 오바 같고」
  const [사연판, 사연판잡기] = useState(false);
  /** 무엇을 올릴지 고르는 판(밑에서 올라온다) */
  const [고르기, 고르기잡기] = useState(false);
  const [고른것, 고른것잡기] = useState<공양갈래>("deung");
  /** 아래에서 위로 쓸기 — 손가락이 내려앉은 자리 */
  const 쓸기 = useRef<number | null>(null);
  const load = useCallback(() => { void fetchCandles().then(setPublicCandles).catch(() => setPublicCandles([])); void fetchMyCandles().then(setMine).catch(() => setMine([])); }, []);
  useEffect(() => watchAuth((u) => { setMe(u); load(); }), [load]);
  // ── 뒤로가기는 **한 층만** 걷는다 ─────────────────────────
  // 형: 「공양에서 뒤로 가기 눌리면 다시 공양이 돼야지, 인연 페이지로 간다」
  //
  // 공양 쓰는 판도, 사연 게시판도 주소를 안 바꾼다(제자리에서 뜨는 판이다).
  // 그러니 폰의 뒤로가기는 그 판을 못 보고 **한 주소 앞**으로 간다 —
  // 법당에 오기 전에 있던 인연으로. 판을 열 때 층을 하나 쌓고,
  // popstate 가 위에서부터 한 겹씩 접는다(게시판이 이미 그렇게 한다).
  const 층쌓기 = () => {
    try { window.history.pushState({ hwadooLayer: true }, ""); } catch { /* 못 쌓아도 판은 열린다 */ }
  };
  /** popstate 가 지금 무엇이 떠 있는지 읽도록 — 효과는 한 번만 건다 */
  const 층 = useRef({ form: false, 고르기: false, open: false, 사연판: false });
  층.current = { form, 고르기, open: !!open, 사연판 };
  useEffect(() => {
    const onPop = () => {
      const l = 층.current;
      if (l.form) return void setForm(false);
      if (l.고르기) return void 고르기잡기(false);
      if (l.open) return void setOpen(null);
      if (l.사연판) return void 사연판잡기(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  /** 화면의 닫기 단추도 **뒤로가기를 부른다** — 쌓은 층을 같이 걷으려고 */
  const 닫기 = () => window.history.back();

  /** 무엇을 올릴까 — 먼저 고르고, 고른 다음에 쓴다 */
  const start = async () => { if (!me) { await loginWithGoogle(); return; } 층쌓기(); 고르기잡기(true); };
  const 열기 = (c: Candle) => { 층쌓기(); setOpen(c); };
  const activeMine = mine.filter((c) => c.until > Date.now());
  // 형: 「함께 건 연등 / 내 연등 구분 말고, 저 은은한 박스는 유지하고
  //      다 저기에만 걸리게 한다」 「공양 버튼 오른쪽 아래 두기만 하고
  //      위까지 올려서 최대한 많이 공간 쓰도록」
  //
  // 나눠 두었더니 판이 셋이 됐다 — 제목 줄, 남의 등 칸, 내 등 칸.
  // 셋 다 반쯤 비어서 어느 하나도 「법당」으로 안 읽혔다.
  // **칸은 하나다.** 남의 것도 내 것도 같은 천장에 걸린다(절이 그렇다).
  // 그 칸이 화면을 다 쓰고, 올리는 단추는 그 위에 떠 있다.
  const 다걸린것 = [
    ...(publicCandles ?? []),
    // 내 것 중 남의 칸에 안 뜬 것만 보탠다(나만 보기로 건 것)
    ...activeMine.filter((m) => !(publicCandles ?? []).some((p) => p.id === m.id)),
  ];

  // ── 자리는 정해져 있다 ─────────────────────────────────
  // 형: 「향로는 아무리 사연 많이 달아도 하나만. 연등도 최대 갯수랑
  //      다 찼을 때 와꾸까지. 무한대로 다는 거 아니다. 초 역시」
  //
  // 넘치는 것은 **버리지 않는다** — 장부에도 사연 게시판에도 그대로
  // 있고, 여기 천장과 불단에만 안 선다. 서는 것은 늘 최근 것부터.
  const 갈래로 = (k: string) => 다걸린것.filter((c) => (c.gift ?? "deung") === k);
  const 등들 = 갈래로("deung").slice(0, 자리.deung);
  const 초들 = 갈래로("cho").slice(0, 자리.cho);
  const 쌀들 = 갈래로("ssal").slice(0, 자리.ssal);
  const 향들 = 갈래로("hyang");
  // 향로는 하나 — 올린 수는 꽂힌 향으로 센다
  const 향로 = 향들[0] ?? null;
  const 물들 = [...쌀들, ...초들];
  /** 못 선 것 — 「자리가 다 찼다」를 말해 주는 수 */
  const 못선것 =
    Math.max(0, 갈래로("deung").length - 자리.deung) +
    Math.max(0, 갈래로("cho").length - 자리.cho) +
    Math.max(0, 갈래로("ssal").length - 자리.ssal) +
    Math.max(0, 향들.length - 1);

  return <div className="hip-hall">
    <div className="hip-hall-top">
      {/* 「내 것만」 — 누르면 남의 것이 희미해지고 내 것만 밝아진다.
          거르지 않는다(사라지면 법당이 빈다) — **밝기로 가른다.**
          절에서 제 등을 찾는 일이 그렇다: 다 걸려 있는데 내 것만 눈에 든다 */}
      <button
        className="hip-hall-mine"
        data-on={내것만 ? "1" : undefined}
        onClick={() => 내것만잡기((v) => !v)}
        aria-pressed={내것만}
      >
        내 공양
      </button>
      <h1>法堂 · 법당</h1>
      <LotusCount className="shrink-0" merit={false}/>
    </div>
    {/* 형: 「위는 연등, 아래는 초 쌀 등등 뭐 이런 식으로 가자」
        절이 그렇다 — 등은 천장에 매달리고 공양물은 불단 위에 놓인다.
        한 칸 안에서 위아래로만 가른다(칸을 또 쪼개지 않는다). */}
    <div className="hip-hall-sky" data-mine-only={내것만 ? "1" : undefined}>
      {publicCandles === null ? (
        <p className="hip-hall-say">등을 살피는 중</p>
      ) : 다걸린것.length ? (
        <>
          {/* 천장 — 법당의 **윗부분**. 형: 「법당은 윗부분만 연등으로」
              등이 아무리 많아도 여기까지만 쓰고, 넘치면 안에서 굴린다.
              그래야 아래 불단이 늘 제자리에 있다 */}
          <div className="hip-hall-ceil">
            <div
              className="hip-deung-sky"
              /* 폭 = 한 자리 몫 + 겹치는 몫. 옆 여백이 -1.6% 씩이라
                 **차지하는 폭은 정확히 100/열** 이 된다 — 그래야 눈에
                 보이는 줄과 위에서 센 줄(깊이)이 어긋나지 않는다.
                 남는 3.2% 가 서로 겹치는 몫이다(띄엄띄엄 걸면 격자가
                 되고, 겹쳐야 천장이 찬다) */
              style={
                {
                  "--deung-w": String(폭(등들.length)),
                  // 켜끼리 얼마나 물리나. **%로 준 세로 여백은 폭을 기준으로
                  // 잰다**(CSS 가 그렇다) — 그걸 모르고 -34% 를 줬더니 여섯
                  // 켜가 한 켜로 포개졌다. 그림 비율(663/920 = 0.721)로
                  // 키를 되돌려 계산한다: 한 켜 키 = 폭 ÷ 0.721.
                  // 그 키의 **44%** 만큼 물린다 — 앞 켜가 뒤 켜의 아랫배까지 먹는다
                  "--deung-lap": String(-(폭(등들.length) / 0.721) * 0.44),
                } as React.CSSProperties
              }
            >
              {등들.map((c, i) => (
                <CandleMark
                  key={c.id}
                  c={c}
                  i={i}
                  열={한줄에(등들.length)}
                  줄수={Math.ceil(등들.length / 한줄에(등들.length))}
                  mine={c.uid === me?.uid}
                  onClick={() => 열기(c)}
                />
              ))}
            </div>
          </div>
          {(물들.length > 0 || 향로) && (
            <div className="hip-hall-altar">
              {물들.map((c, i) => <CandleMark key={c.id} c={c} i={i} 열={99} mine={c.uid === me?.uid} onClick={() => 열기(c)}/>)}
              {/* 향로는 한 채뿐 — 올린 수만큼 향이 꽂힌다(아홉까지) */}
              {향로 && (
                <span
                  className="hip-hang"
                  data-mine={향들.some((x) => x.uid === me?.uid) ? "1" : undefined}
                >
                  <button
                    type="button"
                    className="hip-gong hip-censer"
                    onClick={() => 열기(향로)}
                    aria-label={`향 공양 ${향들.length}`}
                  >
                    <span className="hip-gong-body">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="hip-gong-img" src="/obj/gong-hyang.png" alt="" draggable={false} />
                      {향들.length > 1 && <b>{Math.min(향들.length, 999)}</b>}
                    </span>
                  </button>
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="hip-hall-say">아직 걸린 공양이 없습니다.</p>
      )}

      {/* 자리가 다 찼을 때 — 못 선 것이 몇인지만. 사연에서는 다 읽힌다 */}
      {못선것 > 0 && <p className="hip-hall-full">자리가 찼습니다 · {못선것} 더</p>}

      {/* ── 두 손은 **통 안에** ────────────────────────────
          형: 「이거 저 밑까지 늘리고 버튼을 그 안에 위에 올려」
          통 밖에 한 줄로 세웠더니 통이 그만큼 짧아지고, 그 아래로
          빈 띠가 하나 더 생겼다. 통은 띠 바로 위까지 내려오고,
          단추는 그 안에 떠 있는다 — 왼쪽은 읽으러, 오른쪽은 올리러 */}
      {/* 형: 「그 버튼 명은 공양이랑 사연으로 해서 오른쪽 아래 위아래로」
          가로로 나란히 두니 통 바닥 한 줄을 통째로 먹었다. 오른쪽
          아래 귀퉁이에 위아래로 세우면 한 손가락 자리만 쓴다 */}
      {/* 형: 「버튼이 너무 커. 작게 하고 로고로 대체해, 한글 말고」
          두 자짜리 알약 둘이 불단 오른쪽을 다 먹었다. 손가락 자리
          (46px) 하나만 남기고 글자는 그림에 맡긴다 */}
      <div className="hip-hall-acts">
        <button
          className="hip-hall-read"
          onClick={() => { 층쌓기(); 사연판잡기(true); }}
          aria-label="사연 보러가기"
        >
          <svg viewBox="0 0 24 24" aria-hidden width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.5 12.2c0 3.8-3.8 6.9-8.5 6.9-1 0-2-.15-2.9-.4L4 20.5l1.5-3.3A6.6 6.6 0 0 1 3.5 12.2c0-3.8 3.8-6.9 8.5-6.9s8.5 3.1 8.5 6.9Z" />
          </svg>
        </button>
      </div>

      {/* ── 공양은 **아래에서 위로 쓸면** 나온다 ─────────────
          형: 「공양은 지워. 공양은 아래에서 위로 쓸면 나오게 해,
               레퍼런스 준 거처럼」

          단추를 지우면 길도 같이 지워진다 — 손짓만 남기면 아무도
          못 찾는다(형이 여러 번 겪은 일이다: 「보이지 않는 손짓을
          지우면 보이는 자리가 살아난다」).
          그래서 **손잡이는 남긴다.** 밑변에 짧은 금 하나.
          위로 쓸어도 열리고, 톡 눌러도 열린다 — 손짓은 빠른 길이지
          유일한 길이 아니다. */}
      <button
        type="button"
        className="hip-hall-pull"
        aria-label="공양 올리기"
        onClick={start}
        onPointerDown={(e) => { 쓸기.current = e.clientY; }}
        onPointerMove={(e) => {
          if (쓸기.current === null) return;
          if (쓸기.current - e.clientY > 40) { 쓸기.current = null; void start(); }
        }}
        onPointerUp={() => { 쓸기.current = null; }}
        onPointerCancel={() => { 쓸기.current = null; }}
      >
        <i aria-hidden />
      </button>
    </div>
    {사연판 && (
      <사연목록
        들={다걸린것}
        me={me}
        onClose={닫기}
        onPick={(c) => { 사연판잡기(false); setOpen(c); }}  /* 층은 그대로 한 겹 — 목록이 닫히고 자리가 선다 */
      />
    )}
    {고르기 && (
      <공양고르기
        onClose={닫기}
        onPick={(k) => { 고른것잡기(k); 고르기잡기(false); setForm(true); }}
      />
    )}
    {form && <CandleForm 갈래={고른것} onClose={닫기} onDone={() => { setForm(false); load(); 닫기(); }}/>} {open && <Story c={open} me={me} onClose={닫기} onChanged={load}/>}</div>;
}
