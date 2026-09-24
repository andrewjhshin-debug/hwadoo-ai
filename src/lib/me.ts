// ─────────────────────────────────────────────────────────────
// 나 — 법명(法名)과 얼굴.
//
// 산문에 들면 속명을 두고 새 이름을 받는다. 처음 들른 순간 하나를 받아
// 서랍에 적어 두고, 그 뒤로는 그것만 쓴다. 대신 **직접 고쳐 쓸 수 있다** —
// 받은 이름이 마음에 안 드는데 평생 그걸로 살라는 건 산문의 법도가
// 아니라 그냥 불편이다.
//
// 얼굴은 둘 중 하나를 고른다 —
//   나무(南無) 산에 사는 쪽 · 무(無) 도시에 사는 쪽.
// 안 고르면 법명에서 갈라 정해 준다(같은 이름은 늘 같은 얼굴).
//
// **법명은 사람의 것이지 기기의 것이 아니다.** 한동안 이 서랍은 브라우저
// 안에만 있었다 — 폰에서 이름을 고쳐도 노트북은 옛 이름을 그대로 들고
// 있었고, 심지어 저마다 다른 이름을 받아 쥐고 있었다. 로그인해 있으면
// 계정으로 올라가고 내려온다(sync.ts). 여기서는 그 오르내림에 필요한
// 것만 내어 준다 — 몰래 보기(peekMe) · 받아 적기(applyRemoteMe) ·
// 둘 중 누가 이기나(mergeMe).
// ─────────────────────────────────────────────────────────────

import { ANON_2, ANON_3, ANON_NAMES, LEGACY_ANON_NAMES } from "./anonName";

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

/**
 * 나 — 이름과 얼굴, 그리고 **언제 · 누가 정했나.**
 *
 * `chosen` 은 「사람이 직접 지었다」는 표다. 이게 없으면 그냥 받은 이름이다.
 * 기기끼리 견줄 때 이 표가 먼저고, 둘 다 표가 있으면 늦게 적은 쪽이 이긴다.
 * 얼굴도 따로 센다 — 폰에서 이름을 고치고 노트북에서 얼굴을 골랐다면
 * 둘 다 살아남아야 한다.
 */
export type Me = {
  name: string;
  face: FaceId;
  at: number;
  chosen?: boolean;
  faceAt?: number;
  faceChosen?: boolean;
};

/** 법명으로 쓸 수 있는 글자와 길이 */
export const NAME_MAX = 8;

/**
 * 쓸 만한 법명인가 — 한글·한자·영문·숫자만, 두 자 이상 여덟 자 이하.
 * 안 되면 까닭을 돌려준다(없으면 통과).
 */
export function nameProblem(raw: string): string | null {
  const v = raw.trim();
  if (v.length < 2) return "두 자 이상으로 지어 주세요";
  if (v.length > NAME_MAX) return `${NAME_MAX}자 이하로 지어 주세요`;
  if (!/^[가-힣ㄱ-ㆎ一-鿿 A-Za-z0-9]+$/.test(v))
    return "한글·한자·영문·숫자만 쓸 수 있어요";
  return null;
}

/** 얼굴을 안 골랐으면 이름에서 갈라 준다 — 같은 이름은 어느 기기서든 같은 얼굴 */
function faceFromName(name: string): FaceId {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? "namu" : "mu";
}

/** 새로 하나 받는다 */
export function pickMe(): Me {
  const name = ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];
  return { name, face: faceFromName(name), at: Date.now(), chosen: false };
}

// 받은 이름인가 손으로 쓴 이름인가 — **옛 목록까지 넣는다.**
// 목록을 통째로 갈았는데 여기에 옛 이름이 없으면, 옛 이름을 쓰던 사람이
// 갑자기 「손으로 지은 이름」으로 승격되어 다시 뽑아도 안 바뀐다.
const GIVEN = new Set([...ANON_NAMES, ...LEGACY_ANON_NAMES]);

/**
 * 서버에서 온 것도, 옛 서랍에서 나온 것도 모양은 믿을 수 없다 — 다듬는다.
 *
 * 표(chosen)가 아예 없는 것은 이 셈을 두기 전에 적힌 낡은 기록이다.
 * 그때는 지은 이름과 받은 이름을 가리지 않았다. 대신 **받은 이름
 * 백 가지에 없는 이름이면 사람이 손으로 쓴 것**이다 — 그렇게 되짚는다.
 * 안 그러면 폰에서 지어 둔 이름이 노트북이 받은 아무 이름에 밀린다.
 */
export function normalizeMe(raw: unknown): Me | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<Me>;
  if (typeof p.name !== "string" || !p.name) return null;
  return {
    name: p.name,
    face: p.face === "mu" ? "mu" : "namu",
    at: typeof p.at === "number" ? p.at : 0,
    chosen: typeof p.chosen === "boolean" ? p.chosen : !GIVEN.has(p.name),
    faceAt: typeof p.faceAt === "number" ? p.faceAt : 0,
    faceChosen: p.faceChosen === true,
  };
}

/** 같은 나인가 — 메아리를 걸러 낼 때 쓴다 */
export function sameMe(a: Me | null, b: Me | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.name === b.name &&
    a.face === b.face &&
    a.at === b.at &&
    (a.chosen === true) === (b.chosen === true) &&
    (a.faceAt ?? 0) === (b.faceAt ?? 0) &&
    (a.faceChosen === true) === (b.faceChosen === true)
  );
}

