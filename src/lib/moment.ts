// ─────────────────────────────────────────────────────────────
// 모멘트(moment) — 절에 다녀온 한 장.
//
// 「절에 왔어요」는 발이 대답한다(GPS, templeProof.ts). 그건 장부다.
// 모멘트는 그 장부에 **얼굴**을 붙이는 자리다 — 사진 한 장, 어디였는지,
// 가서 무엇을 했는지 두어 줄, 그리고 해시태그.
//
// 왜 따로 두는가 —
// 연지원의 글은 '말'이고 모멘트는 '장면'이다. 같은 목록에 섞으면
// 글은 사진에 묻히고 사진은 글에 끼인다. 그래서 판을 갈랐다.
// 격자는 크림(KREAM)처럼 두 칸, 사진이 먼저 오고 말은 아래 작게.
//
// 사진은 어디에 두는가 —
// Firebase Storage 를 켜지 않고 간다. 켜려면 콘솔 작업이 또 늘고,
// 그만큼 이 기능이 늦어진다. 대신 **두 칸으로 나눠** Firestore 에 적는다:
//   moments/{id}        — 글·해시태그 + 섬네일(작은 그림)  ← 목록이 읽는 것
//   moment-photos/{id}  — 큰 그림 한 장                    ← 열었을 때만 읽는 것
// 목록 스무 장을 받아도 1MB 를 넘지 않는다. 문서 한 칸의 천장(1MiB)도
// 큰 그림 쪽에서만 닿을 수 있는데, 거기 들어가기 전에 우리가 줄여 둔다.
//
// 위치가 맞으면 도장이 찍힌다 —
// 올리는 순간 좌표를 재서 절에서 500m 안이면 「인증」. 아니면 도장 없이
// 그냥 걸린다. 도장이 없다고 못 거는 건 아니다 — 못 잰 날도 있으니까.
// 대신 공덕은 도장이 있을 때 한 번 더 얹는다.
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { loadMe } from "./me";
import { anonName } from "./anonName";
import { addMerit } from "./merit";
import { rankHanjaFor } from "./badges";
import { loadStore } from "./store";
import { here, type Spot } from "./templeProof";

// ── 크기의 약속 ──────────────────────────────────────────────

/** 목록에 깔리는 작은 그림 — 긴 변 이만큼 */
const THUMB_SIDE = 560;
/** 열었을 때 보는 큰 그림 — 긴 변 이만큼 */
const PHOTO_SIDE = 1280;
/** 큰 그림이 이보다 크면 더 줄인다 (Firestore 문서 천장은 1MiB) */
const PHOTO_MAX_BYTES = 620_000;

/** 한 번에 받아 오는 장수 */
export const PAGE = 24;

/** 글은 짧게 — 사진이 말을 다 한다 */
export const WHAT_MAX = 200;
/** 해시태그는 다섯 개까지 */
export const TAG_MAX = 5;
/** 태그 한 개의 길이 */
export const TAG_LEN = 14;

/** 위치가 맞았을 때 더 얹는 공덕 (addMerit 한 번을 더 부른다) */
const VERIFIED_BONUS = 1;

export type Moment = {
  id: string;
  uid: string;
  name: string; // 법명
  face?: string | null; // 얼굴(namu·mu) — 없으면 안 그린다
  rankHanja?: string | null; // 걸음 한 글자
  place: string; // 어디 — 절 이름
  what: string; // 와서 무엇을 했나
  tags: string[]; // 해시태그 (# 없이 낱말만 담는다)
  thumb: string; // 작은 그림 (data URL)
  ratio: number; // 가로÷세로 — 자리를 미리 잡아 화면이 튀지 않게
  verified?: boolean; // 그 자리에서 올렸는가
  meters?: number | null; // 절에서 몇 m 였는가 (인증일 때만)
  hapjang: number;
  deleted?: boolean;
  createdAt?: { seconds: number };
};

// ── 그림 줄이기 ──────────────────────────────────────────────

