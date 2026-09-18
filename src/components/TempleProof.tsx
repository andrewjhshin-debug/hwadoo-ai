"use client";

// ─────────────────────────────────────────────────────────────
// 참배(參拜) — 절에 왔다는 한 번의 인증, 그리고 다녀간 이들.
//
// 단추는 하나뿐이다. 누르면 지금 자리를 재고, 절 앞이면 금빛 한 줄이 선다.
// 못 재면 그걸로 끝 — 대신 눌러 주는 길은 두지 않는다. 그건 인증이 아니다.
//
// 절을 안 정했어도 단추는 산다 — 가까운 절을 찾아 준다.
// 목록은 로그인 없이도 보인다. 남기는 것만 로그인이 필요하다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { MY_TEMPLE_EVENT, myTempleName } from "@/lib/myTemple";
import { CHARM_BY_ID, GRADE } from "@/lib/charm";
import {
  daysAgoLabel,
  fetchRecentProofs,
  proveHere,
  provenToday,
  TEMPLE_PROOF_EVENT,
  type ProofOutcome,
} from "@/lib/templeProof";

/** 몇 줄까지 보일까 — 대여섯 줄이면 '사람이 다닌다'가 전해진다 */
const ROWS = 6;

type Visitor = { name: string; at: number };

export default function TempleProof({
  temple,
  className = "",
}: {
  temple?: string;
  className?: string;
}) {
  // 서랍은 붙고 난 뒤에 읽는다 — 서버 첫 그림과 어긋나면 하이드레이션이 깨진다
  const [ready, setReady] = useState(false);
  const [here, setHere] = useState<string | null>(temple ?? null);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // 오늘 이 절을 이미 남겼다
  const [said, setSaid] = useState<ProofOutcome | null>(null);
  const [list, setList] = useState<Visitor[]>([]);

  useEffect(() => {
    const read = () => setHere(temple ?? myTempleName());
    read();
    setReady(true);
    window.addEventListener(MY_TEMPLE_EVENT, read);
    return () => window.removeEventListener(MY_TEMPLE_EVENT, read);
  }, [temple]);

  // 오늘 이미 남겼는지 — 장부가 바뀔 때마다 다시 본다
  useEffect(() => {
    if (!here) return;
    const read = () => setDone(provenToday(here));
    read();
    window.addEventListener(TEMPLE_PROOF_EVENT, read);
    return () => window.removeEventListener(TEMPLE_PROOF_EVENT, read);
  }, [here]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // 목록을 다시 부르는 신호 — 내가 방금 남긴 줄이 바로 보여야 한다
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!here) return;
    let alive = true;
    void fetchRecentProofs(here, ROWS).then((rows) => {
      // 절을 바꾸는 사이에 온 늦은 대답이 새 목록을 덮지 않게
      if (alive) setList(rows);
    });
    return () => {
      alive = false;
    };
  }, [here, beat]);

  const prove = async () => {
    if (busy || !user) return;
    setBusy(true);
    setSaid(null);
    try {
      const out = await proveHere(here);
      setSaid(out);
      if (out.ok) {
        setHere(out.temple); // 가까운 절을 찾아 줬을 수 있다
        setBeat((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  // 자리만 잡아 둔다 — 화면이 튀지 않게
  if (!ready) return <div className={`h-[200px] ${className}`} aria-hidden />;

  const label = busy
    ? "여기가 어딘지 보는 중"
    : !user
      ? "로그인하면 남길 수 있어요"
      : done
        ? "오늘은 다녀왔어요"
        : "절에 왔어요 — 인증하기";

  return (
    <section
      className={`rise rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 ${className}`}
    >
      {/* 절 이름을 크게 걸어 두었었다(「진관사」·「우리절」).
          형: 「굳이 우리절만 할 필요 있나. 그냥 참배랑 한자를 크게」 —
          맞다. 이 칸이 하는 일은 한 절을 가리키는 게 아니라
          **어느 절에 가든 눌러서 남기는 일**이다. 이름은 뗀다. */}
      <p className="font-serif text-[20px] font-light leading-tight tracking-[0.12em] text-hanji">
        참배 <span className="text-hanji-dim">· 參拜</span>
      </p>

      <button
        type="button"
        onClick={prove}
        disabled={busy || !user || done}
        className="btn-obang mt-3.5 w-full rounded-full px-4 py-2.5 text-[13px] tracking-[0.06em] text-hanji transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45"
      >
        {label}
      </button>

      {/* 방금 일어난 일 — 한 줄, 길어야 두 줄 */}
      {said && (
        <div className="mt-3">
          {!said.ok ? (
            <p className="text-[12.5px] text-hanji-dim">
              {said.why === "no-place"
                ? "지금은 위치를 읽을 수 없어요"
                : "아직 절 밖이에요"}
            </p>
          ) : said.already ? (
            <p className="text-[12.5px] text-hanji-dim">오늘은 이미 남겼어요</p>
          ) : (
            <>
              <p className="font-serif text-[15px] leading-tight text-gold">
                {said.temple} 다녀왔습니다
                {said.merit > 0 && (
                  <span className="ml-1.5 font-sans text-[12px] text-gold-soft">
                    +{said.merit}
                  </span>
                )}
              </p>
              {said.lotus > 0 && (
                <p className="mt-1 text-[12px] text-gold-soft">
                  연꽃 {said.lotus}송이를 받았어요
                </p>
              )}
              {said.charmRose && (
                <p className="mt-1 text-[11.5px] text-gold-soft">
                  {CHARM_BY_ID.cheonli.name} {GRADE[said.grade].name} — 도량 벽에
                  걸렸어요
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* 어떻게 되는 일인가 — 묻기 전에 말해 둔다.
          「위치(GPS)로 확인합니다」라고 적었더니 기계 설명서 같았다.
          하는 사람 입장에서는 GPS 를 켜는 일이 아니라 **절에 가는 일**이다.
          그 말로 적는다. */}
      {!said && (
        <p className="mt-2.5 break-keep text-[11.5px] leading-5 text-hanji-faint">
          화두에 담긴 이름난 도량 어디서든 —{" "}
          <span className="text-hanji-dim">절에 도착해서 누르면</span> 인증됩니다.
          하루 한 번, <span className="text-gold-soft">공덕과 연꽃</span>을 드려요.
          <br />
          {/* 「하는 사람 입장에서는 절에 가는 일」이라 기계 설명을 뺐었는데,
              위치를 재는 일은 **말해 두어야 하는 일**이다. 앞줄은 하는 일로,
              뒷줄은 무슨 일이 일어나는지로 — 둘 다 적는다. */}
          <span className="text-hanji-faint/80">
            누를 때 위치(GPS)를 한 번 읽어 절과의 거리를 잽니다. 위치는
            저장하지 않습니다.
          </span>
        </p>
      )}

      {/* 다녀간 이들 — 아무도 없으면 칸을 세우지 않는다.
          「아직 아무도 없어요」만 남은 빈 칸은 자리만 먹는다. */}
      {list.length > 0 && (
      <div className="mt-5 border-t border-ink-3 pt-3">
        <p className="text-[10.5px] tracking-[0.3em] text-hanji-faint">
          다녀간 이
        </p>
        {(
          <ul className="mt-1.5">
            {list.map((v, i) => (
              <li
                key={`${v.at}-${i}`}
                className="flex items-baseline justify-between py-[5px]"
              >
                <span className="truncate text-[13px] text-hanji">{v.name}</span>
                <span className="ml-3 shrink-0 text-[11.5px] text-hanji-faint">
                  {daysAgoLabel(v.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </section>
  );
}
