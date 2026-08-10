// ─────────────────────────────────────────────────────────────
// 동기화 — 로그인하면 기록이 계정에 모인다.
// · 로그인 순간: 이 브라우저의 기록과 계정의 기록을 합친다
// · 그 후: 기록이 바뀔 때마다 조용히 계정으로 올린다 (0.8초 디바운스)
// · 로그아웃해도 브라우저 기록은 그대로 남는다
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
  loadStore,
  saveStore,
  type Session,
  type Store,
} from "./store";

// Firestore는 undefined 값을 거부한다 — JSON 왕복으로 걷어낸다
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// 두 기록을 합친다 — 회향 기록은 합집합, 진행 중인 화두는 이 기기 우선
function mergeStores(local: Store, cloud: Store | null): Store {
  if (!cloud) return local;
  const key = (s: Session) => `${s.hwaduId}-${s.receivedAt}`;
  const map = new Map<string, Session>();
  for (const s of [...cloud.history, ...local.history]) map.set(key(s), s);
  const history = [...map.values()].sort((a, b) => a.receivedAt - b.receivedAt);
  return {
    current: local.current ?? cloud.current ?? null,
    history,
    received: Math.max(local.received, cloud.received, history.length),
    defaultDays: local.defaultDays ?? cloud.defaultDays,
  };
}

let stopPush: (() => void) | null = null;

async function startSync(uid: string) {
  const ref = doc(db, "users", uid);

  // 1) 합치기
  const snap = await getDoc(ref);
  const cloud = snap.exists() ? ((snap.data().store as Store) ?? null) : null;
  const merged = mergeStores(loadStore(), cloud);
  saveStore(merged);
  await setDoc(
    ref,
    { store: clean(merged), updatedAt: serverTimestamp() },
    { merge: true }
  );

  // 2) 이후의 변화를 계정으로 (디바운스)
  //    — 다른 기기에서 온 변화(remote)는 다시 올리지 않는다 (메아리 방지)
  stopPushing();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handler = (e: Event) => {
    const source = (e as CustomEvent).detail?.source;
    if (source === "remote") return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      setDoc(
        ref,
        { store: clean(loadStore()), updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {
        /* 오프라인 등 — 다음 변화 때 다시 시도된다 */
      });
    }, 800);
  };
  window.addEventListener("hwadoo-store-updated", handler);

  // 3) 다른 기기의 변화를 실시간으로 받는다
  //    (폰에서 화두를 받으면, PC 화면에도 곧바로 나타난다)
  const unsubscribeSnapshot = onSnapshot(ref, (snap) => {
    if (snap.metadata.hasPendingWrites) return; // 내가 방금 쓴 것의 메아리
    const remote = snap.exists() ? ((snap.data().store as Store) ?? null) : null;
    if (!remote) return;
    if (JSON.stringify(remote) === JSON.stringify(loadStore())) return;
    applyRemoteStore(remote);
  });

  stopPush = () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener("hwadoo-store-updated", handler);
    unsubscribeSnapshot();
  };
}

function stopPushing() {
  stopPush?.();
  stopPush = null;
}

// ── 컴포넌트에서 쓰는 세 가지 ──────────────────────────────

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      startSync(user.uid).catch(() => {
        /* Firestore 준비 전이면 로그인만 유지 */
      });
    } else {
      stopPushing();
    }
    cb(user);
  });
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logout() {
  stopPushing();
  await signOut(auth);
}