/** 파일을 <img> 로 읽는다 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      no(new Error("사진을 열 수 없습니다"));
    };
    img.src = url;
  });
}

/** 긴 변을 side 로 맞춰 JPEG data URL 로 굽는다 */
function bake(img: HTMLImageElement, side: number, quality: number): string {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("사진을 줄일 수 없습니다");
  // 사진은 투명이 없다 — 먹빛을 깔아 두면 알파 있는 PNG 도 곱게 앉는다
  g.fillStyle = "#0d0b09";
  g.fillRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

/**
 * 고른 사진을 목록용·본판용 두 벌로 굽는다.
 * 본판이 천장을 넘으면 품질을 한 단 낮춰 다시 굽는다 — 세 번까지.
 */
export async function shrink(file: File): Promise<{
  thumb: string;
  photo: string;
  ratio: number;
}> {
  const img = await loadImage(file);
  const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const thumb = bake(img, THUMB_SIDE, 0.62);
  let photo = bake(img, PHOTO_SIDE, 0.78);
  for (const q of [0.66, 0.56, 0.46]) {
    if (photo.length <= PHOTO_MAX_BYTES) break;
    photo = bake(img, PHOTO_SIDE, q);
  }
  // 그래도 크면 그림 자체를 줄인다
  if (photo.length > PHOTO_MAX_BYTES) photo = bake(img, 900, 0.6);
  return { thumb, photo, ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1 };
}

// ── 해시태그 ────────────────────────────────────────────────

/** 자주 쓰일 것들 — 눌러서 넣는다 */
export const TAG_SUGGEST = [
  "절에왔어요",
  "템플스테이",
  "새벽예불",
  "삼배",
  "백팔배",
  "탑돌이",
  "연등",
  "공양",
  "산사",
  "단풍",
  "설경",
  "혼자절",
];

/**
 * 사람이 친 태그 줄을 낱말 목록으로.
 * "#절에왔어요 #봉은사" 도 "절에왔어요, 봉은사" 도 같게 읽는다.
 */
export function parseTags(raw: string): string[] {
  const out: string[] = [];
  for (const piece of raw.split(/[\s,·]+/)) {
    const t = piece.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!t) continue;
    const cut = t.slice(0, TAG_LEN);
    if (!out.includes(cut)) out.push(cut);
    if (out.length >= TAG_MAX) break;
  }
  return out;
}

// ── 올리기 ──────────────────────────────────────────────────

export type MomentDraft = {
  file: File;
  place: string; // 어디 (절 이름)
  what: string; // 무엇을 했나
  tags: string[];
  /** 화면이 이미 재 둔 좌표 — 있으면 다시 묻지 않는다 */
  spot?: Spot | null;
};

export type MomentPosted = {
  id: string;
  verified: boolean;
  meters: number | null;
  merit: number; // 이번에 쌓인 공덕
};

/**
 * 서버에 도장을 청한다 — 좌표를 다시 재어 절 앞이면 verified 를 뒤집어 준다.
 * 실패하면 null. 도장이 없다고 글이 안 걸리는 것은 아니다.
 */
async function askStamp(
  id: string,
  spot: Spot
): Promise<{ temple: string; meters: number } | null> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;
    const r = await fetch("/api/moment-stamp", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, lat: spot.lat, lng: spot.lng }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { ok?: boolean; temple?: string; meters?: number };
    return j.ok ? { temple: j.temple ?? "", meters: j.meters ?? 0 } : null;
  } catch {
    return null;
  }
}

/**
 * 모멘트를 건다.
 * 좌표는 **있으면** 쓴다 — 거절해도 올라간다. 도장만 안 찍힐 뿐이다.
 */
