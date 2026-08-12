// ─────────────────────────────────────────────────────────────
// 동기화 — 로그인하면 기록이 계정에 모인다.
// · 로그인 순간: 이 브라우저의 기록이 이 계정의 것일 때만 합친다
//   (다른 계정의 기록이 남아 있으면 합치지 않고 계정의 기록으로 갈아끼운다)
// · 그 후: 기록이 바뀔 때마다 조용히 계정으로 올린다 (0.8초 디바운스)
// · 로그아웃: 못 올린 변화를 마저 올린 뒤, 계정에 모인 기록은 이 기기에서 비운다
//   (로그인 전의 기록은 주인이 없으므로 그대로 둔다)
// ─────────────────────────────────────────────────────────────

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  applyRemoteStore,
  cleanupHistory,
  clearStore,
  emptyStore,
  loadStore,
  sessionKey,
  type Session,
  type Store,
} from "./store";
import { decrementHolding } from "./holding";

// Firestore는 undefined 값을 거부한다 — JSON 왕복으로 걷어낸다
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// 키 순서에 흔들리지 않는 직렬화.
// (Firestore 는 맵 필드를 알파벳순으로 돌려주므로 그냥 stringify 로 견주면
//  내용이 같아도 늘 다르게 보인다)
function canon(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0
        )
      );
    }
    return val;
  });
}

// 서버에서 온 것의 모양은 믿을 수 없다 — 최소한만 다듬는다
function normalize(raw: Store | null | undefined): Store | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    current: raw.current ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    received: typeof raw.received === "number" ? raw.received : 0,
  };
}

// 회향 기록은 합집합 — 어느 쪽에만 있는 글도 잃지 않는다 (로그인 순간에만 쓴다)
function mergeHistory(older: Session[], newer: Session[]): Session[] {
  const map = new Map<string, Session>();
  for (const s of [...older, ...newer]) map.set(sessionKey(s), s);
  return [...map.values()].sort((a, b) => a.receivedAt - b.receivedAt);
}

// 두 기록을 합친다 — 회향 기록은 합집합, 진행 중인 화두는 이 기기 우선.
// 합친 뒤 청소를 지나므로, 어느 쪽에 쌓였던 중복·체험 기록도 되살아나지 않는다.
function mergeStores(local: Store, cloud: Store | null): Store {
  if (!cloud) return local;
  const history = cleanupHistory(mergeHistory(cloud.history, local.history));
  return {
    current: local.current ?? cloud.current ?? null,
    history,
    received: Math.max(local.received, cloud.received, history.length),
    defaultDays: local.defaultDays ?? cloud.defaultDays,
    audience: local.audience ?? cloud.audience,
  };
}

// 다른 기기의 기록을 받아들인다 — 회향 기록은 원격을 그대로 따른다.
// 합집합이 아니다: 합치면 지운 기록이 스냅샷마다 부활한다 — 삭제가 이겨야 한다.
// (pendingLocal 가드가 있어 내 변화가 서버에 확정되기 전에는 이 함수까지
//  오지 않으므로, 이 기기에만 있던 회향이 유실될 걱정은 없다)
function adoptRemote(remote: Store, local: Store): Store {
  const next: Store = {
    ...remote,
    history: cleanupHistory(remote.history),
  };
  const r = remote.current;
  const l = local.current;
  // 같은 화두를 양쪽에서 보고 있다면, 쓰던 글이 짧아지는 일은 없게 한다
  if (r && l && sessionKey(r) === sessionKey(l)) {
    next.current = {
      ...r,
      notes: (l.notes?.length ?? 0) > (r.notes?.length ?? 0) ? l.notes : r.notes,
      journal: r.journal ?? l.journal,
      journalAt: r.journalAt ?? l.journalAt,
    };
  }
  next.received = Math.max(remote.received, local.received, next.history.length);
  return next;
}

// 텅 비고 주인도 없는 기록 — 로그아웃으로 비운 자리다.
// 이런 것은 계정으로 올리지 않는다 (다른 탭을 타고 계정의 기록을 지우지 않도록)
function isBlank(s: Store): boolean {
  return (
    !s.current &&
    s.history.length === 0 &&
    s.received === 0 &&
    s.ownerUid === undefined
  );
}

// 들고 있던 화두가 갈리면 참구 인원을 맞춘다
// (이 기기가 센 화두만 빠진다 — holding.ts 의 장부가 지켜 준다)
function releaseHolding(before: Store, after: Store) {
  const prev = before.current?.hwaduId;
  if (prev && prev !== after.current?.hwaduId) decrementHolding(prev);
}

let stopPush: (() => void) | null = null;
let flushPush: (() => Promise<void>) | null = null;
let syncingUid: string | null = null;
let generation = 0;

