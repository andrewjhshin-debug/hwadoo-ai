"use client";

// ─────────────────────────────────────────────────────────────
// 모멘트 판 — 절에 다녀온 한 장들.
//
// 생김새는 크림(KREAM)에서 가져왔다: 두 칸 격자, 사진이 먼저,
// 말은 아래에 아주 작게. 다만 흰 바탕이 아니라 먹빛이고,
// 값표 자리에는 절 이름과 합장 수가 앉는다.
//
// 인스타에서 가져온 것은 두 가지 — 해시태그로 걸러 보는 것,
// 그리고 눌렀을 때 사진이 화면을 꽉 채우는 것.
//
// 사진은 목록에서 작은 그림(thumb)만 받는다. 큰 그림은 열었을 때
// 그 한 장만 따로 받는다 — 스무 장을 한꺼번에 내려받지 않게.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { isAdminAccount } from "@/lib/config";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import { TEMPLES } from "@/lib/pilgrimage";
import { here as whereAmI, nearestTemple, type Spot } from "@/lib/templeProof";
import {
  bowMoment,
  createMoment,
  deleteMoment,
  fetchMoments,
  fetchMyBow,
  fetchPhoto,
  parseTags,
  TAG_MAX,
  TAG_SUGGEST,
  WHAT_MAX,
  whenLabel,
  type Moment,
} from "@/lib/moment";

// ── 작은 부품 ────────────────────────────────────────────────

/** 위치가 맞았다는 도장 */
function Stamp({ meters }: { meters?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 px-2 py-[3px] text-[10px] font-medium text-ink">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      그 자리{typeof meters === "number" ? ` ${meters}m` : ""}
    </span>
  );
}

function Hapjang({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 합장한 두 손 */}
      <path d="M12 21c-3.1-2.2-6.5-5-6.5-9.2 0-2.3 1.5-3.8 3.2-3.8 1.3 0 2.4.8 3.3 2.2.9-1.4 2-2.2 3.3-2.2 1.7 0 3.2 1.5 3.2 3.8 0 4.2-3.4 7-6.5 9.2z" />
      <path d="M12 10.2V3" />
    </svg>
  );
}

// ── 판 ──────────────────────────────────────────────────────

