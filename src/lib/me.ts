// ─────────────────────────────────────────────────────────────
// 나 — 법명(法名)과 얼굴.
//
// 산문에 들면 속명을 두고 새 이름을 받는다. 그 이름은 **한 번 정해지면
// 바뀌지 않는다** — 매번 새 이름이 나오면 그건 이름이 아니라 가면이다.
// 처음 들른 순간 하나를 받아 서랍에 적어 두고, 그 뒤로는 그것만 쓴다.
//
// 얼굴은 둘 중 하나를 고른다 —
//   나무(南無) 산에 사는 쪽 · 무(無) 도시에 사는 쪽.
// 안 고르면 법명에서 갈라 정해 준다(같은 사람은 늘 같은 얼굴).
// ─────────────────────────────────────────────────────────────

import { ANON_NAMES } from "./anonName";

export const ME_KEY = "hwadu.me.v1";
export const ME_EVENT = "hwadu-me-updated";

export type FaceId = "namu" | "mu";

export const FACES: { id: FaceId; name: string; hanja: string; say: string; src: string }[] = [
  {
    id: "namu",
    name: "나무",
    hanja: "南無",
    say: "산에 사는 쪽 — 기대어 갑니다",
    src: "/twin/avatar-namu.png",
  },
  {
    id: "mu",
    name: "무",
    hanja: "無",
    say: "도시에 사는 쪽 — 비우고 갑니다",
    src: "/twin/avatar-mu.png",
  },
];

export const FACE_BY_ID: Record<FaceId, (typeof FACES)[number]> = Object.fromEntries(
  FACES.map((f) => [f.id, f])
) as Record<FaceId, (typeof FACES)[number]>;

type Me = { name: string; face: FaceId; at: number };

function pick(): Me {
  const name = ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];
  // 얼굴은 법명에서 갈라 정한다 — 고르지 않아도 사람마다 갈리게
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return { name, face: h % 2 === 0 ? "namu" : "mu", at: Date.now() };
}

/**
 * 내 법명과 얼굴. 처음이면 그 자리에서 받아 적는다.
 * 서버에서는 아무것도 하지 않는다 — 서랍은 브라우저에만 있다.
 */
export function loadMe(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ME_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Me>;
      if (typeof p.name === "string" && p.name) {
        const face: FaceId = p.face === "mu" ? "mu" : "namu";
        return { name: p.name, face, at: typeof p.at === "number" ? p.at : Date.now() };
      }
    }
    const fresh = pick();
    window.localStorage.setItem(ME_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return null;
  }
}

/** 얼굴만 바꾼다 — 법명은 바꾸지 않는다 */
export function setFace(face: FaceId) {
  const me = loadMe();
  if (!me) return;
  const next = { ...me, face };
  try {
    window.localStorage.setItem(ME_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ME_EVENT));
  } catch {
    // 못 적어도 수행은 이어진다
  }
}
