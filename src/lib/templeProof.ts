// ─────────────────────────────────────────────────────────────
// 절 인증(寺 認證) — 다녀왔는가는 발이 대답한다.
//
// 왜 위치인가 — 단추만 누르면 서는 인증은 인증이 아니다.
// 절 좌표에서 500m 안에 서 있을 때만 장부에 적는다.
// 수동 체크인은 두지 않는다 — 못 재면 못 잰 대로 끝낸다.
// 그게 없으면 이 기능은 그냥 '다녀왔다고 말하기'가 된다.
//
// 왜 하루 한 절 한 번인가 — 같은 마당을 두 번 돈다고 두 번 간 것이 아니다.
// 날짜는 이 기기의 하루로 센다(서버는 서버대로 한국 하루로 또 센다).
//
// 장부 한 칸: { at, temple, day }
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase";
import { TEMPLES, type Temple } from "./pilgrimage";
import { tidyTempleName } from "./myTemple";
import { addMerit } from "./merit";
import { grantCharm, type CharmGrade } from "./charm";
import { visitDayKey } from "@/components/VisitLedger";

export const TEMPLE_PROOF_KEY = "hwadu.templeproof.v1";
export const TEMPLE_PROOF_EVENT = "hwadu-templeproof-updated";

/** 이 안에 서 있으면 왔다고 친다. 일주문에서 대웅전까지가 대개 이만큼이다. */
export const NEAR_M = 500;

/** 장부가 길어져도 이만큼만 남긴다 — 서랍은 무한하지 않다 */
const MAX_ROWS = 300;

/**
 * 절 인증에 걸리는 부적 — 천리부(千里符, "절을 다녀오면").
 * 운력부는 울력·봉사 쪽이라 뜻이 어긋난다.
 */
const CHARM = "cheonli" as const;

export type TempleProof = {
  at: number; // 인증한 시각
  temple: string; // 절 이름
  day: string; // 이 기기의 하루 — 겹침을 이걸로 가른다
};

export type Spot = { lat: number; lng: number };

/** 인증이 어떻게 끝났는가 */
export type ProofOutcome =
  | {
      ok: true;
      temple: string;
      meters: number;
      already: boolean; // 오늘 이미 남긴 절이었다
      merit: number; // 이번에 쌓인 공덕(천장에 닿았으면 0)
      grade: CharmGrade;
      charmRose: boolean; // 부적을 새로 얻었거나 등급이 올랐다
      lotus: number; // 이번에 받은 연꽃(서버가 준다. 못 받으면 0)
    }
  | { ok: false; why: "no-place" | "far" };

// ── 거리 ────────────────────────────────────────────────────

const R = 6_371_000; // 지구 반지름(m)
const rad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이 거리(m) — 하버사인 */
export function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 목록에 있는 절인가 — 직접 적은 절은 좌표가 없어 잴 수 없다 */
export function findTemple(name: string | null | undefined): Temple | null {
  const tidy = tidyTempleName(name ?? "");
  if (!tidy) return null;
  return TEMPLES.find((t) => t.name === tidy) ?? null;
}

/**
 * 지금 서 있는 곳에서 500m 안의 절.
 * only 를 주면 그 절만 견준다 — 우리 절 앞에 섰는지만 묻는 자리.
 * 안 주면 목록 전체에서 가장 가까운 곳을 찾는다 —
 * 우리 절을 안 정했거나 목록에 없는 절을 적어 둔 사람도 인증할 수 있게.
 */
export function nearestTemple(
  spot: Spot,
  only?: Temple | null
): { temple: Temple; meters: number } | null {
  const pool = only ? [only] : TEMPLES;
  let best: { temple: Temple; meters: number } | null = null;
  for (const t of pool) {
    const m = metersBetween(spot.lat, spot.lng, t.lat, t.lng);
    if (m > NEAR_M) continue;
    if (!best || m < best.meters) best = { temple: t, meters: m };
  }
  return best;
}

// ── 지금 어디인가 ───────────────────────────────────────────

/**
 * 지금 좌표. 거절당하거나 기기가 못 주면 null — 까닭은 묻지 않는다.
 * 어떤 기기는 콜백을 영영 안 부르므로 우리 쪽에서도 끊는다.
 */
export function here(): Promise<Spot | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: Spot | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const cut = setTimeout(() => finish(null), 13_000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(cut);
        finish({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        clearTimeout(cut);
        finish(null);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  });
}

// ── 장부 ────────────────────────────────────────────────────

function isRow(v: unknown): v is TempleProof {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<TempleProof>;
  return (
    typeof o.at === "number" &&
    Number.isFinite(o.at) &&
    typeof o.temple === "string" &&
    !!o.temple &&
    typeof o.day === "string"
  );
}

/** 다녀온 기록 — 새것이 앞에 온다 */
export function loadProofs(): TempleProof[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TEMPLE_PROOF_KEY);
    const p = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(p)) return [];
    return p.filter(isRow).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** 몇 번 다녀왔는가 — 부적 등급이 이 셈을 본다 */
export function proofCount(): number {
  return loadProofs().length;
}

