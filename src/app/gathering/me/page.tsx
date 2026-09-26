"use client";

// ─────────────────────────────────────────────────────────────
// 인연 — 내 프로필.
//
// 형: 「가입할 때 사진이랑 프로필 넣어야 가입되는 걸로」
//     「수행 지우고 MBTI 랑 / 직업이랑 만나이 거주 / 키 cm 흡연 음주」
//     「성격 : 긍정 상냥 부드러운 등등 많이 / 취향도 골프 와인 드라이브
//      여행 맛집 카페 / 인연을 맺게 되면 어떤 데이트를 하고 싶나요 /
//      평소 가고 싶었던 절이 있나요 / 요즘 어떤 것에 관심이 있으세요」
//     「대부분 버튼 식으로 클릭하면 올라가게 하되 주관식도 가능하게」
//     「심플리시티가 핵심이다. 구구절절 텍스트 많이 넣거나 그러지 마라」
//
// 그래서 이름표는 두세 글자, 설명은 한 줄도 없다. 고르는 것은 전부
// 알약이고, 없는 것은 줄 끝 ＋ 로 직접 적으면 같은 칸에 들어간다.
// 못 채운 것만 맨 위에 알약으로 뜨고, 다 채우면 그 줄이 사라진다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { watchAuth } from "@/lib/sync";
import { loadMe, setName } from "@/lib/me";
import {
  YEON,
  type 인연프로필,
  성격들,
  취향들,
  관심들,
  데이트들,
  MBTI들,
  흡연들,
  음주들,
  지역들,
  나이,
  들어올수있나,
  모자란것,
  본인확인_켬,
  사진빼기,
  사진올리기,
  프로필저장,
  내프로필,
} from "@/lib/yeon";

/** 사진은 다섯 장까지 — 형: 「한 5개 정도만 서버에 저장되도록 일단」
    더 받아도 고르는 일이 일이 되고, 저장소 값도 사람 수만큼 곱해진다 */
const 사진칸 = 5;

