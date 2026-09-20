// ─────────────────────────────────────────────────────────────
// 초 공양(燭供養) — 등불 하나를 켜 두고 오는 일.
//
// 절에 가면 법당 한쪽에 초가 줄지어 탄다. 초마다 종이가 붙어 있고,
// 거기엔 남의 이름과 생년, 그리고 한 줄이 적혀 있다. 「우리 애 수능
// 잘 보게」 「어머니 건강하게」. 자기 이름을 적는 사람은 드물다 —
// 초는 원래 **남을 위해** 켜는 것이다.
//
// 그 자리를 그대로 옮겼다.
//   연꽃 한 송이 → 초 한 자루 → 이름·태어난 해·기원 한 줄 → 사흘 동안 탄다.
//
// 왜 사흘인가 — candleSpec.ts BURN_DAYS 에 적어 뒀다. 한때 49일이었다.
// 뜻은 사십구재가 맞는데 화면이 죽었다. 오래 타는 것보다 자주 오는 쪽.
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

import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { loadMe } from "./me";
import { anonName } from "./anonName";
import { loadStore } from "./store";
import { rankHanjaFor } from "./badges";
import {
  NAME_MAX,
  PAGE,
  WISH_MAX,
  type WishId,
} from "./candleSpec";

// 치수는 candleSpec.ts 에 있다 — /api/candle/light 도 같은 자를 쓴다.
// 여기서 그대로 다시 내보내므로 부르던 쪽은 손댈 것이 없다.
export {
  CANDLE_PRICE,
  BURN_DAYS,
  NAME_MAX,
  WISH_MAX,
  PAGE,
  WISHES,
  wishOf,
} from "./candleSpec";
export type { WishId } from "./candleSpec";

const DAY = 86_400_000;

export type Candle = {
  id: string;
  uid: string;
  /**
   * 「초」인가 「등」인가.
   *   candle — 연꽃 한 송이로 켠 초. 사흘. 기원문을 적는다.
   *   light  — 회향으로 켜진 등. 값이 안 들고 7일. 이름만 걸린다.
   * 회향은 원래 이름만 적고 사라졌다. 「그래서 그게 어디 걸리는데?」라는
   * 물음에 답할 자리가 없었다. 그 자리가 여기다 — 같은 법당, 아래 줄.
   */
  tier?: "candle";
  by: string; // 올린 사람 법명
  byHanja?: string | null; // 올린 사람 걸음 한 글자
  forName: string; // 누구를 위해
  born: string;
  kind: WishId;
  wish: string; // 사연
  visibility?: "private" | "public";
  lotusCost?: number;
  /** 이전 초 문서 호환용 — 새 흐름에서는 쓰지 않는다. */
  hapjang?: number;
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
 * 초를 올린다. 연꽃 한 송이가 나간다.
 *
 * 값을 치르는 일과 초를 세우는 일을 **서버가 한 트랜잭션에 묶는다**
 * (/api/candle/light). 예전에는 브라우저가 둘로 나눠 했다 —
 * 연꽃을 먼저 빼고 그다음 문서를 썼다. 그 사이에서 엎어지면 연꽃만
 * 사라졌고, wallets 규칙이 「본인은 1 감소만」이라 되돌릴 길도 없었다.
 * 실제로 candles 규칙이 콘솔에 안 올라가 있던 동안 그 일이 났다.
 * 이제 둘 다 되거나 둘 다 안 된다.
 *
 * 연꽃이 모자라면 아무것도 쓰지 않고 null 을 돌려준다(화면이 공양으로 안내한다).
 */
export async function lightCandle(
  d: {
    forName: string;
    wish: string;
    visibility: "private" | "public";
  },
  /**
   * 이 초 한 자루의 표. 같은 표로 두 번 보내면 서버가 두 번째를
   * 「이미 서 있다」로 끝낸다 — 답을 못 받고 다시 눌러도 연꽃은 한 송이만
   * 나간다. 화면이 창을 열 때 한 번 뽑아 두고 재시도에도 같은 것을 쓴다.
   */
  key: string
): Promise<{ id: string } | null> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");

  const forName = d.forName.trim().slice(0, NAME_MAX);
  const wish = d.wish.trim().slice(0, WISH_MAX);
  if (!wish) throw new Error("사연을 적어 주세요");

  const me = loadMe();
  const res = await fetch("/api/candle/light", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await u.getIdToken()}`,
    },
    body: JSON.stringify({
      forName,
      kind: "peace",
      wish,
      visibility: d.visibility,
      // 보이기용 — 서버가 길이만 깎아 그대로 적는다
      by: me?.name || anonName(),
      byHanja: rankHanjaFor(loadStore().history.length, u) ?? null,
      key,
    }),
  });

  // 연꽃이 모자란 것은 고장이 아니다 — 화면이 공양으로 안내한다
  if (res.status === 402) return null;
  if (!res.ok) {
    const why = await res.json().catch(() => ({}));
    throw new Error(`초를 세우지 못했습니다 (${why?.error ?? res.status})`);
  }
  const { id } = (await res.json()) as { id: string };
  return { id };
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
  return all.filter((c) => burning(c) && c.visibility === "public").slice(0, PAGE);
}

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