/** 오늘 이 절을 이미 남겼는가 */
export function provenToday(temple: string, day = visitDayKey()): boolean {
  const tidy = tidyTempleName(temple);
  return loadProofs().some((r) => r.temple === tidy && r.day === day);
}

function writeRow(row: TempleProof) {
  try {
    const next = [row, ...loadProofs()].slice(0, MAX_ROWS);
    window.localStorage.setItem(TEMPLE_PROOF_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(TEMPLE_PROOF_EVENT));
  } catch {
    // 못 적어도 공덕은 이미 쌓였다 — 화면은 흐른다
  }
}

/**
 * 몇 번째 인증이 어느 등급인가.
 * 한 번 다녀온 사람과 아홉 번 다녀온 사람의 종이가 같으면 다시 갈 까닭이 없다.
 */
export function gradeFor(count: number): CharmGrade {
  if (count >= 9) return "sang";
  if (count >= 3) return "jung";
  return "ha";
}

// ── 서버에도 한 줄 ──────────────────────────────────────────

/**
 * 남들도 보게 한 줄 올린다. 로그인 안 했거나 서버가 안 받으면 조용히 넘어간다 —
 * 이 기기의 장부와 공덕은 이미 남았다.
 */
async function pushProof(temple: string, spot: Spot): Promise<number> {
  const u = auth.currentUser;
  if (!u) return 0;
  try {
    const idToken = await u.getIdToken();
    const r = await fetch("/api/temple-proof", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ temple, lat: spot.lat, lng: spot.lng }),
    });
    // 연꽃은 **서버가 준다.** 브라우저는 몇 송이 받았는지 듣기만 한다 —
    // 여기서 늘릴 수 있으면 콘솔 한 줄로 찍어 낼 수 있다.
    const j = (await r.json()) as { lotus?: number };
    return typeof j?.lotus === "number" ? j.lotus : 0;
  } catch {
    // 서버가 못 받아도 다녀온 것은 다녀온 것이다
    return 0;
  }
}

/** 이 절에 최근 다녀간 사람. 못 가져오면 빈 목록 — 화면은 조용히 넘어간다 */
export async function fetchRecentProofs(
  temple: string,
  limit = 6
): Promise<{ name: string; at: number }[]> {
  const tidy = tidyTempleName(temple);
  if (!tidy) return [];
  try {
    const res = await fetch(
      `/api/temple-proof?temple=${encodeURIComponent(tidy)}&limit=${limit}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { list?: unknown };
    if (!Array.isArray(data.list)) return [];
    return data.list
      .filter(
        (r): r is { name: string; at: number } =>
          !!r &&
          typeof r === "object" &&
          typeof (r as { name?: unknown }).name === "string" &&
          typeof (r as { at?: unknown }).at === "number"
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ── 인증 한 번 ──────────────────────────────────────────────

/**
 * 지금 자리에서 인증한다.
 * want 를 주면 그 절 앞인지만 묻고, 안 주면 가까운 절을 찾는다.
 *
 * 순서가 중요하다 — 장부와 공덕을 먼저 남기고 서버에 올린다.
 * 서버가 넘어져도 다녀온 사실이 사라지면 안 된다.
 */
export async function proveHere(
  want?: Temple | string | null
): Promise<ProofOutcome> {
  const target = typeof want === "string" ? findTemple(want) : want ?? null;

  const spot = await here();
  if (!spot) return { ok: false, why: "no-place" };

  const hit = nearestTemple(spot, target);
  if (!hit) return { ok: false, why: "far" };

  const temple = hit.temple.name;
  const meters = Math.round(hit.meters);
  const day = visitDayKey();
  const already = provenToday(temple, day);

  if (already) {
    // 오늘 이미 남긴 절 — 왔다고는 해 주되 공덕도 종이도 다시 주지 않는다
    return {
      ok: true,
      temple,
      meters,
      already: true,
      merit: 0,
      lotus: 0,
      grade: gradeFor(proofCount()),
      charmRose: false,
    };
  }

  writeRow({ at: Date.now(), temple, day });
  const { gained } = addMerit("temple");
  const grade = gradeFor(proofCount());
  const charmRose = grantCharm(CHARM, grade);

  // 올린 뒤에 돌려준다 — 화면이 곧바로 목록을 다시 부르면 내 줄이 보여야 한다
  const lotus = await pushProof(temple, spot);

  return { ok: true, temple, meters, already: false, merit: gained, grade, charmRose, lotus };
}

// ── 언제 다녀갔는가 ─────────────────────────────────────────

const DAY_MS = 86_400_000;
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);

/** "오늘 · 어제 · 사흘 전" — 시각까지는 안 적는다. 누가 몇 시에 절에 갔는지는 남의 일이다. */
export function daysAgoLabel(at: number): string {
  if (!at) return "";
  const n = Math.round((midnight(Date.now()) - midnight(at)) / DAY_MS);
  if (n <= 0) return "오늘";
  if (n === 1) return "어제";
  if (n < 30) return `${n}일 전`;
  return `${Math.floor(n / 30)}달 전`;
}