export default function 인연내프로필() {
  const [me, setMe] = useState<인연프로필 | null>(null);
  const [있나, 있나잡기] = useState<boolean | null>(null);
  const [올리는중, 올리는중잡기] = useState(false);
  const [탈, 탈잡기] = useState("");
  const 파일 = useRef<HTMLInputElement | null>(null);
  const [법명, 법명잡기] = useState("");
  const [이름말, 이름말잡기] = useState(false);
  const [이름탈, 이름탈잡기] = useState("");
  const [저장중, 저장중잡기] = useState(false);
  const [저장됨, 저장됨잡기] = useState(false);
  /** 법명은 스스로 **한 번만** 고친다 — 그 뒤로는 뒷방을 거친다 */
  const 이름잠김 = !!me?.nameChanged;
  useEffect(() => 법명잡기(loadMe()?.name ?? ""), []);

  /** 법명이 인연 프로필에 없으면 한 번 적어 준다.
      법명은 브라우저 장부(me.ts)에 있고 인연 카드는 프로필의 name 을
      읽는다. 둘을 이어 주는 코드가 없어서, 법명을 고친 적 없는 사람은
      남에게 **「이름 없는 이」**로 떴다. */
  const 법명맞추기 = useCallback(async (p: 인연프로필 | null) => {
    const 내이름 = loadMe()?.name?.trim();
    if (!p || !내이름 || p.name === 내이름) return;
    try {
      await 프로필저장({ name: 내이름 });
    } catch {
      /* 못 적어도 판은 돈다 */
    }
  }, []);

  const 다시읽기 = useCallback(async () => {
    // **반드시 잡는다.** 규칙이 막거나 그물이 끊기면 여기서 던져지는데,
    // 부르는 쪽이 `void 다시읽기()` 라 아무도 안 받는다 — 삼켜지지 않은
    // 넘어짐이 되어 판 밖으로 나간다.
    try {
      const p = await 내프로필();
      setMe(p);
      if (p?.name) 법명잡기(p.name);
      else void 법명맞추기(p);
    } catch (e) {
      탈잡기(e instanceof Error ? e.message : "프로필을 읽지 못했습니다");
    }
  }, []);

  useEffect(() => {
    return watchAuth((u) => {
      있나잡기(!!u);
      if (u) void 다시읽기();
    });
  }, [다시읽기]);

  const 고치기 = async (part: Partial<인연프로필>) => {
    탈잡기("");
    const 다음 = { ...(me ?? ({} as 인연프로필)), ...part };
    setMe(다음);
    try {
      // ── 다 채우면 **저절로 선다** ────────────────────────
      // 형: 「인연 받기를 눌러야 활동이 된다 — 어쩌라고?」
      //
      // 맞는 말이다. 다 채운 사람에게 단추 하나를 더 누르게 할 까닭이
      // 없다. 안 누르면 아무에게도 안 보이는데, 안 보인다는 것도 안
      // 알려 준다 — 문턱이 아니라 **함정**이었다.
      // 채워지는 그 순간 판에 선다. 쉬고 싶으면 아래에서 내리면 된다.
      const 설수있나 = 모자란것(다음).length === 0;
      const 처음서나 = 설수있나 && 다음.state !== "활동" && 다음.state !== "쉼";
      await 프로필저장(처음서나 ? { ...part, state: "활동" } : part);
      if (처음서나) {
        setMe({ ...다음, state: "활동" });
        // 방금 섰다는 것은 말해 준다 — 조용히 서면 선 줄을 모른다
        탈잡기("");
      }
    } catch (e) {
      탈잡기(e instanceof Error ? e.message : "저장하지 못했습니다");
    }
  };

  /** 법명 고치기 — 브라우저 장부와 인연 프로필 둘 다 */
  const 이름고치기 = async (raw: string) => {
    const 새 = raw.trim();
    이름탈잡기("");
    if (!새 || 새 === 법명) return;
    const bad = setName(새);
    if (bad) {
      이름탈잡기(bad);
      return;
    }
    법명잡기(새);
    await 고치기({ name: 새, nameChanged: true });
  };

  /** 저장 — 다 찼으면 판에도 세운다 */
  const 저장하기 = async () => {
    if (저장중) return;
    저장중잡기(true);
    저장됨잡기(false);
    try {
      const 설수있나 = 모자란것(me).length === 0;
      await 고치기(설수있나 && me?.state !== "쉼" ? { state: "활동" } : {});
      저장됨잡기(true);
      window.setTimeout(() => 저장됨잡기(false), 2200);
    } finally {
      저장중잡기(false);
    }
  };

  const [크게, 크게잡기] = useState(false);
  /** 지금 앞에 선 장 */
  const [장, 장잡기] = useState(0);
  /** 옆으로 미는 손가락이 내려앉은 자리 */
  const 민다 = useRef<number | null>(null);
  const 장수 = me?.photos?.length ?? 0;

  const 사진고르기 = async (fs: FileList | null) => {
    if (!fs?.length) return;
    탈잡기("");
    올리는중잡기(true);
    try {
      const 이미 = me?.photos ?? [];
      const 받을 = Array.from(fs).slice(0, Math.max(0, 사진칸 - 이미.length));
      const 새것 = [];
      for (const f of 받을) {
        새것.push(await 사진올리기(f));
        // **한 장 굽고 한 번 쉰다.**
        // 잇달아 구우면 앞엣것이 아직 안 치워졌는데 다음 것을 편다 —
        // 폰에서 판 그리는 일꾼이 거기서 죽는다(형이 본 그 창).
        // 한 박자 비워 주면 브라우저가 그 사이에 치운다.
        await new Promise((r) => setTimeout(r, 120));
      }
      await 고치기({ photos: [...이미, ...새것] });
    } catch (e) {
      탈잡기(e instanceof Error ? e.message : "사진을 올리지 못했습니다");
    } finally {
      올리는중잡기(false);
      if (파일.current) 파일.current.value = "";
    }
  };

  if (있나 === false)
    return (
      <HipRoom here="/gathering/me" lanes={false} rail="/gathering">
        <div className="hip-yeon">
          <p className="hip-yeon-head">因緣 · 내 프로필</p>
          <p className="hip-yeon-say">들어온 뒤에 열립니다</p>
        </div>
      </HipRoom>
    );

  const 빠진 = 모자란것(me);
  const 올해 = new Date().getFullYear();

  return (
    <HipRoom here="/gathering/me" lanes={false} rail="/gathering">
      <div className="hip-yeon">
        <p className="hip-yeon-head">因緣 · 내 프로필</p>

        {빠진.length > 0 && (
          <div className="hip-yeon-need">
            {빠진.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        )}

        {/* ── 사진 ── **가운데 한 장.**
            형: 「사진은 가운데 하나만 두고 ＋랑 돋보기 넣어서
                 사진 추가랑 최종본 보기」

            석 장을 나란히 깔았더니 판의 첫 화면이 빈 네모 셋이었다 —
            아직 아무것도 안 올린 사람에게 「셋을 채워야 한다」는 숙제를
            먼저 보여 준 셈이다. 얼굴은 하나면 된다. 나머지는 돋보기
            안에 있다. */}
        <div className="hip-mepic">
          {/* ── 사진은 **겹쳐 쌓인다** ─────────────────────────
              형: 「＋는 사진 늘어나면 겹치면서 옆으로 스르르 넘어가는
                   기능 넣고」 「살짝씩 뒤로 겹치고, 옆으로 넘기면 그
                   사진으로 넘어가도록」

              장수를 뱃지로 적던 것은 걷었다 — 「2」라는 글자는 두 장이
              있다는 **말**이지 두 장이 **보이는** 것이 아니다.
              뒤에 한 뼘씩 물려 세우면 몇 장인지가 눈에 그냥 보이고,
              옆으로 밀면 그 장이 앞으로 온다. */}
          <div
            className="hip-mepic-stage"
            onPointerDown={(e) => { 민다.current = e.clientX; }}
            onPointerMove={(e) => {
              if (민다.current === null) return;
              const dx = e.clientX - 민다.current;
              if (Math.abs(dx) < 44) return;
              민다.current = null;
              if (장수 < 2) return;
              장잡기((v) => (dx < 0 ? (v + 1) % 장수 : (v - 1 + 장수) % 장수));
            }}
            onPointerUp={() => { 민다.current = null; }}
            onPointerCancel={() => { 민다.current = null; }}
          >
            {장수 === 0 && <span data-empty="1" style={{ "--d": 0 } as React.CSSProperties}><i aria-hidden>얼굴</i></span>}
            {(me?.photos ?? []).map((f, i) => {
              // 앞에서부터 셋만 그린다 — 넷째부터는 어차피 안 보인다
              const d = (i - 장 + 장수) % 장수;
              if (d > 2) return null;
              return (
                <span
                  key={f.path}
                  data-state={f.state}
                  data-front={d === 0 ? "1" : undefined}
                  style={{ "--d": d } as React.CSSProperties}
                  onClick={() => { if (d > 0) 장잡기(i); }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" draggable={false} />
                  {d === 0 && f.state === "no" && <u>다시</u>}
                </span>
              );
            })}

            {/* 형: 「＋랑 돋보기는 오른쪽 아래 정도에 그냥 배경 없이」 */}
            <div className="hip-mepic-acts">
              <button
                onClick={() => 파일.current?.click()}
                disabled={올리는중 || 장수 >= 사진칸}
                aria-label="사진 추가"
              >
                {올리는중 ? "…" : "＋"}
              </button>
              <button
                onClick={() => 크게잡기(true)}
                disabled={장수 === 0}
                aria-label="남이 보는 내 프로필"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M15.4 15.4 21 21" />
                </svg>
              </button>
            </div>
          </div>

          {/* 몇 째 장인가 — 글자 대신 점 */}
          {장수 > 1 && (
            <div className="hip-mepic-dots" aria-hidden>
              {(me?.photos ?? []).map((f, i) => (
                <i key={f.path} data-on={i === 장 ? "1" : undefined} onClick={() => 장잡기(i)} />
              ))}
            </div>
          )}

          <input
            ref={파일}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => 사진고르기(e.target.files)}
          />
        </div>

        {/* 돋보기 — 올린 것을 **큰 판**으로 죽 본다. 여기서 빼기도 한다 */}
        {크게 && (
          <div
            className="hip-yeon-big"
            role="dialog"
            aria-label="올린 사진"
            onClick={() => 크게잡기(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <p>
                올린 사진 {장수}장
                <button onClick={() => 크게잡기(false)} aria-label="닫기">닫기</button>
              </p>
              <div>
                {(me?.photos ?? []).map((f) => (
                  <span key={f.path} data-state={f.state}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" />
                    <button
                      onClick={() => void 사진빼기(f.path).then(() => 다시읽기())}
                      aria-label="사진 빼기"
                    >
                      ✕
                    </button>
                    {f.state === "no" && <u>다시</u>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {탈 && <p className="hip-yeon-bad">{탈}</p>}

        {/* 법명은 브라우저 장부에 있다. 그리는 첫 판에 바로 읽으면
            서버가 그린 글자와 달라져 리액트가 판을 다시 짠다. 뜬 뒤에 읽는다 */}
        {/* ── 법명 ── 형: 「저기서 아이디도 고칠 수 있게」
            「고치는 거 귀찮으니까 한 번 설정하고, 고치는 건 한 번만
             고쳐진다고 ⓘ 로 표시. 승인 받아야 고쳐진다고 써 주고」

            법명은 남이 나를 부르는 이름이다. 아무 때나 갈리면 어제 쪽지를
            주고받은 사람이 오늘 딴 사람이 된다. **한 번만** 스스로 고치고,
            그 뒤로는 뒷방을 거친다. */}
        <div className="hip-yeon-name-row">
          <input
            className="hip-yeon-name-in"
            defaultValue={법명}
            disabled={이름잠김}
            maxLength={12}
            aria-label="법명"
            placeholder="법명"
            onBlur={(e) => 이름고치기(e.target.value)}
          />
          <button
            type="button"
            className="hip-yeon-ii"
            aria-label="법명 안내"
            onClick={() => 이름말잡기((v) => !v)}
          >
            i
          </button>
        </div>
        {이름말 && (
          <p className="hip-yeon-name-say">
            {이름잠김
              ? "이미 한 번 고쳤습니다. 더 고치려면 문의로 알려 주세요 — 승인 뒤에 바뀝니다."
              : "법명은 스스로 한 번만 고칠 수 있습니다. 그 뒤에는 승인을 거칩니다."}
          </p>
        )}
        {이름탈 && <p className="hip-yeon-bad">{이름탈}</p>}

        {/* ── 한 낱말로 끝나는 것들 ── */}
        <div className="hip-yeon-row">
          <b>성별</b>
          <span className="hip-chips">
            {([["m", "남"], ["f", "여"]] as const).map(([k, t]) => (
              <button
                key={k}
                data-on={me?.sex === k ? "1" : undefined}
                onClick={() => 고치기({ sex: k })}
              >
                {t}
              </button>
            ))}
          </span>
        </div>

        <div className="hip-yeon-row">
          <b>나이</b>
          <select
            value={me?.born ?? ""}
            onChange={(e) => 고치기({ born: Number(e.target.value) })}
            aria-label="태어난 해"
          >
            {/* 빈 칸은 **말없이** 둔다 — 형: 「고르기 이딴 거 쓰지 말고
                그냥 암말 하지 말고」. 고르라는 말은 화살표가 이미 하고 있다 */}
            <option value=""></option>
            {Array.from({ length: 62 }, (_, i) => 올해 - 19 - i).map((y) => (
              <option key={y} value={y}>
                만 {나이(y, 올해)}세 · {y}년생
              </option>
            ))}
          </select>
        </div>
        {me?.born != null && !들어올수있나(me.born) && (
          <p className="hip-yeon-bad">만 19세 이상만 설 수 있습니다</p>
        )}

        <div className="hip-yeon-row">
          <b>거주</b>
          <select
            value={me?.area ?? ""}
            onChange={(e) => 고치기({ area: e.target.value })}
            aria-label="사는 곳"
          >
            {/* 빈 칸은 **말없이** 둔다 — 형: 「고르기 이딴 거 쓰지 말고
                그냥 암말 하지 말고」. 고르라는 말은 화살표가 이미 하고 있다 */}
            <option value=""></option>
            {지역들.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="hip-yeon-row">
          <b>직업</b>
          <input
            defaultValue={me?.job ?? ""}
            onBlur={(e) => 고치기({ job: e.target.value.trim().slice(0, 20) })}
            maxLength={20}
            aria-label="직업"
          />
        </div>

        <div className="hip-yeon-row">
          <b>키</b>
          <select
            value={me?.tall ?? ""}
            onChange={(e) => 고치기({ tall: Number(e.target.value) })}
            aria-label="키"
          >
            {/* 빈 칸은 **말없이** 둔다 — 형: 「고르기 이딴 거 쓰지 말고
                그냥 암말 하지 말고」. 고르라는 말은 화살표가 이미 하고 있다 */}
            <option value=""></option>
            {Array.from({ length: 61 }, (_, i) => 140 + i).map((c) => (
              <option key={c} value={c}>
                {c} cm
              </option>
            ))}
          </select>
        </div>

        {/* 형: 「한마디 말고 내 소개 이렇게 쓸 수 있도록 하고, 칸 더 넓히고,
            내 소개는 키 바로 밑에」 — 한 줄로는 사람이 안 읽힌다 */}
        <div className="hip-yeon-row hip-yeon-row-wide">
          <b>내 소개</b>
          <textarea
            className="hip-yeon-intro"
            rows={4}
            defaultValue={me?.line ?? ""}
            onBlur={(e) => 고치기({ line: e.target.value.trim().slice(0, 200) })}
            maxLength={200}
            aria-label="내 소개"
          />
        </div>


        <하나 이름="MBTI" 목록={MBTI들} 값={me?.mbti} 고치기={(v) => 고치기({ mbti: v })} />
        <하나 이름="흡연" 목록={흡연들} 값={me?.smoke} 고치기={(v) => 고치기({ smoke: v })} />
        <하나 이름="음주" 목록={음주들} 값={me?.drink} 고치기={(v) => 고치기({ drink: v })} />

        {/* ── 여럿 고르는 것들 — 없는 것은 ＋ 로 ── */}
        {/* 형: 「이거 선택은 각각 총 5개까지」 — 스물을 다 고르면 그건
            성격이 아니라 목록이다. 넷 다 다섯까지. */}
        <여럿 이름="성격" 목록={성격들} 값={me?.vibe} 최대={5} 고치기={(v) => 고치기({ vibe: v })} />
        <여럿 이름="취향" 목록={취향들} 값={me?.like} 최대={5} 고치기={(v) => 고치기({ like: v })} />
        <여럿 이름="관심" 목록={관심들} 값={me?.care} 최대={5} 고치기={(v) => 고치기({ care: v })} />
        <여럿 이름="데이트" 목록={데이트들} 값={me?.date} 최대={5} 고치기={(v) => 고치기({ date: v })} />

        {/* ── 절 ── 여기부터는 **따로 동의**를 받는다.
            개인정보보호법 23조가 종교를 민감정보로 묶고, 다른 동의와
            별도로 받으라고 한다. 「다니는 절」은 종교를 그대로 말한다.
            끄면 두 칸이 잠기고, 이미 적은 것도 남에게 안 나간다. */}
        <label className="hip-yeon-agree">
          <input
            type="checkbox"
            checked={!!me?.religionOk}
            onChange={(e) =>
              고치기(
                e.target.checked
                  ? { religionOk: true, religionAt: Date.now() }
                  // **끄면 적어 둔 것도 지운다.**
                  // 「안 보낸다」로만 두었더니 절 이름이 문서에 그대로
                  // 남았다. 동의를 물린 사람의 종교를 계속 갖고 있는 것은
                  // 안 내보내도 **보관**이다 — 법이 말하는 것은 수집·이용·
                  // 보관 전부다. 물리면 그 자리에서 비운다.
                  : { religionOk: false, temple: "", wantTemple: "" }
              )
            }
          />
          <span>절 이름을 프로필에 씁니다</span>
        </label>
        {/* 고지 접이는 걷었다 — 형: 「무엇을 받나 이딴 말 지우고」.
            법이 요구하는 「알 수 있게 하라」는 개인정보처리방침(/privacy)이
            받는다. 같은 말을 판마다 붙이면 아무도 안 읽는다. */}

        <div className="hip-yeon-row" data-off={!me?.religionOk ? "1" : undefined}>
          <b>다니는 절</b>
          <input
            defaultValue={me?.temple ?? ""}
            disabled={!me?.religionOk}
            onBlur={(e) => 고치기({ temple: e.target.value.trim().slice(0, 30) })}
            maxLength={30}
            aria-label="다니는 절"
          />
        </div>

        <div className="hip-yeon-row" data-off={!me?.religionOk ? "1" : undefined}>
          <b>가고 싶은 절</b>
          <input
            defaultValue={me?.wantTemple ?? ""}
            disabled={!me?.religionOk}
            onBlur={(e) =>
              고치기({ wantTemple: e.target.value.trim().slice(0, 30) })
            }
            maxLength={30}
            aria-label="가고 싶은 절"
          />
        </div>

        {/* 휴대폰 본인확인 — 스위치가 켜졌을 때만 선다(yeon.ts 본인확인_켬).
            업체(포트원 등)가 붙기 전에는 이 줄 자체가 안 뜬다. */}
        {본인확인_켬 && (
          <div className="hip-yeon-row">
            <b>본인확인</b>
            {me?.verified ? (
              <span className="hip-yeon-done">마쳤습니다</span>
            ) : (
              <button
                className="hip-yeon-verify"
                onClick={() => 탈잡기("본인확인 창을 준비 중입니다")}
              >
                휴대폰으로 확인
              </button>
            )}
          </div>
        )}

        <div className="hip-yeon-go">
          {/* 형: 「다 썼는데 왜 저장이 안 되지. 인연 받기 말고 저장으로 고치고」
              칸마다 손을 떼면 이미 저장된다. 그런데 **눌러서 끝내는 자리**가
              없으니 다 쓰고도 끝난 줄을 모른다. 이 단추가 그 자리다 —
              늘 눌리고, 다 찼으면 판에도 세운다. */}
          <button
            data-on={me?.state === "활동" ? "1" : undefined}
            disabled={저장중}
            onClick={저장하기}
          >
            {저장중 ? "저장하는 중" : 저장됨 ? "저장했습니다" : "저장"}
          </button>
        </div>

        {/* 「남이 보는 나」는 걷었다 — 형: 「남이 보는 나 지우고」 */}
      </div>
    </HipRoom>
  );
}

/** 하나만 고르는 줄 */
function 하나({
  이름,
  목록,
  값,
  고치기,
}: {
  이름: string;
  목록: readonly string[];
  값?: string;
  고치기: (v: string) => void;
}) {
  return (
    <div className="hip-yeon-row hip-yeon-row-wide">
      <b>{이름}</b>
      <span className="hip-chips hip-chips-tight">
        {목록.map((x) => (
          <button
            key={x}
            data-on={값 === x ? "1" : undefined}
            onClick={() => 고치기(값 === x ? "" : x)}
          >
            {x}
          </button>
        ))}
      </span>
    </div>
  );
}

/**
 * 여럿 고르는 줄 — 끝의 ＋ 로 직접 적는다.
 *
 * 형: 「대부분 버튼 식으로 클릭하면 올라가게 하되 주관식도 가능하게」
 * 적은 것은 고른 것과 **같은 칸**에 들어간다. 나중에 보는 쪽에서는
 * 무엇이 목록에 있던 것이고 무엇이 손으로 적은 것인지 알 필요가 없다.
 */
function 여럿({
  이름,
  목록,
  값,
  최대,
  고치기,
}: {
  이름: string;
  목록: readonly string[];
  값?: string[];
  /** 몇 개까지 고를 수 있나 — 없으면 얼마든지 */
  최대?: number;
  고치기: (v: string[]) => void;
}) {
  const [적는중, 적는중잡기] = useState(false);
  const 글칸 = useRef<HTMLInputElement | null>(null);
  const 고른것 = 값 ?? [];
  const 밖의것 = 고른것.filter((x) => !목록.includes(x));

  const 찼나 = !!최대 && 고른것.length >= 최대;
  /** 팝업에서 적은 것을 담는다 */
  const 담기 = (raw: string) => {
    const v = raw.trim().slice(0, 12);
    적는중잡기(false);
    if (!v || 고른것.includes(v) || 찼나) return;
    고치기([...고른것, v]);
  };
  const 뒤집기 = (x: string) => {
    if (고른것.includes(x)) return 고치기(고른것.filter((y) => y !== x));
    // 차면 **더 안 담는다.** 막는 말을 띄우지 않는다 — 안 눌리는 것이
    // 이미 말이다(형: 「멘트 넣지 말라고 했다」)
    if (찼나) return;
    고치기([...고른것, x]);
  };

  return (
    <div className="hip-yeon-row hip-yeon-row-wide">
      <b>{이름}</b>
      <span className="hip-chips hip-chips-tight" data-full={찼나 ? "1" : undefined}>
        {목록.map((x) => (
          <button
            key={x}
            data-on={고른것.includes(x) ? "1" : undefined}
            disabled={찼나 && !고른것.includes(x)}
            onClick={() => 뒤집기(x)}
          >
            {x}
          </button>
        ))}
        {밖의것.map((x) => (
          <button key={x} data-on="1" onClick={() => 뒤집기(x)}>
            {x}
          </button>
        ))}
        <button
          className="hip-chip-more"
          onClick={() => 적는중잡기(true)}
          disabled={찼나}
          aria-label={`${이름} 직접 적기`}
        >
          ＋
        </button>
      </span>

      {/* ── 직접 적기는 **팝업으로** ──────────────────────────
          형: 「직접 눌리면 팝업으로 쓰도록」
          알약 사이에 글칸을 끼워 넣었더니 줄이 흐트러지고, 폰에서는
          자판이 올라오면서 그 칸이 화면 밖으로 밀렸다. 적는 일은
          적는 자리에서 한다. */}
      {적는중 && (
        <div
          className="hip-write-pop"
          role="dialog"
          aria-label={`${이름} 직접 적기`}
          onClick={() => 적는중잡기(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <p>{이름}</p>
            <input
              autoFocus
              maxLength={12}
              placeholder="직접 적기"
              onKeyDown={(e) => {
                if (e.key === "Enter") 담기((e.target as HTMLInputElement).value);
                if (e.key === "Escape") 적는중잡기(false);
              }}
              ref={글칸}
            />
            <div>
              <button onClick={() => 적는중잡기(false)}>그만</button>
              <button data-go="1" onClick={() => 담기(글칸.current?.value ?? "")}>
                담기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 규칙을 세울 때 쓸 이름 — 화면에서는 안 쓴다
void YEON;
