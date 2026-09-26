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
import { doc, getDoc } from "firebase/firestore";
import { EXTEND_DAYS, POUR_PER_DAY, POUR_UNIT, PRIVATE_BURN_DAYS, PRIVATE_CANDLE_PRICE, PUBLIC_BURN_DAYS, PUBLIC_CANDLE_PRICE } from "@/lib/candleSpec";
import { giveMerit } from "@/lib/merit";
import { daysLeft, fetchCandles, fetchMyCandles, lightCandle, removeCandle, type Candle, burning } from "@/lib/candle";

type Comment = { id: string; by?: string; body?: string };

function CandleMark({ c, onClick, i, mine }: { c: Candle; onClick: () => void; i: number; mine?: boolean }) {
  // 원근 — 세 켜로 나눈다. 같은 켜가 나란히 서지 않게 3 으로 돌린다
  const 깊이 = [0, 0.52, 0.86][i % 3];
  // 줄 길이를 세 층으로 — 진짜 법당의 천장이 그렇다. 나란히 걸면 격자가 된다
  const 줄 = [16, 34, 24, 44, 28][i % 5];
  // 씨는 **사람마다 고정** — 같은 이가 오면 늘 같은 빛깔의 등이 걸린다
  const seed = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  // 옛 문서에는 갈래 칸이 없다 — 없으면 연등이다(여태 다 연등이었다)
  // 내 것인가 — 「내 것만」을 켜면 이 표를 보고 나머지가 희미해진다
  return <span className="hip-hang" data-mine={mine ? "1" : undefined}><Gongyang 갈래={c.gift ?? "deung"} name={c.forName || c.by || "이름 없는 이"} seed={seed} drop={줄} 깊이={깊이} dim={!burning(c)} onClick={onClick} /></span>;
}

function CandleForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  // 형: 「연등 공양, 쌀 공양, 초 공양 이렇게 달 수 있게 하자」
  const [gift, setGift] = useState<공양갈래>("deung");
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

        {/* 무엇을 올릴까 — 셋. 고른 대로 바로 위에 걸려 보인다 */}
        <div className="hip-deung-pick">
          {/* 형: 「초랑 향은 일단 빼고」 — 그림은 두고 고르는 자리에서만
              내린다. 이미 올린 것은 그대로 불단에 선다 */}
          {([["deung", "연등"], ["ssal", "쌀"]] as const).map(([k, t]) => (
            <button key={k} data-on={gift === k ? "1" : undefined} onClick={() => setGift(k)}>
              <b>{t}</b>
            </button>
          ))}
        </div>

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

  const read = useCallback(() => {
    void fetch(`/api/candle/comment?id=${encodeURIComponent(c.id)}`)
      .then((r) => r.json())
      .then((x) => setComments(Array.isArray(x.comments) ? x.comments : []));
  }, [c.id]);
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
      if (r.ok) { pingLotus(); onChanged(); return; }
      // **조용히 실패하지 않는다.** 연꽃이 모자라면 402 가 오는데 화면은
      // 아무 말도 안 했다 — 눌러도 아무 일이 없으니 고장으로 읽힌다.
      // (관리자는 값을 안 치러 늘 성공하니 형 계정으로는 안 보였다)
      나눔말잡기(r.status === 402 ? "연꽃이 모자랍니다" : "늘리지 못했습니다");
    } finally { setBusy(false); }
  };

  const 남은 = daysLeft(c);
  const 처음 = c.visibility === "public" ? PUBLIC_BURN_DAYS : PRIVATE_BURN_DAYS;

  return (
    <div className="hip-say" role="dialog" aria-label="사연" onClick={onClose}>
      <div className="hip-say-box" onClick={(e) => e.stopPropagation()}>
        <div className="hip-say-top">
          <p>{c.forName || "이름 없는 기원"}</p>
          <button onClick={onClose}>닫기</button>
        </div>

        {/* 남은 날 — 줄자로. 줄어드는 것이 보여야 아깝다 */}
        <div className="hip-say-left">
          <i style={{ width: `${Math.max(2, Math.min(100, (남은 / 처음) * 100))}%` }} />
          <b>{남은}일 남음</b>
        </div>

        <p className="hip-say-wish">{c.wish}</p>
        <p className="hip-say-by">{c.by || "이름 없는 이"}</p>

        {/* 공감 · 공덕 나누기 */}
        <div className="hip-say-acts">
          <button onClick={공감누름} disabled={!me || busy || mine} data-on={눌렀나 ? "1" : undefined}>
            공감 {공감 > 0 ? 공감 : ""}
          </button>
          {!mine && (
            <button onClick={나눔누름} disabled={!me || busy}>
              공덕 {POUR_UNIT} 나누기
            </button>
          )}
        </div>
        {/* 그릇 — 서른 바퀴가 차면 하루가 는다 */}
        {!mine && (
          <div className="hip-say-pool">
            <i style={{ width: `${Math.min(100, (모임 / POUR_PER_DAY) * 100)}%` }} />
            <b>{모임.toLocaleString("ko-KR")} / {POUR_PER_DAY.toLocaleString("ko-KR")} · 차면 하루</b>
          </div>
        )}
        {나눔말 && <p className="hip-say-note">{나눔말}</p>}

        {c.visibility === "public" && (
          <>
            <div className="hip-say-cmt">
              {comments.map((x) => (
                <p key={x.id}><span>{x.by ?? "이름 없는 이"}</span>{x.body}</p>
              ))}
            </div>
            {me && (
              <div className="hip-say-write">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 240))}
                  placeholder="한마디 남기기"
                />
                <button onClick={post} disabled={!body.trim() || busy}>남기기</button>
              </div>
            )}
          </>
        )}

        <div className="hip-say-mine">
          {mine && c.visibility === "public" && (
            <button onClick={extend} disabled={busy}>연꽃 1송이 · +{EXTEND_DAYS}일</button>
          )}
          {mine && (
            <button onClick={async () => { await removeCandle(c.id); onChanged(); onClose(); }}>내리기</button>
          )}
        </div>
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
                  <span className="hip-say-foot">
                    <em>{c.by || "이름 없는 이"}</em>
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
  const load = useCallback(() => { void fetchCandles().then(setPublicCandles).catch(() => setPublicCandles([])); void fetchMyCandles().then(setMine).catch(() => setMine([])); }, []);
  useEffect(() => watchAuth((u) => { setMe(u); load(); }), [load]);
  const start = async () => { if (!me) { await loginWithGoogle(); return; } setForm(true); };
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

  // 등은 천장, 쌀·초는 불단
  const 등들 = 다걸린것.filter((c) => (c.gift ?? "deung") === "deung");
  const 물들 = 다걸린것.filter((c) => (c.gift ?? "deung") !== "deung");

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
            <div className="hip-deung-sky">
              {등들.map((c, i) => <CandleMark key={c.id} c={c} i={i} mine={c.uid === me?.uid} onClick={() => setOpen(c)}/>)}
            </div>
          </div>
          {물들.length > 0 && (
            <div className="hip-hall-altar">
              {물들.map((c, i) => <CandleMark key={c.id} c={c} i={i} mine={c.uid === me?.uid} onClick={() => setOpen(c)}/>)}
            </div>
          )}
        </>
      ) : (
        <p className="hip-hall-say">아직 걸린 공양이 없습니다.</p>
      )}

      {/* ── 두 손은 **통 안에** ────────────────────────────
          형: 「이거 저 밑까지 늘리고 버튼을 그 안에 위에 올려」
          통 밖에 한 줄로 세웠더니 통이 그만큼 짧아지고, 그 아래로
          빈 띠가 하나 더 생겼다. 통은 띠 바로 위까지 내려오고,
          단추는 그 안에 떠 있는다 — 왼쪽은 읽으러, 오른쪽은 올리러 */}
      <div className="hip-hall-acts">
        <button className="hip-hall-read" onClick={() => 사연판잡기(true)}>
          사연 보러가기
        </button>
        <button className="hip-hall-go" onClick={start} aria-label="공양 올리기">공양</button>
      </div>
    </div>
    {사연판 && (
      <사연목록
        들={다걸린것}
        me={me}
        onClose={() => 사연판잡기(false)}
        onPick={(c) => { 사연판잡기(false); setOpen(c); }}
      />
    )}
    {form && <CandleForm onClose={() => setForm(false)} onDone={() => { setForm(false); load(); }}/>} {open && <Story c={open} me={me} onClose={() => setOpen(null)} onChanged={load}/>}</div>;
}
