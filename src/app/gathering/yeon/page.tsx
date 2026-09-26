"use client";

// ─────────────────────────────────────────────────────────────
// 오늘의 인연 — 하루에 한 사람.
//
// 형: 「뽑기 → 오늘의 인연 한 장 → 합장 → 쪽지함 열기 → 차단·신고」
//     「인연에서 매칭되면 서로 쪽지합 열리게 하고」
//
// 왜 한 장인가 —
//   무한히 넘기는 판은 사람을 **고르는 물건**으로 만든다. 여기는 절에
//   같이 갈 사람을 찾는 자리다. 한 장이면 그 한 사람을 읽게 된다.
//   그리고 그 한 장이 값의 근거다 — 더 보려면 연꽃.
//
// 설명을 쓰지 않는다(형: 「직관직관직관」). 사진 한 장, 이름 한 줄,
// 단추 둘. 모르는 것은 눌러 보면 안다.
// ─────────────────────────────────────────────────────────────

import { Yeonkkot } from "@/components/icons";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import InyeonThread from "@/components/InyeonThread";
import { useConfirm } from "@/components/Confirm";
import { watchAuth } from "@/lib/sync";
import { 나이, 내프로필, type 인연프로필 } from "@/lib/yeon";
import {
  오늘뽑기,
  외상챙기기,
  한사람더,
  합장,
  막기,
  신고,
  신고까닭,
  type 오늘사람,
} from "@/lib/yeonToday";

/**
 * 가안 — 아직 아무도 없을 때 세우는 한 장.
 *
 * 형: 「오늘의 인연 눌리면 카드 뜨도록 하는 거야. 일단 가안으로 적용해 봐.
 *      카드 1개만 띄우게, 눌리면 돌려서 넘어가게, 랜덤 사진 아무거나 해서」
 *
 * 판이 비어 있으면 아무것도 안 뜨니 **손맛을 볼 수가 없다.** 사람이 찰
 * 때까지는 이 한 장으로 엎고 뒤집고 넘겨 본다. 진짜 사람이 한 명이라도
 * 있으면 이 장은 저절로 안 나온다.
 * 사진은 우리 그림이다 — 남의 얼굴을 흉내 내지 않는다.
 */
const 가안들: 오늘사람[] = [
  {
    uid: "demo-1", name: "보련화", sex: "f", born: new Date().getFullYear() - 34,
    area: "서울", temple: "봉은사", wantTemple: "해인사", job: "디자이너",
    tall: 164, mbti: "INFP",
    vibe: ["상냥", "차분"], like: ["카페", "전시", "차(茶)"],
    care: ["명상", "자기계발"], date: ["절 나들이", "산책"],
    line: "새벽 예불 좋아합니다. 조용히 같이 앉을 사람이면 좋겠어요.",
    rank: "보살", photos: ["/obj/keycap-dongja.png"],
  },
  {
    uid: "demo-2", name: "무애", sex: "m", born: new Date().getFullYear() - 38,
    area: "경기", temple: "용주사", wantTemple: "통도사", job: "개발자",
    tall: 178, mbti: "ENTP",
    vibe: ["유머", "털털"], like: ["등산", "맛집", "드라이브"],
    care: ["건강", "여행"], date: ["등산", "맛집"],
    line: "주말마다 산에 갑니다. 절이 있으면 더 좋고요.",
    rank: "居士", photos: ["/obj/buddha.png"],
  },
  {
    uid: "demo-3", name: "청연", sex: "f", born: new Date().getFullYear() - 29,
    area: "부산", temple: "범어사", wantTemple: "송광사", job: "간호사",
    tall: 160, mbti: "ISFJ",
    vibe: ["다정", "성실"], like: ["요가", "바다", "독서"],
    care: ["결혼", "가족"], date: ["바다", "차 한잔"],
    line: "바다 보이는 절이 좋아요.",
    rank: "선남", photos: ["/obj/bowl.png"],
  },
];

