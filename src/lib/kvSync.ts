// ─────────────────────────────────────────────────────────────
// 나머지 서랍 동기화 — 이 기기 localStorage 의 화두 칸을 **통째로** 계정에 싣는다.
//
// 형: 「왜 또 웹에 있는 거 다 모바일이랑 연동 안 됨. 고치고 앞으로 안 그러도록」
//
// 여태 계정으로 오르내리는 것은 sync.ts 가 손으로 고른 다섯(서랍·법명·공덕·하루·오색실)
// 뿐이었다. 염주 살갗, 돌탑, 만다라, 경 외우기, 불심투자, 부적… 새 방이 생길 때마다
// 그 방의 기록은 그 기기에만 남았다. 방마다 길을 따로 내면 다음 방에서 또 잊는다.
//
// 그래서 **고르지 않고 빼는** 쪽으로 간다 — `hwadu.` · `hwadoo-` 로 시작하는 칸은
// 아래 DENY(따로 오르내리는 것, 이 기기에만 맞는 것)가 아니면 전부 올라간다.
// 새 방이 새 칸을 만들어도 저절로 따라온다. 그래서 「앞으로」도 안 샌다.
//
// 칸마다 「언제 썼나」를 적어 두고(hwadu.kv.stamp), 늦게 쓴 쪽이 이긴다.
// ponytail: 칸 단위 나중-쓴-쪽-승리 — 두 기기에서 동시에 오프라인으로 센 숫자는
// 한쪽이 진다. 그런 칸이 생기면 merit.ts 처럼 그 칸만 합치기를 따로 둔다.
// ─────────────────────────────────────────────────────────────

import { setDoc, type DocumentReference } from "firebase/firestore";

const STAMP_KEY = "hwadu.kv.stamp";
const DENY = [
  // sync.ts 가 제 길로 합치는 것 — 여기서 또 실으면 덮어쓴다
  "hwadoo-store-v1", "hwadu.me.v1", "hwadu.merit.v1", "hwadu.daily.v1", "hwadu.sil.v1", "hwadoo-holding-v1",
  // 이 기기에만 맞는 것 — 소리 길·진동·알림 토큰·걸음 센서·설치·캐시·쓰다 만 글
  "hwadoo.sound", "hwadoo-sound", "hwadoo.vibe-off", "hwadoo-theme", "hwadu.push.", "hwadu.posts.cache",
  "hwadu.hip.swipe", "hwadoo-presence", "hwadoo-install", "hwadoo-sidebar", "hwadu.walking.",
  "hwadu.invite-ref", "hwadu.freshen", "hwadoo-notes-draft", "hwadoo-draft-", "hwadu.kv.",
];
/** 칸 하나가 이보다 크면 싣지 않는다 — 문서 한 장이 1MB 를 넘으면 통째로 안 올라간다 */
const MAX_VALUE = 60_000;

export const kvSynced = (k: string) => /^hwad(u|oo)[.-]/.test(k) && !DENY.some((d) => k.startsWith(d));
// Firestore 필드 이름의 점은 길(path)로 읽힌다 — 칸 이름의 점을 ~ 로 바꿔 싣는다
const enc = (k: string) => k.replace(/\./g, "~");
const dec = (k: string) => k.replace(/~/g, ".");

type Cell = { v: string | null; t: number };
type Cloud = Record<string, Cell>;

let origSet: ((k: string, v: string) => void) | null = null;
let origRemove: ((k: string) => void) | null = null;
let ref: DocumentReference | null = null;
let dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

function stamps(): Record<string, number> {
  try { return JSON.parse(window.localStorage.getItem(STAMP_KEY) || "{}"); } catch { return {}; }
}
function setStamp(k: string, t: number) {
  const s = stamps();
  s[k] = t;
  origSet?.call(window.localStorage, STAMP_KEY, JSON.stringify(s));
}

/** localStorage 를 한 번 감싼다 — 어느 방이 쓰든 화두 칸이면 「언제 썼나」를 적고 올릴 것으로 표시 */
function patch() {
  if (origSet || typeof window === "undefined") return;
  const proto = Storage.prototype;
  const set = proto.setItem, remove = proto.removeItem;
  origSet = (k, v) => set.call(window.localStorage, k, v);
  origRemove = (k) => remove.call(window.localStorage, k);
  proto.setItem = function (this: Storage, k: string, v: string) {
    set.call(this, k, v);
    if (this === window.localStorage && kvSynced(k)) touched(k);
  };
  proto.removeItem = function (this: Storage, k: string) {
    remove.call(this, k);
    if (this === window.localStorage && kvSynced(k)) touched(k);
  };
}

function touched(k: string) {
  setStamp(k, Date.now());
  dirty.add(k);
  if (!ref) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void push(); }, 2000);
}

async function push(): Promise<void> {
  if (!ref || !dirty.size) return;
  const keys = [...dirty];
  dirty = new Set();
  const s = stamps();
  const kv: Cloud = {};
  for (const k of keys) {
    const v = window.localStorage.getItem(k);
    if (v !== null && v.length > MAX_VALUE) continue;
    kv[enc(k)] = { v, t: s[k] ?? 1 };
  }
  if (!Object.keys(kv).length) return;
  const target = ref;
  inFlight = setDoc(target, { kv }, { merge: true }).then(
    () => undefined,
    () => { keys.forEach((k) => dirty.add(k)); if (ref === target) timer = setTimeout(() => void push(), 5000); },
  );
  return inFlight;
}

/** 구름의 칸과 이 기기의 칸을 맞춘다 — 늦게 쓴 쪽이 이긴다. 이 기기 쪽이 이긴 칸은 올릴 것으로 남긴다 */
export function kvAdopt(raw: unknown) {
  if (typeof window === "undefined") return;
  patch();
  const cloud = (raw && typeof raw === "object" ? raw : {}) as Cloud;
  const s = stamps();
  const changed: string[] = [];
  const seen = new Set<string>();
  for (const [ek, cell] of Object.entries(cloud)) {
    const k = dec(ek);
    if (!kvSynced(k) || !cell || typeof cell.t !== "number") continue;
    seen.add(k);
    const mine = s[k] ?? 0;
    if (cell.t > mine) {
      if (cell.v === null) origRemove?.(k);
      else if (window.localStorage.getItem(k) !== cell.v) origSet?.(k, cell.v);
      setStamp(k, cell.t);
      changed.push(k);
    } else if (mine > cell.t) dirty.add(k);
  }
  // 이 기기에만 있는 칸 — 구름에 없으면 올린다(이 기능 전부터 있던 칸은 t=1, 어느 구름 칸에든 진다)
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && kvSynced(k) && !seen.has(k)) dirty.add(k);
  }
  // 열려 있는 화면들이 다시 읽게 — 여러 방이 이미 storage 소리를 듣고 있다
  for (const k of changed) {
    try { window.dispatchEvent(new StorageEvent("storage", { key: k, storageArea: window.localStorage })); } catch { /* 지나간다 */ }
  }
}

export function kvStart(r: DocumentReference) {
  patch();
  ref = r;
  void push();
}
export function kvStop() {
  if (timer) clearTimeout(timer);
  timer = null;
  ref = null;
}
export async function kvFlush() {
  if (timer) { clearTimeout(timer); timer = null; }
  await push();
  if (inFlight) await inFlight;
}

// 로그인 전에도 「언제 썼나」는 적어 둔다 — 로그인하는 순간 어느 쪽이 새것인지 알 수 있게
if (typeof window !== "undefined") patch();