export default function MomentBoard() {
  const confirm = useConfirm();
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<Moment[] | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<Moment | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => watchAuth(setUser), []);

  const reload = useCallback(() => {
    let alive = true;
    void fetchMoments(tag ?? undefined).then((r) => {
      if (alive) setRows(r);
    });
    return () => {
      alive = false;
    };
  }, [tag]);

  useEffect(() => reload(), [reload]);

  // 목록에 실제로 걸린 해시태그 — 아무도 안 쓴 태그로 거를 일은 없다
  const live: string[] = [];
  for (const m of rows ?? []) for (const t of m.tags ?? []) if (!live.includes(t)) live.push(t);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-10 pt-8 md:px-8">
      {/* 머리말 — 걸기 단추는 여기 붙박이로 둔다.
          떠다니는(fixed) 단추로 뒀더니 아래 「이어서」 카드와 탭 띠에
          겹쳤다. 이 도량에서 떠다니는 단추는 오른쪽 아래 도량 메뉴 하나뿐. */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.42em] text-gold-soft">moment</p>
            <h1 className="mt-2 font-serif text-2xl font-light tracking-tight text-hanji">
              절에 다녀온 한 장
            </h1>
          </div>
          <button
            onClick={() => setWriting(true)}
            className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/45 px-3.5 py-2 text-[12px] text-gold transition-colors hover:bg-gold/12"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
            걸기
          </button>
        </div>
      </header>

      {/* 해시태그 발 — 가로로 흘려 둔다 */}
      {live.length > 0 && (
        <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setTag(null)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
              tag === null
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            전체
          </button>
          {live.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t === tag ? null : t)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                tag === t
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-ink-3 text-hanji-dim hover:text-hanji"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* 격자 — 두 칸(넓으면 세 칸). 사진 비율이 제각각이라 columns 로 흘린다 */}
      {rows === null ? (
        <p className="py-16 text-center text-[12.5px] text-hanji-faint">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-ink-3 px-6 py-14 text-center">
          <p className="text-[13px] text-hanji-dim">
            {tag ? `#${tag} 로 걸린 장면이 아직 없습니다.` : "아직 걸린 장면이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-3 md:columns-3">
          {rows.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpen(m)}
              className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50 text-left transition-colors hover:border-gold/35"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumb}
                  alt={`${m.place} — ${m.what}`}
                  loading="lazy"
                  className="w-full"
                  style={{ aspectRatio: m.ratio || 1 }}
                />
                {m.verified && (
                  <span className="absolute left-2 top-2">
                    <Stamp meters={m.meters} />
                  </span>
                )}
              </div>
              <div className="px-3 pb-3 pt-2.5">
                <p className="truncate text-[12.5px] font-medium text-gold-soft">{m.place}</p>
                <p className="mt-1 line-clamp-2 break-keep text-[12px] leading-5 text-hanji-dim">
                  {m.what}
                </p>
                <p className="mt-2 flex items-center gap-2 text-[10.5px] text-hanji-faint">
                  <span className="inline-flex items-center gap-1">
                    <Hapjang on={false} />
                    {m.hapjang ?? 0}
                  </span>
                  <span>·</span>
                  <span className="truncate">{m.name}</span>
                  <span className="ml-auto shrink-0">{whenLabel(m.createdAt?.seconds)}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Viewer
          m={open}
          user={user}
          onClose={() => setOpen(null)}
          onGone={() => {
            setOpen(null);
            reload();
          }}
          confirm={confirm}
        />
      )}

      {writing && (
        <Composer
          user={user}
          onClose={() => setWriting(false)}
          onDone={() => {
            setWriting(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ── 한 장을 펼쳐 본다 ────────────────────────────────────────

function Viewer({
  m,
  user,
  onClose,
  onGone,
  confirm,
}: {
  m: Moment;
  user: User | null;
  onClose: () => void;
  onGone: () => void;
  confirm: (
    title: string,
    detail?: string,
    labels?: { confirm?: string; cancel?: string }
  ) => Promise<boolean>;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [bowed, setBowed] = useState(false);
  const [count, setCount] = useState(m.hapjang ?? 0);
  const mine = !!user && (user.uid === m.uid || isAdminAccount(user));

  useEffect(() => {
    let alive = true;
    void fetchPhoto(m.id).then((p) => alive && setPhoto(p));
    void fetchMyBow(m.id).then((b) => alive && setBowed(b));
    return () => {
      alive = false;
    };
  }, [m.id]);

  // 열려 있는 동안에는 뒤가 안 밀리게
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const bow = async () => {
    if (!user) return;
    const next = !bowed;
    setBowed(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    await bowMoment(m.id, next).catch(() => {
      setBowed(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/97 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-ink-3 px-5 py-3">
        <p className="truncate text-[13px] text-gold-soft">{m.place}</p>
        <button onClick={onClose} className="rounded-full p-1.5 text-hanji-dim hover:text-hanji">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-5 pb-10 pt-5">
          <div className="overflow-hidden rounded-[16px] border border-ink-3 bg-ink-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo ?? m.thumb}
              alt={`${m.place} — ${m.what}`}
              className="w-full"
              style={{ aspectRatio: m.ratio || 1 }}
            />
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            {m.verified && <Stamp meters={m.meters} />}
            <span className="text-[11.5px] text-hanji-faint">
              {m.name}
              {m.rankHanja ? ` · ${m.rankHanja}` : ""} · {whenLabel(m.createdAt?.seconds)}
            </span>
          </div>

          <p className="mt-3 whitespace-pre-line break-keep text-[14px] leading-7 text-hanji">
            {m.what}
          </p>

          {m.tags?.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-1.5">
              {m.tags.map((t) => (
                <span key={t} className="rounded-full border border-ink-3 px-2.5 py-1 text-[11px] text-hanji-dim">
                  #{t}
                </span>
              ))}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-ink-3 pt-4">
            <button
              onClick={bow}
              disabled={!user}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] transition-colors disabled:opacity-45 ${
                bowed ? "border-gold/55 bg-gold/12 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
              }`}
            >
              <Hapjang on={bowed} />
              합장 {count}
            </button>
            {!user && <span className="text-[11px] text-hanji-faint">로그인하면 합장할 수 있습니다</span>}
            {mine && (
              <button
                onClick={async () => {
                  const ok = await confirm(
                    "이 장면을 내릴까요?",
                    "사진까지 함께 지워집니다. 되돌릴 수 없습니다.",
                    { confirm: "내리기" }
                  );
                  if (!ok) return;
                  await deleteMoment(m.id);
                  onGone();
                }}
                className="ml-auto text-[11.5px] text-hanji-faint transition-colors hover:text-vermilion"
              >
                내리기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 한 장을 건다 ────────────────────────────────────────────

function Composer({
  user,
  onClose,
  onDone,
}: {
  user: User | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const pick = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [what, setWhat] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  // 열자마자 자리를 잰다 — 절 앞이면 이름까지 채워 준다
  useEffect(() => {
    let alive = true;
    void whereAmI()
      .then((s) => {
        if (!alive) return;
        setSpot(s);
        const n = s ? nearestTemple(s) : null;
        if (n) {
          setNear(n.temple.name);
          setPlace((p) => p || n.temple.name);
        }
      })
      .finally(() => alive && setLocating(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 고른 사진 미리보기 — 연 것은 닫을 때 돌려준다
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const tags = parseTags(tagLine);

  const put = async () => {
    if (!user || !file || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await createMoment({ file, place, what, tags, spot });
      setSaid(
        r.verified
          ? `그 자리에서 걸었습니다 — 공덕 ${r.merit}`
          : `걸었습니다 — 공덕 ${r.merit}`
      );
      // 한 박자 보여 주고 닫는다
      setTimeout(onDone, 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "올리지 못했습니다");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink">
      <div className="flex items-center justify-between border-b border-ink-3 px-5 py-3">
        <p className="text-[13px] text-gold-soft">시절인연 걸기</p>
        <button onClick={onClose} className="rounded-full p-1.5 text-hanji-dim hover:text-hanji">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-5 py-5">
          {!user ? (
            <div className="rounded-[16px] border border-ink-3 px-5 py-10 text-center">
              <p className="text-[13px] text-hanji-dim">시절인연은 로그인한 분만 걸 수 있습니다.</p>
              <button
                onClick={() => void loginWithGoogle()}
                className="mt-4 rounded-full border border-gold/45 px-4 py-2 text-[12.5px] text-gold"
              >
                로그인하고 걸기
              </button>
            </div>
          ) : (
            <>
              {/* ① 사진 */}
              <input
                ref={pick}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              <button
                onClick={() => pick.current?.click()}
                className="block w-full overflow-hidden rounded-[16px] border border-dashed border-ink-3 transition-colors hover:border-gold/40"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="고른 사진" className="w-full" />
                ) : (
                  <span className="flex flex-col items-center gap-2 px-6 py-16">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-gold-soft" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <rect x="3" y="6" width="18" height="14" rx="2.5" />
                      <circle cx="12" cy="13" r="3.4" />
                      <path d="M8 6l1.4-2h5.2L16 6" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[12.5px] text-hanji-dim">사진 고르기</span>
                  </span>
                )}
              </button>
              {preview && (
                <button
                  onClick={() => pick.current?.click()}
                  className="mt-2 text-[11.5px] text-hanji-faint hover:text-hanji-dim"
                >
                  다른 사진으로
                </button>
              )}

              {/* 자리 — 잰 결과를 한 줄로 */}
              <p className="mt-4 text-[11.5px] leading-5">
                {locating ? (
                  <span className="text-hanji-faint">자리를 재는 중…</span>
                ) : near ? (
                  <span className="text-gold-soft">
                    지금 {near} 앞입니다 — 걸면 「그 자리」 도장이 찍히고 공덕이 갑절입니다.
                  </span>
                ) : (
                  <span className="text-hanji-faint">
                    절 좌표를 못 잡았습니다. 그래도 걸립니다 — 도장만 없습니다.
                  </span>
                )}
              </p>

              {/* ② 어디 */}
              <label className="mt-5 block">
                <span className="text-[11px] tracking-[0.3em] text-hanji-faint">어디</span>
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  list="moment-temples"
                  maxLength={30}
                  placeholder="봉은사"
                  className="mt-1.5 w-full rounded-[12px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-[14px] text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/45"
                />
              </label>
              <datalist id="moment-temples">
                {TEMPLES.map((t) => (
                  <option key={t.name} value={t.name} />
                ))}
              </datalist>

              {/* ③ 무엇 */}
              <label className="mt-4 block">
                <span className="text-[11px] tracking-[0.3em] text-hanji-faint">무엇을 했나</span>
                <textarea
                  value={what}
                  onChange={(e) => setWhat(e.target.value.slice(0, WHAT_MAX))}
                  rows={3}
                  placeholder="새벽예불 드리고 탑 세 바퀴 돌았습니다."
                  className="mt-1.5 w-full resize-none rounded-[12px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-[14px] leading-7 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/45"
                />
                <span className="mt-1 block text-right text-[10.5px] text-hanji-faint">
                  {what.length}/{WHAT_MAX}
                </span>
              </label>

              {/* ④ 해시태그 */}
              <label className="mt-1 block">
                <span className="text-[11px] tracking-[0.3em] text-hanji-faint">
                  해시태그 <span className="tracking-normal">최대 {TAG_MAX}개</span>
                </span>
                <input
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  placeholder="#절에왔어요 #새벽예불"
                  className="mt-1.5 w-full rounded-[12px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-[14px] text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/45"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TAG_SUGGEST.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setTagLine((line) =>
                          on
                            ? parseTags(line).filter((x) => x !== t).map((x) => `#${x}`).join(" ")
                            : `${line.trim()} #${t}`.trim()
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        on ? "border-gold/55 bg-gold/12 text-gold" : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                      }`}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>

              {err && <p className="mt-4 text-[12px] text-vermilion">{err}</p>}
              {said && <p className="mt-4 text-[12.5px] text-gold">{said}</p>}
            </>
          )}
        </div>
      </div>

      {/* 아래 붙박이 — 저장이 화면 밖으로 밀리지 않게 */}
      {user && (
        <div className="border-t border-ink-3 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            onClick={put}
            disabled={!file || !place.trim() || !what.trim() || busy}
            className="w-full rounded-full border border-gold/45 bg-gold/10 py-3.5 text-[13.5px] text-gold transition-colors disabled:opacity-40 enabled:hover:bg-gold/18"
          >
            {busy ? "거는 중…" : "걸기"}
          </button>
        </div>
      )}
    </div>
  );
}

/** 연지원에서 건너오는 줄 — 목록 위에 한 칸 */
export function MomentTeaser() {
  return (
    <Link
      href="/moment"
      className="mt-4 flex items-center gap-3 rounded-[14px] border border-ink-3 bg-ink-2/40 px-4 py-3 transition-colors hover:border-gold/35"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gold-soft" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="6" width="18" height="14" rx="2.5" />
        <circle cx="12" cy="13" r="3.4" />
        <path d="M8 6l1.4-2h5.2L16 6" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-hanji">시절인연 — 절에 다녀온 한 장</span>
        <span className="block text-[11px] text-hanji-faint">
          사진 걸고 해시태그 달면 공덕이 쌓입니다
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-gold-soft">보기 →</span>
    </Link>
  );
}
