// ─────────────────────────────────────────────────────────────
// 초 공양(燭供養) — 등불 하나를 켜 두고 오는 일.
//
// 절에 가면 법당 한쪽에 초가 줄지어 탄다. 초마다 종이가 붙어 있고,
// 거기엔 남의 이름과 생년, 그리고 한 줄이 적혀 있다. 「우리 애 수능
// 잘 보게」 「어머니 건강하게」. 자기 이름을 적는 사람은 드물다 —
// 초는 원래 **남을 위해** 켜는 것이다.
//
// 그 자리를 그대로 옮겼다.
//   연꽃 한 송이 → 초 한 자루 → 이름·태어난 해·기원 한 줄 → 49일 동안 탄다.
//
// 왜 49일인가 — 사십구재(七七齋)의 그 49다. 이레를 일곱 번.
// 한 달이면 짧고 백일이면 법당이 안 비운다. 49가 맞다.
//
// 공덕은 어디에 붙는가 —
// 초를 올리는 데는 **공덕을 주지 않는다.** 연꽃으로 이미 치렀고, 값을
// 치른 일에 또 상을 얹으면 공양이 아니라 거래가 된다.
// 대신 **남의 초 앞에서 같이 손을 모을 때** 공덕이 붙는다(merit: candle).
// 그게 이 자리에서 우리가 바라는 행동이다.
//
// 누가 무엇을 쓸 수 있는가 —
// 올린 사람의 법명은 적히지만 **기원문에 적힌 이름은 남의 것**이다.
// 그래서 태어난 해까지만 받고 생일·주소 같은 것은 받지 않는다.
// 지우는 것은 올린 사람과 뒷방만 할 수 있다(firestore.rules).
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { loadMe } from "./me";
import { anonName } from "./anonName";
import { loadStore } from "./store";
import { rankHanjaFor } from "./badges";
import { addMerit } from "./merit";
import { spendLotus } from "./dm";

/** 초 한 자루의 값 — 연꽃 */
export const CANDLE_PRICE = 1;

/** 초가 며칠 타는가 — 사십구재의 49 */
export const BURN_DAYS = 49;
/** 회향 등이 며칠 타는가 — 이레(七日). 초보다 짧고 값도 안 든다 */
export const LIGHT_DAYS = 7;
const DAY = 86_400_000;

export const NAME_MAX = 20;
export const WISH_MAX = 120;
/** 한 번에 받아 오는 자루 수 */
export const PAGE = 30;

/**
 * 무엇을 빌었는가 — 초의 빛깔이 갈린다.
 * 「기타」를 두지 않았다. 고르기 싫은 사람은 평안을 고르면 된다 —
 * 칸이 하나 더 있으면 다들 그 칸으로 도망가고 법당이 회색이 된다.
 */
export const WISHES = [
  { id: "health", label: "건강", hanja: "康", hue: 148, say: "아프지 않기를" },
  { id: "pass", label: "합격", hanja: "第", hue: 42, say: "붙기를" },
  { id: "peace", label: "평안", hanja: "安", hue: 28, say: "무탈하기를" },
  { id: "rest", label: "극락왕생", hanja: "往", hue: 268, say: "편히 가시기를" },
  { id: "mend", label: "화해", hanja: "和", hue: 200, say: "풀리기를" },
  { id: "luck", label: "뜻대로", hanja: "願", hue: 340, say: "이루어지기를" },
] as const;

export type WishId = (typeof WISHES)[number]["id"];

export function wishOf(id: string) {
  return WISHES.find((w) => w.id === id) ?? WISHES[2];
}

export type Candle = {
  id: string;
  uid: string;
  /**
   * 「초」인가 「등」인가.
   *   candle — 연꽃 한 송이로 켠 초. 49일. 기원문을 적는다.
   *   light  — 회향으로 켜진 등. 값이 안 들고 7일. 이름만 걸린다.
   * 회향은 원래 이름만 적고 사라졌다. 「그래서 그게 어디 걸리는데?」라는
   * 물음에 답할 자리가 없었다. 그 자리가 여기다 — 같은 법당, 아래 줄.
   */
  tier?: "candle" | "light";
  by: string; // 올린 사람 법명
  byHanja?: string | null; // 올린 사람 걸음 한 글자
  forName: string; // 누구를 위해
  born: string; // 태어난 해 — "" 이면 안 적은 것
  kind: WishId;
  wish: string; // 기원 한 줄
  hapjang: number; // 같이 빌어 준 수
  until: number; // 언제 꺼지는가 (밀리초)
  createdAt?: { seconds: number };
};

/** 아직 타고 있는가 */
export function burning(c: Candle): boolean {
  return c.until > Date.now();
}

/** 며칠 남았나 — 꺼졌으면 0 */
export function daysLeft(c: Candle): number {
  return Math.max(0, Math.ceil((c.until - Date.now()) / DAY));
}

/**
 * 초를 올린다. 연꽃 한 송이가 나간다 —
 * **연꽃부터 거두고** 글을 적는다. 반대로 하면 글만 남고 값을 못 받는 수가 있다.
 * 연꽃이 모자라면 아무것도 쓰지 않고 null 을 돌려준다(화면이 공양으로 안내한다).
 */