export async function createMoment(d: MomentDraft): Promise<MomentPosted> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");

  const place = d.place.trim().slice(0, 30);
  const what = d.what.trim().slice(0, WHAT_MAX);
  if (!place) throw new Error("어느 절이었는지 적어 주십시오");
  if (!what) throw new Error("무엇을 하셨는지 한 줄 적어 주십시오");
  if (/https?:\/\//i.test(what)) throw new Error("시절인연에는 링크를 실을 수 없습니다");

  const { thumb, photo, ratio } = await shrink(d.file);

  // 위치 — 못 재면 못 잰 대로 간다. 도장은 여기서 찍지 않는다(서버의 몫).
  const spot = d.spot ?? (await here().catch(() => null));

  const me = loadMe();
  const ref = await addDoc(collection(db, "moments"), {
    uid: u.uid,
    name: me?.name || anonName(),
    face: me?.face ?? null,
    rankHanja: rankHanjaFor(loadStore().history.length, u) ?? null,
    place,
    what,
    tags: d.tags.slice(0, TAG_MAX),
    thumb,
    ratio,
    verified: false, // 도장은 서버만 뒤집는다 (firestore.rules 가 막아 둔다)
    meters: null,
    hapjang: 0,
    createdAt: serverTimestamp(),
  });
  // 큰 그림은 같은 이름의 다른 칸에 — 목록이 이걸 읽지 않게
  await setDoc(doc(db, "moment-photos", ref.id), { uid: u.uid, photo });

  // 도장 — 서버가 좌표를 다시 재어 찍는다. 못 찍혀도 글은 이미 걸렸다.
  const stamp = spot ? await askStamp(ref.id, spot) : null;
  const verified = !!stamp;
  const meters = stamp?.meters ?? null;

  // 공덕 — 걸면 한 몫, 그 자리에서 걸었으면 한 몫 더.
  // 몫은 둘이어도 **사진은 한 장**이다. 세는 수(셋째 인자)를 0 으로 넘겨
  // 덤이 횟수를 안 올리게 한다 — 안 그러면 칩에 「시절인연 2번」이 뜬다.
  let merit = addMerit("moment").gained;
  if (verified) {
    for (let i = 0; i < VERIFIED_BONUS; i++) merit += addMerit("moment", 1, 0).gained;
  }
  return { id: ref.id, verified, meters, merit };
}

// ── 읽기 ────────────────────────────────────────────────────

export async function fetchMoments(tag?: string): Promise<Moment[]> {
  try {
    const q = tag
      ? query(
          collection(db, "moments"),
          where("tags", "array-contains", tag),
          orderBy("createdAt", "desc"),
          limit(PAGE)
        )
      : query(collection(db, "moments"), orderBy("createdAt", "desc"), limit(PAGE));
    const snap = await getDocs(q);
    return snap.docs.map((x) => ({ id: x.id, ...x.data() }) as Moment);
  } catch {
    return [];
  }
}

/** 큰 그림 — 열었을 때만 부른다 */
export async function fetchPhoto(id: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "moment-photos", id));
    const p = snap.data()?.photo;
    return typeof p === "string" ? p : null;
  } catch {
    return null;
  }
}

// ── 합장 — 계정당 한 번, 토글 ────────────────────────────────

export async function fetchMyBow(id: string): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    return (await getDoc(doc(db, "moments", id, "likes", u.uid))).exists();
  } catch {
    return false;
  }
}

export async function bowMoment(id: string, on: boolean): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  const ref = doc(db, "moments", id, "likes", u.uid);
  const has = (await getDoc(ref)).exists();
  if (on === has) return;
  if (on) await setDoc(ref, { createdAt: serverTimestamp() });
  else await deleteDoc(ref);
  await updateDoc(doc(db, "moments", id), { hapjang: increment(on ? 1 : -1) });
}

/** 내린다 — 그림까지 지운다. 사진은 자리만 남길 이유가 없다. */
export async function deleteMoment(id: string): Promise<void> {
  await deleteDoc(doc(db, "moments", id)).catch(() => {});
  await deleteDoc(doc(db, "moment-photos", id)).catch(() => {});
}

// ── 때 ──────────────────────────────────────────────────────

export function whenLabel(sec?: number): string {
  if (!sec) return "";
  const gap = Date.now() / 1000 - sec;
  if (gap < 3600) return `${Math.max(1, Math.floor(gap / 60))}분 전`;
  if (gap < 86400) return `${Math.floor(gap / 3600)}시간 전`;
  if (gap < 86400 * 7) return `${Math.floor(gap / 86400)}일 전`;
  const d = new Date(sec * 1000);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}
