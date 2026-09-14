// ─────────────────────────────────────────────────────────────
// 우리 절 —
// 왜 브라우저에 먼저 적는가: 로그인하지 않은 사람도 자기 절을 둘 수 있게.
// 왜 서버에도 올리는가: 이 절에 다니는 사람을 세려면 한곳에 모여야 한다.
// 명단은 만들지 않는다 — 서버는 사람 수만 돌려준다(사생활).
// 말은 "우리 절"로 바뀌었어도 저장 키·경로는 그대로 둔다 — 이미 쓰는 사람이 있다.
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase";
import { TEMPLES, type Temple } from "./pilgrimage";

export const MY_TEMPLE_KEY = "hwadu.mytemple.v1";
export const MY_TEMPLE_EVENT = "hwadu-mytemple-updated";

/** 이보다 길면 절 이름이 아니다 */
const NAME_MAX = 24;

/**
 * 앞뒤 공백·겹공백을 걷어낸다.
 * 셈은 이름이 딱 맞을 때만 묶이므로, "봉은사 "와 "봉은사"가
 * 갈라서면 한 절에 다니는 사람끼리 서로를 못 알아본다.
 */
export function tidyTempleName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

// ── 이 기기의 서랍 ──────────────────────────────────────────

/**
 * 우리 절 이름. 안 정했으면 null.
 * 화면은 이 하나만 부르면 된다 — 부를 때마다 서랍에서 새로 읽는다.
 */
export function myTempleName(): string | null {
  if (typeof window === "undefined") return null; // 서버에는 서랍이 없다
  try {
    const raw = window.localStorage.getItem(MY_TEMPLE_KEY);
    const name = typeof raw === "string" ? tidyTempleName(raw) : "";
    return name || null;
  } catch {
    return null;
  }
}

/** 예전 이름 — 먼저 짜인 화면이 이 이름으로 부른다 */
export const myTemple = myTempleName;

// 서랍에만 적는다 — 서버에서 방금 데려온 값은 다시 올릴 필요가 없다
function writeLocal(name: string) {
  try {
    if (name) window.localStorage.setItem(MY_TEMPLE_KEY, name);
    else window.localStorage.removeItem(MY_TEMPLE_KEY);
    window.dispatchEvent(new CustomEvent(MY_TEMPLE_EVENT));
  } catch {
    // 못 적어도 화면은 흐른다
  }
}

// 계정에 올린다 — 로그인 안 했으면 조용히 넘어간다
async function pushMyTemple(temple: string) {
  const u = auth.currentUser;
  if (!u) return;
  try {
    const idToken = await u.getIdToken();
    await fetch("/api/temple", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ temple }),
    });
  } catch {
    // 서버가 못 받아도 이 기기에 적힌 우리 절은 그대로다
  }
}

/** 우리 절을 정한다. 빈 값이면 지운다(이제 안 다닌다). */
export function setMyTemple(name: string | null) {
  if (typeof window === "undefined") return;
  const tidy = name ? tidyTempleName(name) : "";
  writeLocal(tidy);
  void pushMyTemple(tidy); // 기다리지 않는다 — 화면은 이미 바뀌었다
}

/**
 * 로그인한 뒤 한 번 — 이 기기와 계정의 절을 맞춘다.
 * 이 기기에 정한 절이 있으면 그쪽이 이긴다(방금 고른 사람의 뜻이 먼저다).
 * 비었으면 계정에 적힌 절을 데려온다 — 폰에서 정하고 PC 에서 열어도 그대로.
 */
export async function syncMyTemple(): Promise<string | null> {
  const mine = myTempleName();
  const u = auth.currentUser;
  if (!u) return mine;
  if (mine) {
    await pushMyTemple(mine);
    return mine;
  }
  try {
    const idToken = await u.getIdToken();
    const res = await fetch("/api/temple", {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { temple?: unknown };
    const t = typeof data.temple === "string" ? tidyTempleName(data.temple) : "";
    if (!t) return null;
    writeLocal(t);
    return t;
  } catch {
    return null;
  }
}

// ── 이 절에 다니는 사람 몇 ──────────────────────────────────

/** 이 절에 다닌다고 적어 둔 사람 수(나까지). 셀 수 없으면 0 — 화면은 조용히 넘어간다 */
export async function fetchTempleMates(name: string): Promise<number> {
  const temple = tidyTempleName(name);
  if (!temple) return 0;
  try {
    const res = await fetch(
      `/api/temple?temple=${encodeURIComponent(temple)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { n?: unknown };
    return typeof data.n === "number" && data.n > 0 ? Math.floor(data.n) : 0;
  } catch {
    return 0;
  }
}

// ── 목록에서 고르기 ─────────────────────────────────────────

/**
 * 이름·산문·지역·주소 어느 쪽으로 찾아도 걸리게 한다
 * ("북한산"으로도, "제주"로도 자기 절을 찾는다).
 * 빈 물음이면 앞자리 몇 곳을 보여 준다 — 빈 목록보다 낫다.
 */
export function searchTemples(q: string, limit = 6): Temple[] {
  const key = tidyTempleName(q).replace(/\s/g, "");
  if (!key) return TEMPLES.slice(0, limit);
  return TEMPLES.filter(
    (t) =>
      t.name.includes(key) ||
      t.mountain.includes(key) ||
      t.region.includes(key) ||
      t.address.includes(key)
  ).slice(0, limit);
}

/** 목록에 있는 절인가 — 없으면 직접 적게 한다 */
export function isKnownTemple(name: string): boolean {
  const tidy = tidyTempleName(name);
  return TEMPLES.some((t) => t.name === tidy);
}