export async function lightCandle(d: {
  forName: string;
  born: string;
  kind: WishId;
  wish: string;
}): Promise<{ id: string } | null> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");

  const forName = d.forName.trim().slice(0, NAME_MAX);
  const wish = d.wish.trim().slice(0, WISH_MAX);
  // 태어난 해 — 숫자 넷만. 「1984년생」이라 적어도 1984 만 남긴다.
  const born = (d.born.match(/\d{4}/)?.[0] ?? "").slice(0, 4);
  if (!forName || !wish) throw new Error("이름과 기원을 적어 주세요");

  if (!(await spendLotus())) return null;

  const me = loadMe();
  const ref = await addDoc(collection(db, "candles"), {
    tier: "candle",
    uid: u.uid,
    by: me?.name || anonName(),
    byHanja: rankHanjaFor(loadStore().history.length, u) ?? null,
    forName,
    born,
    kind: d.kind,
    wish,
    hapjang: 0,
    until: Date.now() + BURN_DAYS * DAY,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

/**
 * 회향의 등을 건다 — 공덕을 돌릴 때 settings 가 부른다.
 * 값은 안 든다(회향은 공짜다). 대신 이레만 탄다.
 * 실패해도 회향 자체는 이미 끝난 일이라 던지지 않고 삼킨다 —
 * 등을 못 걸었다고 돌린 공덕을 되돌릴 수는 없다.
 */
export async function hangLight(forName: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;
  const name = forName.trim().slice(0, NAME_MAX);
  if (!name) return;
  const me = loadMe();
  try {
    await addDoc(collection(db, "candles"), {
      tier: "light",
      uid: u.uid,
      by: me?.name || anonName(),
      byHanja: rankHanjaFor(loadStore().history.length, u) ?? null,
      forName: name,
      born: "",
      kind: "peace" as WishId,
      wish: "",
      hapjang: 0,
      until: Date.now() + LIGHT_DAYS * DAY,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // 등은 덤이라 회향 자체를 되돌리지는 않는다. 그래도 **아무 자국도
    // 안 남기면 안 된다** — 규칙이 막혀 등이 한 번도 안 걸린 적이 있었는데
    // 통째로 삼키느라 아무도 몰랐다.
    console.warn("[candle] 회향 등을 걸지 못했습니다", e);
  }
}

/**
 * 타고 있는 초들. 꺼진 것은 서버가 지우지 않는다 — 읽어 와서 걸러 낸다.
 * (하루 한 번 도는 청소기를 두느니, 목록이 한 번 더 세는 편이 싸다)
 */
export async function fetchCandles(): Promise<Candle[]> {
  const snap = await getDocs(
    query(collection(db, "candles"), orderBy("createdAt", "desc"), limit(PAGE * 2))
  );
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Candle, "id">) }));
  return all.filter(burning).slice(0, PAGE);
}

/** 초만 · 등만 갈라 본다 (tier 가 없는 옛 문서는 초로 친다) */
export const isLight = (c: Candle) => c.tier === "light";

/** 내가 올린 초 — 꺼진 것까지 다 보여 준다. 내 기록이니까. */
export async function fetchMyCandles(): Promise<Candle[]> {
  const u = auth.currentUser;
  if (!u) return [];
  const snap = await getDocs(
    query(collection(db, "candles"), where("uid", "==", u.uid), limit(PAGE))
  );
  const mine = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Candle, "id">) }));
  // 색인을 하나 더 만들지 않으려고 정렬은 여기서 한다(내 것은 많아야 몇 십 개다)
  return mine.sort((a, b) => b.until - a.until);
}

/**
 * 초를 내린다 — 올린 사람과 뒷방 주인만(firestore.rules 가 같은 줄로 막는다).
 * 법당은 남의 이름이 걸리는 자리라 욕설·장난은 바로 치울 수 있어야 한다.
 */
export async function removeCandle(id: string): Promise<void> {
  await deleteDoc(doc(db, "candles", id));
}

/**
 * 같이 빌어 준다 — 남의 초에만. 내 초에 내가 손 모으는 건 셈이 아니다.
 * 돌려주는 값은 이번에 붙은 공덕(0 이면 오늘 몫을 다 쓴 것).
 *
 * 한 초에 한 번뿐이다. 없으면 같은 초를 스무 번 눌러 천장을 긁는다 —
 * 그건 비는 게 아니라 단추 누르기다. 장부는 이 브라우저에 적는다
 * (서버에 사람마다 표를 만들면 문서가 초 수 × 사람 수로 불어난다).
 */
const PRAYED_KEY = "hwadu.candle.prayed.v1";

function prayedSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(PRAYED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** 이 초에 이미 손을 모았는가 */
export function alreadyPrayed(id: string): boolean {
  if (typeof window === "undefined") return false;
  return prayedSet().has(id);
}

export async function prayWith(c: Candle): Promise<number> {
  const u = auth.currentUser;
  if (!u || u.uid === c.uid) return 0;
  if (alreadyPrayed(c.id)) return 0;
  await updateDoc(doc(db, "candles", c.id), { hapjang: increment(1) });
  try {
    const set = prayedSet();
    set.add(c.id);
    // 꺼진 초까지 이고 갈 일은 없다 — 뒤에서부터 오백 개만 남긴다
    window.localStorage.setItem(PRAYED_KEY, JSON.stringify([...set].slice(-500)));
  } catch {
    /* 서랍이 막혀 있어도 빈 일은 빈 일이다 */
  }
  return addMerit("candle").gained;
}