export default function 오늘의인연() {
  const confirm = useConfirm();
  const [있나, 있나잡기] = useState<boolean | null>(null);
  const [사람들, 사람들잡기] = useState<오늘사람[] | null>(null);
  // 오늘 볼 수 있는 수 / 연꽃을 써도 여기까지
  const [칸, 칸잡기] = useState({ cap: 1, max: 1 });
  const [끝난이, 끝난이잡기] = useState<string[]>([]);
  const [탈, 탈잡기] = useState<string>("");
  const [바쁨, 바쁨잡기] = useState(false);
  const [닿음, 닿음잡기] = useState<string | null>(null); // 쪽지방 id
  // 실 빛깔을 가르려면 **양쪽**을 알아야 한다 — 내 것은 내가 읽어 둔다
  const [나, 나잡기] = useState<인연프로필 | null>(null);
  // 닿은 그 사람 — 치우고 나면 목록에서 사라지니 따로 붙잡아 둔다
  const [닿은이, 닿은이잡기] = useState<오늘사람 | null>(null);
  const [장, 장잡기] = useState(0); // 사진 몇 번째
  const [메뉴, 메뉴잡기] = useState(false);
  // 엎어 둔 카드 — 형: 「카드 형식으로 돌아가서 공개되면 도파민 터지고」
  // 뒤집은 것은 브라우저에 적어 둔다. 같은 날 다시 들어와도 또 엎지 않는다.
  //
  // **처음 값은 「모름」(null)이다.** true 로 두었더니 첫 칠에서 카드가
  // 한 판 열린 채 보이고 나서 엎혔다 — 뒤집기 전에 얼굴이 새어 나갔다.
  // 엎었나 폈나는 브라우저에 적힌 것을 읽어야 아는데 그건 칠한 뒤(useEffect)
  // 라, 그 사이는 아무것도 안 그린다.
  const [뒤집힘, 뒤집힘잡기] = useState<boolean | null>(null);
  const [도는중, 도는중잡기] = useState(false);
  const [신고창, 신고창잡기] = useState(false);
  const 통 = useRef<HTMLDivElement | null>(null);

  const 읽기 = useCallback(async () => {
    탈잡기("");
    // **반드시 잡는다.** 표(getIdToken)나 그물이 거절하면 여기서 던져지고,
    // 그러면 `사람들` 이 null 인 채로 남아 화면이 「…」에 영영 갇힌다.
    // 손님은 가안이 서니 멀쩡해 보이고 **로그인한 사람만** 갇힌다 —
    // 제일 못 찾는 갈래다.
    let r: Awaited<ReturnType<typeof 오늘뽑기>>;
    try {
      r = await 오늘뽑기();
    } catch {
      사람들잡기([]);
      탈잡기("server-not-ready");
      return;
    }
    if ("탈" in r) {
      사람들잡기([]);
      탈잡기(r.탈);
      return;
    }
    // 막은 사람은 서버 목록에 안 남는다 — 여기서 뺀다
    사람들잡기(r.picks.filter((p) => !막은이.current.includes(p.uid)));
    끝난이잡기([...r.done, ...막은이.current]);
    칸잡기({ cap: r.cap, max: r.max });
  }, []);

  useEffect(
    () =>
      watchAuth((u) => {
        있나잡기(!!u);
        if (u) {
          void 읽기();
          void 내프로필().then(나잡기);
          // 내가 없는 사이에 닿은 인연의 공덕 — 여기서 챙긴다.
          // 공덕 장부가 브라우저에 있어 서버가 대신 못 쌓는다
          void 외상챙기기();
        }
      }),
    [읽기]
  );

  // 오늘 아직 안 본 사람 — 맨 앞 한 장만 세운다.
  // 진짜 사람이 하나도 없으면 가안 한 장을 대신 세운다(형: 「일단 가안으로」)
  const 진짜 = (사람들 ?? []).filter((p) => !끝난이.includes(p.uid));
  // 가안은 **손님에게만.**
  //
  // 예전엔 「사람이 없으면」도 가안을 세웠다. 그런데 사진 문턱이 막혀
  // 후보가 늘 0이었으므로, 프로필을 다 채운 진짜 사람도 보련화·무애·청연을
  // 봤다. 거기서 합장하면 서버에 가지 않고 곧장 「인연이 닿았습니다」가
  // 뜨는데 쪽지함에는 방이 없다 — **가짜 매칭**이다.
  // 들어와 있는 사람에게는 없으면 없다고 한다(「오늘은 여기까지」).
  const 가안인가 = 있나 === false;
  const 남은 = 가안인가 ? 가안들.filter((p) => !끝난이.includes(p.uid)) : 진짜;
  const 이 = 남은[0];

  useEffect(() => {
    장잡기(0);
    메뉴잡기(false);
    신고창잡기(false);
    도는중잡기(false);
    if (!이) return;
    let 봤나 = false;
    try {
      봤나 = localStorage.getItem(열쇠(이.uid)) === "1";
    } catch {
      // 사생활 창에서는 저장이 막힌다. 그러면 늘 엎어서 보여 준다
    }
    뒤집힘잡기(봤나);
  }, [이?.uid]);   // eslint-disable-line react-hooks/exhaustive-deps

  const 뒤집기 = () => {
    if (!이 || 도는중) return;
    도는중잡기(true);
    try {
      localStorage.setItem(열쇠(이.uid), "1");
    } catch {}
    // 등을 보이는 **그 순간** 갈아 끼운다.
    // 330ms 로 두었더니 뒷면은 220ms 께 이미 사라지고(backface-visibility)
    // 카드는 아직 안 와서, 그 사이 **빈 판**이 한참 보였다.
    window.setTimeout(() => 뒤집힘잡기(true), 175);
  };

  const 치우기 = (uid: string) => 끝난이잡기((v) => (v.includes(uid) ? v : [...v, uid]));
  /** 막기·신고로 치운다 — 다시 읽어도 안 돌아오게 따로 적어 둔다 */
  const 영영치우기 = (uid: string) => {
    if (!막은이.current.includes(uid)) 막은이.current.push(uid);
    치우기(uid);
  };

  /** 연꽃 한 송이로 한 사람 더 */
  const 더보기 = async () => {
    if (바쁨) return;
    바쁨잡기(true);
    탈잡기("");
    try {
      const r = await 한사람더().catch(() => ({ 탈: "server-not-ready" as const }));
      if ("탈" in r) {
        탈잡기(r.탈);
        return;
      }
      칸잡기({ cap: r.cap, max: r.max });
      await 읽기(); // 서버가 새 사람을 채워서 돌려준다
    } finally {
      바쁨잡기(false);
    }
  };

  const 누름 = async (act: "hap" | "pass") => {
    if (!이 || 바쁨) return;
    // 가안은 서버에 없는 사람이다. 물으면 not-today 가 돌아온다
    if (가안인가) {
      닿은이잡기(이);
      치우기(이.uid);
      if (act === "hap") 닿음잡기("demo");
      return;
    }
    바쁨잡기(true);
    try {
      const r = await 합장(이.uid, act);
      if ("탈" in r) {
        탈잡기(r.탈);
        return;
      }
      닿은이잡기(이);
      치우기(이.uid);
      if (r.matched && r.thread) 닿음잡기(r.thread);
    } finally {
      바쁨잡기(false);
    }
  };

  /** 막았거나 신고한 사람 — 이 판이 살아 있는 동안은 다시 안 세운다.
      서버 목록(done)은 합장·넘김만 적는다. 막기·신고는 그 칸에 안 적히니
      다시 읽으면 그 카드가 되살아나고, 서버는 「막힌 사이」라며 합장도
      다음에도 거절한다 — 그날 인연이 통째로 멈춘다. */
  const 막은이 = useRef<string[]>([]);

  const 막기누름 = async () => {
    if (!이) return;
    메뉴잡기(false);
    const ok = await confirm(
      `${이.name || "이 사람"}을 막겠습니까?`,
      "다시는 서로에게 보이지 않습니다.",
      { confirm: "막기", cancel: "두기" }
    );
    if (!ok) return;
    if (가안인가) return 영영치우기(이.uid);
    try {
      await 막기(이.uid);
      영영치우기(이.uid);
    } catch {
      탈잡기("막지 못했습니다");
    }
  };

  const 신고누름 = async (까닭: string) => {
    if (!이) return;
    신고창잡기(false);
    메뉴잡기(false);
    if (가안인가) return 영영치우기(이.uid);
    try {
      await 신고({ uid: 이.uid, name: 이.name }, 까닭);
      await 막기(이.uid);
      영영치우기(이.uid);
    } catch {
      탈잡기("보내지 못했습니다");
    }
  };

  // 들어오기 전에도 **가안 한 장**은 보여 준다 — 무엇을 하는 곳인지는
  // 설명이 아니라 한 번 눌러 보는 것으로 안다

  // ── 인연이 닿았다 ────────────────────────────────────────
  if (닿음)
    return (
      <껍데기>
        <div className="hip-yeon-met">
          {/* ── 청실홍실 ──
              형: 「지금 청실홍실 기능 있는 거지?」 — 있었다. 다만 모임
              게시판에만 걸려 있었다. **두 사람이 맺어지는 자리**가 여긴데
              정작 여기엔 없었다.
              청실은 음, 홍실은 양. 두 실이 양쪽에서 나와 가운데 매듭
              하나로 묶인다. 合 한 글자보다 이쪽이 그 순간이다. */}
          {닿은이 && (
            <InyeonThread
              leftName={나?.name || "나"}
              rightName={닿은이.name || "도반"}
              leftGender={나?.sex}
              rightGender={닿은이.sex || undefined}
              낮
            />
          )}
          <p>인연이 닿았습니다</p>
          <Link href="/letters" className="hip-yeon-hap">
            쪽지함 열기
          </Link>
          <button className="hip-do" onClick={() => 닿음잡기(null)}>
            나중에
          </button>
        </div>
      </껍데기>
    );

  // ── 프로필이 아직 ── (들어와 있는데 프로필이 없을 때만)
  if (있나 && (탈 === "no-profile" || 탈 === "not-open" || 탈 === "need-verify"))
    return (
      <껍데기>
        <div className="hip-yeon-met">
          <b aria-hidden>緣</b>
          <p>
            {탈 === "no-profile"
              ? "내 프로필부터 만들어 주세요"
              : 탈 === "need-verify"
                ? "휴대폰 본인확인을 마치면 열립니다"
                : "사진이 통과되면 열립니다"}
          </p>
          <Link href="/gathering/me" className="hip-yeon-hap">
            내 프로필
          </Link>
        </div>
      </껍데기>
    );

  // ── 기다리는 동안에도 **엎어 둔 카드는 세운다** ──────────
  // 형: 「오늘의 인연 눌렸을 때 왜 이렇게 느리게 뜨냐」
  //
  // 서버가 오늘의 사람을 골라 오기까지(첫 판은 프로필 통을 훑는다)
  // 화면은 「…」 한 글자였다. 그런데 **처음 보는 것은 어차피 엎어 둔
  // 카드**다 — 고른 사람은 뒤집어야 보인다. 그러니 기다릴 이유가 없다.
  // 카드를 먼저 세우고 그 뒤에서 채운다. 다 오기 전에 누르면
  // 그때만 잠깐 숨을 고른다.
  if (있나 === null)
    return (
      <껍데기>
        <p className="hip-yeon-say">…</p>
      </껍데기>
    );
  if (있나 === true && 사람들 === null)
    return (
      <껍데기>
        <button className="hip-yeon-flip" data-wait="1" disabled aria-label="오늘의 인연 여는 중">
          <span>
            <b>緣</b>
          </span>
        </button>
      </껍데기>
    );

  // ── 오늘은 여기까지 ──────────────────────────────────────
  //
  // 형: 「화면 구성을 직사각형으로 6개 깔고, 그 밑에 4개 카드 추가로
  //      열기로 가고, 카드 좀 이쁘게 다시 디자인해서 올려」
  //
  // 여태 이 자리는 **空 한 글자**였다. 비었다는 말은 맞지만, 여기가
  // 무엇을 하는 곳인지는 한 마디도 안 했다 — 하루에 몇을 볼 수 있는지,
  // 지금 몇을 봤는지, 무엇을 더 열 수 있는지가 전부 글 밖에 있었다.
  //
  // 여섯 자리를 그대로 깐다. 본 자리는 채워지고, 다음 자리는 옅게
  // 빛나고, 연꽃을 써야 열리는 자리에는 蓮 이 앉는다. 그 밑에 단추
  // 하나 — **연꽃으로 남은 몇을 연다.** 空 도 「오늘은 여기까지」도
  // 지운다. 판이 이미 그 말을 하고 있다.
  if (!이) {
    const 본만큼 = 끝난이.length;
    const 더열수 = 칸.max - 칸.cap; // 연꽃으로 열 수 있는 자리
    return (
      <껍데기>
        <ul className="hip-yeon-deck" aria-hidden>
          {Array.from({ length: 칸.max }, (_, i) => {
            const 봤나 = i < 본만큼;
            const 값 = i >= 칸.cap;
            return (
              <li
                key={i}
                data-done={봤나 ? "1" : undefined}
                data-pay={!봤나 && 값 ? "1" : undefined}
                data-next={!봤나 && i === 본만큼 ? "1" : undefined}
              >
                <em>{i + 1}</em>
                <span>{봤나 ? "緣" : 값 ? "蓮" : "·"}</span>
              </li>
            );
          })}
        </ul>

        {/* 남은 자리를 여는 한 손 — 하루 천장에 닿으면 아예 안 그린다.
            살 수 없는 것을 내밀어 봐야 서로 피곤하다 */}
        {있나 && 칸.cap < 칸.max && (
          <button className="hip-deck-go" disabled={바쁨} onClick={더보기}>
            <Yeonkkot className="h-[17px] w-[17px]" />
            카드 {더열수}개 더 열기
          </button>
        )}
        {탈 && <p className="hip-yeon-bad">{말로(탈)}</p>}
      </껍데기>
    );
  }

  const 사진 = 이.photos ?? [];
  // 오늘 몇 째인가 — 본 사람 수로 센다
  const 본만큼 = 끝난이.length;
  const 살 = 이.born ? 나이(이.born) : 0;

  // 엎었나 폈나는 브라우저 장부에 있다(칠한 뒤에 읽는다). 그 한 틱도
  // 「…」로 비우지 않는다 — 엎어 둔 카드가 맞는 그림이다
  if (뒤집힘 === null)
    return (
      <껍데기>
        <button className="hip-yeon-flip" disabled aria-label="오늘의 인연">
          <span>
            <b>緣</b>
          </span>
        </button>
      </껍데기>
    );

  if (!뒤집힘)
    return (
      <껍데기>
        <button
          className="hip-yeon-flip"
          data-go={도는중 ? "1" : undefined}
          onClick={뒤집기}
          aria-label="오늘의 인연 열기"
        >
          <span>
            <b>緣</b>
          </span>
        </button>
      </껍데기>
    );

  const 몫말 = `오늘 ${본만큼 + 1} / ${칸.max}${칸.cap < 칸.max ? " · 무료 " + 칸.cap : ""}`;

  return (
    <껍데기 몫={몫말}>
      {/* 붙박이 한 장 — 운영자. 형: 「새 인연찾기에서 관리자인 내 카드를
          키워줘」. 판이 빌 동안 문을 연 사람이 맨 앞에 선다.
          이름표를 따로 달지 않는다(형: 「멘트 넣지 말라고 했다」) —
          큰 카드와 금테 한 줄이면 「이 사람이 다르다」가 이미 읽힌다. */}
      <div className="hip-yeon-card" data-big={이.pinned ? "1" : undefined} ref={통}>
        {/* ── 사진 — 톡 누르면 다음 장. 여러 장이면 위에 눈금 ── */}
        <div
          className="hip-yeon-face"
          onClick={() => 사진.length > 1 && 장잡기((v) => (v + 1) % 사진.length)}
          role={사진.length > 1 ? "button" : undefined}
          aria-label={사진.length > 1 ? "다음 사진" : undefined}
        >
          {사진.length > 1 && (
            <span className="hip-yeon-ticks" aria-hidden>
              {사진.map((s, i) => (
                <i key={s} data-on={i === 장 ? "1" : undefined} />
              ))}
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {사진[장] ? <img src={사진[장]} alt="" draggable={false} /> : <em />}

          {/* 이름은 사진 위에 얹는다 — 카드가 한 덩이로 읽힌다 */}
          <span className="hip-yeon-who">
            <b>{이.name || "이름 없는 이"}</b>
            {살 > 0 && <i>{살}</i>}
            {이.area && <u>{이.area}</u>}
          </span>
        </div>

        {/* ── 무엇을 하는 사람인가 ── */}
        {/* 알약은 **여섯까지.**
            형: 「심플리시티가 핵심이다」 — 열두 개를 다 깔았더니 사람이
            아니라 표가 됐고, 단추가 화면 밖으로 밀렸다.
            말 붙일 구실이 되는 순서로 여섯만 세운다 — 다니는 절, 가고
            싶은 절, 직업, MBTI, 그리고 관심·취향에서 남은 자리만큼. */}
        <div className="hip-yeon-tags">
          {(
            [
              이.temple ? { t: 이.temple, 절: true } : null,
              이.wantTemple ? { t: `${이.wantTemple} ↗`, 절: true } : null,
              // **하고 싶은 데이트 한 칸.** 받아 놓고 한 번도 안 그리고
              // 있었다 — 카드에서 이보다 말 붙이기 좋은 칸이 없다
              // (「절 나들이」 「맛집」 한 마디면 첫 쪽지가 저절로 써진다).
              // 한 칸만 — 열두 개를 다 깔면 사람이 아니라 표가 된다
              이.date[0] ? { t: 이.date[0] } : null,
              이.job ? { t: 이.job } : null,
              이.mbti ? { t: 이.mbti } : null,
              ...이.care.map((x) => ({ t: x })),
              ...이.like.map((x) => ({ t: x })),
              이.tall ? { t: `${이.tall}cm` } : null,
            ].filter(Boolean) as { t: string; 절?: boolean }[]
          )
            .slice(0, 이.pinned ? 4 : 6)
            .map((c, i) => (
              <span key={`${c.t}${i}`} data-temple={c.절 ? "1" : undefined}>
                {c.t}
              </span>
            ))}
        </div>

        {이.line && <p className="hip-yeon-line">{이.line}</p>}

        {/* ⋯ — 막기·신고. **사진 밖에 둔다.**
            사진 칸은 모서리를 둥글리느라 overflow:hidden 이라, 그 안에
            메뉴를 열면 아래가 잘려 「막기」가 안 보였다. 카드를 기준으로
            같은 자리(사진 오른쪽 위)에 띄우면 잘릴 것이 없다. */}
        <button
          className="hip-yeon-more"
          aria-label="이 사람에 대해"
          onClick={(e) => {
            e.stopPropagation();
            메뉴잡기((v) => !v);
          }}
        >
          ⋯
        </button>
        {메뉴 && (
          <div className="hip-yeon-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => 신고창잡기(true)}>신고</button>
            <button onClick={막기누름}>막기</button>
          </div>
        )}
      </div>

      {/* ── 두 손 ── */}
      <div className="hip-yeon-hands">
        <button className="hip-ghost" disabled={바쁨} onClick={() => 누름("pass")}>
          다음에
        </button>
        <button className="hip-yeon-hap" disabled={바쁨} onClick={() => 누름("hap")}>
          합장
        </button>
      </div>

      {탈 && <p className="hip-yeon-bad">{말로(탈)}</p>}

      {/* ── 신고 — 까닭 넷 ── */}
      {신고창 && (
        <div className="hip-yeon-why" role="dialog" aria-label="신고">
          <div>
            <p>무엇이 문제입니까</p>
            {신고까닭.map((x) => (
              <button key={x} onClick={() => 신고누름(x)}>
                {x}
              </button>
            ))}
            <button data-off="1" onClick={() => 신고창잡기(false)}>
              그만두기
            </button>
          </div>
        </div>
      )}
    </껍데기>
  );
}

function 껍데기({ children, 몫 }: { children: React.ReactNode; 몫?: string }) {
  return (
    <HipRoom here="/gathering/yeon" lanes={false} rail="/gathering" scroll>
      <div className="hip-yeon">
        <p className="hip-yeon-head">因緣 · 오늘의 인연</p>
        {/* 오늘 몇 사람이 서 있나 — 형: 「하루 6개 카드는 떠 있게」
            판에 몇이 남았는지가 보여야 「더 볼 수 있다」가 읽힌다.
            무료 둘, 연꽃으로 넷 — 하루 여섯이 이 방의 몫이다. */}
        {몫 && <p className="hip-yeon-quota">{몫}</p>}
        {children}
      </div>
    </HipRoom>
  );
}

/** 오늘 이 사람을 이미 뒤집었나 — 날이 바뀌면 열쇠도 바뀐다 */
function 열쇠(uid: string) {
  const 날 = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  return `hwadu.yeon.open:${날}:${uid}`;
}

/** 서버 말을 사람 말로 */
function 말로(탈: string): string {
  return (
    {
      "not-today": "오늘 뽑힌 사람이 아닙니다",
      blocked: "막힌 사이입니다",
      "bad-target": "누구인지 알 수 없습니다",
      "server-not-ready": "잠시 뒤에 다시",
      "bad-token": "다시 들어와 주세요",
      "no-token": "다시 들어와 주세요",
      "need-lotus": "연꽃이 모자랍니다",
      "max-today": "오늘은 여기까지",
      "no-one": "아직 마주칠 사람이 없습니다",
    }[탈] ?? 탈
  );
}