/**
 * 직접 정한 쪽이 이긴다. 둘 다 정했으면 늦게 정한 쪽이 이긴다.
 *
 * 비기면 **계정 쪽**이다. 이 기기를 세우면 두 기기가 서로 제 이름을
 * 밀어내며 끝없이 오간다 — 계정을 세워야 한 번 올라간 이름에서 멎는다.
 */
function localWins(lSet: boolean, lAt: number, cSet: boolean, cAt: number): boolean {
  if (lSet && cSet) return lAt > cAt;
  return lSet;
}

/**
 * 이 기기의 나와 계정의 나를 견준다.
 *
 * 이름과 얼굴을 **따로** 센다. 아무도 손대지 않은 이름끼리라면 계정 쪽을
 * 따른다 — 그래야 기기를 늘릴 때마다 새 이름이 튀어나오지 않는다.
 */
export function mergeMe(local: Me | null, cloud: Me | null): Me | null {
  if (!cloud) return local;
  if (!local) return cloud;
  const n = localWins(local.chosen === true, local.at, cloud.chosen === true, cloud.at)
    ? local
    : cloud;
  const f = localWins(
    local.faceChosen === true,
    local.faceAt ?? 0,
    cloud.faceChosen === true,
    cloud.faceAt ?? 0
  )
    ? local
    : cloud;
  const picked = local.faceChosen === true || cloud.faceChosen === true;
  return {
    name: n.name,
    at: n.at,
    chosen: n.chosen === true,
    // 아무도 얼굴을 안 골랐으면 이긴 이름에서 갈라 준다
    face: picked ? f.face : faceFromName(n.name),
    faceAt: picked ? f.faceAt ?? 0 : 0,
    faceChosen: picked,
  };
}

function write(me: Me, source: "local" | "remote") {
  window.localStorage.setItem(ME_KEY, JSON.stringify(me));
  window.dispatchEvent(new CustomEvent(ME_EVENT, { detail: { source } }));
}

/** 서랍만 본다 — 없으면 없는 대로. 새로 짓지 않는다 */
export function peekMe(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ME_KEY);
    return raw ? normalizeMe(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * 내 법명과 얼굴. 처음이면 그 자리에서 받아 적는다.
 * 서버에서는 아무것도 하지 않는다 — 붙고 난 뒤에 읽는다.
 */
export function loadMe(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const kept = peekMe();
    if (kept) return kept;
    const fresh = pickMe();
    window.localStorage.setItem(ME_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return null;
  }
}

/** 계정에서 내려온 나를 그대로 받아 적는다 — 이건 다시 올리지 않는다 */
export function applyRemoteMe(me: Me) {
  if (typeof window === "undefined") return;
  try {
    write(me, "remote");
  } catch {
    /* 못 적어도 수행은 이어진다 */
  }
}

/** 이 기기의 나를 비운다 — 다음 사람에게 넘어가지 않도록 */
export function resetMe() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ME_KEY);
    window.dispatchEvent(new CustomEvent(ME_EVENT, { detail: { source: "remote" } }));
  } catch {
    /* 지나간다 */
  }
}

/** 법명을 고쳐 쓴다. 쓸 수 없는 이름이면 까닭을 돌려준다 */
export function setName(raw: string): string | null {
  const bad = nameProblem(raw);
  if (bad) return bad;
  const me = loadMe();
  if (!me) return "지금은 이름을 적을 수 없어요";
  try {
    write({ ...me, name: raw.trim(), at: Date.now(), chosen: true }, "local");
  } catch {
    return "적지 못했어요 — 저장 공간을 확인해 주세요";
  }
  return null;
}

/**
 * 법명을 다시 받는다 — **받은 이름 그대로**(chosen 은 false 로 둔다).
 *
 * 형: 「남자는 보통 2글자 여자는 3글자」.
 * 陽 을 고른 사람에게는 두 글자에서, 陰 을 고른 사람에게는 세 글자에서
 * 뽑는다. 아직 안 골랐으면 통째로 섞어 뽑는다 — 묻지 않는다.
 *
 * setName 과 다르다. setName 은 **손으로 지은 것**이라 chosen 을 켠다.
 * 이건 받은 것이니 켜지 않는다 — 그래야 자리(受戒)의 뜻이 남는다.
 */
export function rerollName(kind?: "yang" | "eum"): string {
  const pool = kind === "yang" ? ANON_2 : kind === "eum" ? ANON_3 : ANON_NAMES;
  const me = loadMe();
  let name = pool[Math.floor(Math.random() * pool.length)];
  // 같은 이름이 또 나오면 한 번만 다시 — 눌렀는데 안 바뀌면 고장으로 읽힌다
  if (me && name === me.name && pool.length > 1) {
    name = pool[(pool.indexOf(name) + 1) % pool.length];
  }
  try {
    write({ ...(me ?? pickMe()), name, at: Date.now(), chosen: false }, "local");
  } catch {
    /* 못 적어도 이번 판은 바뀐다 */
  }
  return name;
}

/** 얼굴만 바꾼다 */
export function setFace(face: FaceId) {
  const me = loadMe();
  if (!me) return;
  try {
    write({ ...me, face, faceAt: Date.now(), faceChosen: true }, "local");
  } catch {
    // 못 적어도 수행은 이어진다
  }
}
