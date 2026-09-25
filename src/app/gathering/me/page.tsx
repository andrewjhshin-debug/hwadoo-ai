"use client";

// ─────────────────────────────────────────────────────────────
// 인연 — 내 프로필.
//
// 형: 「가입할 때 사진 무조건 넣어야 하고」
//
// 여기가 도반 찾기의 문이다. 사진 한 장이 없으면 이 판에 못 선다 —
// 얼굴 없는 계정 하나가 판 전체의 값을 깎기 때문이다.
//
// 설명을 늘어놓지 않는다(형: 「직관직관직관」). 못 채운 칸이 무엇인지
// 맨 위에 알약으로 보여 주고, 다 채우면 그 줄이 사라진다. 그게 설명이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { watchAuth } from "@/lib/sync";
import { loadMe } from "@/lib/me";
import {
  YEON,
  type 인연프로필,
  type 수행,
  수행들,
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

  const 다시읽기 = useCallback(async () => {
    const p = await 내프로필();
    setMe(p);
  }, []);

  useEffect(() => {
    return watchAuth((u) => {
      있나잡기(!!u);
      if (u) void 다시읽기();
    });
  }, [다시읽기]);

  const 고치기 = async (part: Partial<인연프로필>) => {
    탈잡기("");
    try {
      await 프로필저장(part);
      setMe((v) => ({ ...(v ?? ({} as 인연프로필)), ...part }));
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
      // 여섯 장이면 족하다 — 더 받으면 고르는 일이 일이 된다
      const 남은 = Math.max(0, 6 - 이미.length);
      const 받을 = Array.from(fs).slice(0, 남은);
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

  if (있나 === false) {
    return (
      <HipRoom here="/gathering/me" lanes={false} rail="/gathering">
        <div className="hip-yeon">
          <p className="hip-yeon-head">因緣 · 도반 찾기</p>
          <p className="hip-yeon-say">들어온 뒤에 열립니다</p>
        </div>
      </HipRoom>
    );
  }

  const 빠진 = 모자란것(me);
  const 올해 = new Date().getFullYear();

  return (
    <HipRoom here="/gathering/me" lanes={false} rail="/gathering">
      <div className="hip-yeon">
        <p className="hip-yeon-head">因緣 · 도반 찾기</p>

        {/* 못 채운 것 — 다 채우면 이 줄이 사라진다. 그게 설명이다 */}
        {빠진.length > 0 && (
          <div className="hip-yeon-need">
            {빠진.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        )}

        {/* ── 사진 ── 형: 「사진 무조건」 */}
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

        {/* ── 법명 — 이미 있는 것을 그대로 쓴다 ── */}
        <p className="hip-yeon-name">{me?.name ?? loadMe()?.name ?? "법명"}</p>

        {/* ── 성별 ── */}
        <div className="hip-yeon-row">
          <b>성별</b>
          <span className="hip-chips">
            {(
              [
                ["m", "남"],
                ["f", "여"],
              ] as const
            ).map(([k, t]) => (
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

        {/* ── 나이 ── 만 19세 미만은 이 판에 못 선다 */}
        <div className="hip-yeon-row">
          <b>태어난 해</b>
          <select
            value={me?.born ?? ""}
            onChange={(e) => 고치기({ born: Number(e.target.value) })}
            aria-label="태어난 해"
          >
            <option value="">고르기</option>
            {Array.from({ length: 62 }, (_, i) => 올해 - 19 - i).map((y) => (
              <option key={y} value={y}>
                {y} ({나이(y, 올해)}세)
              </option>
            ))}
          </select>
        </div>
        {me?.born != null && !들어올수있나(me.born) && (
          <p className="hip-yeon-bad">만 19세 이상만 설 수 있습니다</p>
        )}

        {/* ── 지역 ── 절은 멀면 못 간다 */}
        <div className="hip-yeon-row">
          <b>사는 곳</b>
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

        {/* ── 다니는 절 ── 가장 강한 연결고리다 */}
        <div className="hip-yeon-row">
          <b>다니는 절</b>
          <input
            defaultValue={me?.temple ?? ""}
            onBlur={(e) => 고치기({ temple: e.target.value.trim().slice(0, 30) })}
            placeholder="없으면 비워 두세요"
            maxLength={30}
            aria-label="다니는 절"
          />
        </div>

        {/* ── 수행 ── */}
        <div className="hip-yeon-row hip-yeon-row-wide">
          <b>수행</b>
          <span className="hip-chips">
            {수행들.map((k) => {
              const on = me?.practice?.includes(k);
              return (
                <button
                  key={k}
                  data-on={on ? "1" : undefined}
                  onClick={() =>
                    고치기({
                      practice: on
                        ? (me?.practice ?? []).filter((x) => x !== k)
                        : ([...(me?.practice ?? []), k] as 수행[]),
                    })
                  }
                >
                  {k}
                </button>
              );
            })}
          </span>
        </div>

        {/* ── 한 줄 ── */}
        <div className="hip-yeon-row hip-yeon-row-wide">
          <b>한 줄</b>
          <input
            defaultValue={me?.line ?? ""}
            onBlur={(e) => 고치기({ line: e.target.value.trim().slice(0, 60) })}
            placeholder="새벽 예불 좋아합니다"
            maxLength={60}
            aria-label="한 마디"
          />
        </div>

        {/* ── 서고 쉬고 ── */}
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
          <small>
            {빠진.length > 0
              ? "위를 다 채우면 설 수 있습니다"
              : me?.state === "활동"
                ? "하루에 한 사람을 만납니다"
                : "지금은 아무에게도 안 보입니다"}
          </small>
        </div>

        {/* 남이 보는 나 — 고치는 칸과 보이는 카드는 다른 물건이다.
            형: 「그 프로필 사진이랑 아래에 프로필 쓴 거 보이도록」 */}
        <a href="/gathering/me/view" className="hip-yeon-peek">
          남이 보는 나
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.4" />
            <path d="M15.2 15.2 L20 20" />
          </svg>
        </a>

        <p className="hip-yeon-foot">
          사진은 올린 뒤 한 번 살펴봅니다. 법명 말고는 아무것도 보이지 않습니다.
        </p>
      </div>
    </HipRoom>
  );
}

// 규칙을 세울 때 쓸 이름 — 화면에서는 안 쓴다
void YEON;
