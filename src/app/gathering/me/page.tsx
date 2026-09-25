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
import { loadMe } from "@/lib/me";
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
  사진빼기,
  사진올리기,
  프로필저장,
  내프로필,
} from "@/lib/yeon";

export default function 인연내프로필() {
  const [me, setMe] = useState<인연프로필 | null>(null);
  const [있나, 있나잡기] = useState<boolean | null>(null);
  const [올리는중, 올리는중잡기] = useState(false);
  const [탈, 탈잡기] = useState("");
  const 파일 = useRef<HTMLInputElement | null>(null);
  const [법명, 법명잡기] = useState("");
  useEffect(() => 법명잡기(loadMe()?.name ?? ""), []);

  const 다시읽기 = useCallback(async () => {
    const p = await 내프로필();
    setMe(p);
    if (p?.name) 법명잡기(p.name);
  }, []);

  useEffect(() => {
    return watchAuth((u) => {
      있나잡기(!!u);
      if (u) void 다시읽기();
    });
  }, [다시읽기]);

  const 고치기 = async (part: Partial<인연프로필>) => {
    탈잡기("");
    setMe((v) => ({ ...(v ?? ({} as 인연프로필)), ...part }));
    try {
      await 프로필저장(part);
    } catch (e) {
      탈잡기(e instanceof Error ? e.message : "저장하지 못했습니다");
    }
  };

  const 사진고르기 = async (fs: FileList | null) => {
    if (!fs?.length) return;
    탈잡기("");
    올리는중잡기(true);
    try {
      const 이미 = me?.photos ?? [];
      const 받을 = Array.from(fs).slice(0, Math.max(0, 6 - 이미.length));
      const 새것 = [];
      for (const f of 받을) 새것.push(await 사진올리기(f));
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

        {/* ── 사진 ── */}
        <div className="hip-yeon-shots">
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
              {f.state === "pending" && <i>보는 중</i>}
              {f.state === "no" && <i data-no="1">다시</i>}
            </span>
          ))}
          {(me?.photos?.length ?? 0) < 6 && (
            <button
              className="hip-yeon-add"
              onClick={() => 파일.current?.click()}
              disabled={올리는중}
              aria-label="사진 넣기"
            >
              {올리는중 ? "…" : "＋"}
            </button>
          )}
          <input
            ref={파일}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => 사진고르기(e.target.files)}
          />
        </div>

        {탈 && <p className="hip-yeon-bad">{탈}</p>}

        {/* 법명은 브라우저 장부에 있다. 그리는 첫 판에 바로 읽으면
            서버가 그린 글자와 달라져 리액트가 판을 다시 짠다. 뜬 뒤에 읽는다 */}
        <p className="hip-yeon-name">{법명 || "법명"}</p>

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
            <option value="">고르기</option>
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
            <option value="">고르기</option>
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
            <option value="">고르기</option>
            {Array.from({ length: 61 }, (_, i) => 140 + i).map((c) => (
              <option key={c} value={c}>
                {c} cm
              </option>
            ))}
          </select>
        </div>

        <하나 이름="MBTI" 목록={MBTI들} 값={me?.mbti} 고치기={(v) => 고치기({ mbti: v })} />
        <하나 이름="흡연" 목록={흡연들} 값={me?.smoke} 고치기={(v) => 고치기({ smoke: v })} />
        <하나 이름="음주" 목록={음주들} 값={me?.drink} 고치기={(v) => 고치기({ drink: v })} />

        {/* ── 여럿 고르는 것들 — 없는 것은 ＋ 로 ── */}
        <여럿 이름="성격" 목록={성격들} 값={me?.vibe} 고치기={(v) => 고치기({ vibe: v })} />
        <여럿 이름="취향" 목록={취향들} 값={me?.like} 고치기={(v) => 고치기({ like: v })} />
        <여럿 이름="관심" 목록={관심들} 값={me?.care} 고치기={(v) => 고치기({ care: v })} />
        <여럿 이름="데이트" 목록={데이트들} 값={me?.date} 고치기={(v) => 고치기({ date: v })} />

        <div className="hip-yeon-row">
          <b>다니는 절</b>
          <input
            defaultValue={me?.temple ?? ""}
            onBlur={(e) => 고치기({ temple: e.target.value.trim().slice(0, 30) })}
            maxLength={30}
            aria-label="다니는 절"
          />
        </div>

        <div className="hip-yeon-row">
          <b>가고 싶은 절</b>
          <input
            defaultValue={me?.wantTemple ?? ""}
            onBlur={(e) =>
              고치기({ wantTemple: e.target.value.trim().slice(0, 30) })
            }
            maxLength={30}
            aria-label="가고 싶은 절"
          />
        </div>

        <div className="hip-yeon-row hip-yeon-row-wide">
          <b>한 마디</b>
          <input
            defaultValue={me?.line ?? ""}
            onBlur={(e) => 고치기({ line: e.target.value.trim().slice(0, 60) })}
            maxLength={60}
            aria-label="한 마디"
          />
        </div>

        <div className="hip-yeon-go">
          <button
            data-on={me?.state === "활동" ? "1" : undefined}
            disabled={빠진.length > 0}
            onClick={() =>
              고치기({ state: me?.state === "활동" ? "쉼" : "활동" })
            }
          >
            {me?.state === "활동" ? "쉬는 중으로" : "인연 받기"}
          </button>
        </div>

        <a href="/gathering/me/view" className="hip-yeon-peek">
          남이 보는 나
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.4" />
            <path d="M15.2 15.2 L20 20" />
          </svg>
        </a>
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
  고치기,
}: {
  이름: string;
  목록: readonly string[];
  값?: string[];
  고치기: (v: string[]) => void;
}) {
  const [적는중, 적는중잡기] = useState(false);
  const 고른것 = 값 ?? [];
  const 밖의것 = 고른것.filter((x) => !목록.includes(x));

  const 뒤집기 = (x: string) =>
    고치기(고른것.includes(x) ? 고른것.filter((y) => y !== x) : [...고른것, x]);

  return (
    <div className="hip-yeon-row hip-yeon-row-wide">
      <b>{이름}</b>
      <span className="hip-chips hip-chips-tight">
        {목록.map((x) => (
          <button
            key={x}
            data-on={고른것.includes(x) ? "1" : undefined}
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
        {적는중 ? (
          <input
            className="hip-chip-write"
            autoFocus
            maxLength={12}
            placeholder="직접"
            onBlur={(e) => {
              const v = e.target.value.trim().slice(0, 12);
              if (v && !고른것.includes(v)) 고치기([...고른것, v]);
              적는중잡기(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") 적는중잡기(false);
            }}
          />
        ) : (
          <button
            className="hip-chip-more"
            onClick={() => 적는중잡기(true)}
            aria-label={`${이름} 직접 적기`}
          >
            ＋
          </button>
        )}
      </span>
    </div>
  );
}

// 규칙을 세울 때 쓸 이름 — 화면에서는 안 쓴다
void YEON;