async function startSync(uid: string) {
  if (syncingUid === uid) return; // 이미 이 계정을 지켜보고 있다
  syncingUid = uid;
  const gen = ++generation;

  // 앞 계정의 못 올린 변화를 마저 올리고 나서 손을 뗀다
  await flushPush?.();
  if (gen !== generation) return; // 그사이 또 계정이 바뀌었다
  stopPushing();

  const ref = doc(db, "users", uid);

  // 1) 합치기 — 이 브라우저의 기록이 이 계정의 것일 때만
  const snap = await getDoc(ref);
  if (gen !== generation) return;
  const cloud = normalize(snap.exists() ? (snap.data().store as Store) : null);
  const local = loadStore();
  const mine = local.ownerUid === undefined || local.ownerUid === uid;
  const merged: Store = mine
    ? { ...mergeStores(local, cloud), ownerUid: uid }
    : // 앞사람의 기록이다 — 합치지 않고 이 계정의 것으로 갈아끼운다
      { ...(cloud ?? emptyStore()), ownerUid: uid };
  if (!mine) releaseHolding(local, merged);
  // remote 로 알린다 — 열려 있는 화면들이 합쳐진 기록을 곧바로 다시 읽게.
  // (화면이 옛 기록을 쥔 채로 있으면 다음 저장 때 합친 것이 되돌아간다)
  applyRemoteStore(merged);

  // 2) 합친 기록과 이후의 변화를 계정으로 (디바운스)
  //    — 다른 기기에서 온 변화(remote)는 다시 올리지 않는다 (메아리 방지)
  //    — 내 변화가 아직 서버에 반영되기 전에는 원격 갱신을 막는다 (경쟁 상태 방지)
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingLocal = false; // 내 변화가 서버에 확정될 때까지 true
  let inFlight: Promise<void> | null = null;
  let pushSeq = 0;

  const push = (store: Store): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (isBlank(store)) {
      pendingLocal = false;
      return Promise.resolve();
    }
    pendingLocal = true;
    const seq = ++pushSeq;
    inFlight = (async () => {
      try {
        await setDoc(
          ref,
          { store: clean(store), updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch {
        /* 실패해도 잠금은 풀어 준다 */
      }
      if (seq === pushSeq) {
        pendingLocal = false;
        inFlight = null;
      }
    })();
    return inFlight;
  };

  // 합친 기록을 계정에 올린다 — 기다리지 않는다
  // (연결이 없으면 Firestore 가 쥐고 있다가 이어질 때 올린다)
  void push(merged);

  const handler = (e: Event) => {
    const source = (e as CustomEvent).detail?.source;
    if (source === "remote") return;
    pendingLocal = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void push(loadStore());
    }, 800);
  };
  window.addEventListener("hwadoo-store-updated", handler);

  // 3) 다른 기기의 변화를 실시간으로 받는다
  //    (폰에서 화두를 받으면, PC 화면에도 곧바로 나타난다)
  const unsubscribeSnapshot = onSnapshot(ref, (snap) => {
    if (snap.metadata.hasPendingWrites) return; // 내가 방금 쓴 것의 메아리
    if (pendingLocal) return; // 내 변화가 아직 안 올라감 — 덮어쓰지 않는다
    const remote = normalize(snap.exists() ? (snap.data().store as Store) : null);
    if (!remote) return;
    const local = loadStore();
    if (local.ownerUid !== undefined && local.ownerUid !== uid) return; // 남의 기록
    const next: Store = { ...adoptRemote(remote, local), ownerUid: uid };
    if (canon(next) === canon(local)) return;
    releaseHolding(local, next);
    applyRemoteStore(next);
    // 이 기기에만 있던 글을 지켜냈다면, 그것도 계정에 올려 둔다
    if (canon(clean(next)) !== canon(remote)) void push(next);
  });

  stopPush = () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener("hwadoo-store-updated", handler);
    unsubscribeSnapshot();
  };
  flushPush = async () => {
    if (timer) push(loadStore());
    if (inFlight) await inFlight;
  };
}

function stopPushing() {
  stopPush?.();
  stopPush = null;
  flushPush = null;
}

// 동기화를 완전히 멈춘다 — 진행 중이던 startSync 도 무효로 만든다
function stopSync() {
  syncingUid = null;
  generation++;
  stopPushing();
}

// ── 컴포넌트에서 쓰는 세 가지 ──────────────────────────────

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      // 여러 화면이 저마다 부르더라도 계정당 한 번만 시작한다
      startSync(user.uid).catch(() => {
        /* Firestore 준비 전이면 로그인만 유지 */
        if (syncingUid === user.uid) syncingUid = null;
      });
    } else {
      stopSync();
    }
    cb(user);
  });
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logout() {
  await flushPush?.(); // 아직 못 올린 마지막 글을 먼저 올린다
  stopSync();
  // 계정에 모인 기록은 이 기기에서 비운다 — 다음 사람에게 넘어가지 않도록.
  // (로그인 전에 쓰던 기록은 주인이 없으므로 그대로 둔다)
  const local = loadStore();
  if (local.ownerUid !== undefined) {
    releaseHolding(local, emptyStore());
    clearStore();
  }
  await signOut(auth);
}
