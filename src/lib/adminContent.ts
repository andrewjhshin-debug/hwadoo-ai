// ─────────────────────────────────────────────────────────────
// 뒷방의 손질 — 코드에 내장된 화두 은행·어록도 관리자가 다듬는다.
// Firestore 컬렉션 "admin-content" (읽기는 모두 / 쓰기는 관리자만):
// · 문서 "bank":    { hidden: string[], overrides: { [hwaduId]: { question?, context?, title? } } }
// · 문서 "sayings": { extra: [{ id, name, era, text }], hiddenIds: string[] }
// 내장 데이터는 코드에 그대로 두고, 숨김·덮어쓰기만 서버에 새긴다.
// 읽기에 실패하면 원본(코드 내장) 그대로 조용히 물러선다 — 화면이 멈추지 않게.
// ─────────────────────────────────────────────────────────────

import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { SAYINGS, type Saying } from "./sayings";
import type { Hwadu } from "./hwadu";

// 은행 화두 하나를 덮어쓰는 조각 — 적힌 것만 원문을 가린다
export type BankOverride = {
  question?: string;
  context?: string;
  title?: string;
};

export type AdminBank = {
  hidden: string[]; // 랜덤 풀에서 감춘 은행 화두 id
  overrides: Record<string, BankOverride>;
};

// 관리자가 더한 어록 한 줄
export type ExtraSaying = {
  id: string;
  name: string;
  era: string;
  text: string;
};

export type AdminSayings = {
  extra: ExtraSaying[];
  hiddenIds: string[]; // 감춘 어록 id (내장 어록은 텍스트 해시 id)
};

export type AdminContent = {
  bank: AdminBank;
  sayings: AdminSayings;
};

// 빈 손질 — 늘 새 객체로 (실수로 고쳐 쓰이지 않도록)
export function emptyAdminContent(): AdminContent {
  return {
    bank: { hidden: [], overrides: {} },
    sayings: { extra: [], hiddenIds: [] },
  };
}

const bankRef = () => doc(db, "admin-content", "bank");
const sayingsRef = () => doc(db, "admin-content", "sayings");

// ── 읽기 + 캐시 — 화두 받기가 매번 서버를 기다리지 않게 ──────────

let cache: AdminContent | null = null;
let cacheAt = 0;
let inflight: Promise<AdminContent> | null = null;
const TTL = 60 * 1000; // 1분 — 뒷방에서 고치면 곧바로 지워 새로 본다

function invalidate() {
  cache = null;
  cacheAt = 0;
}

// 서버의 손질을 읽는다. 실패하면 (있으면) 옛 캐시, 없으면 빈 손질 —
// 어느 쪽이든 부르는 쪽은 원본 데이터로 조용히 이어 갈 수 있다.
export async function fetchAdminContent(force = false): Promise<AdminContent> {
  if (!force && cache && Date.now() - cacheAt < TTL) return cache;
  if (!force && inflight) return inflight;
  const run = (async () => {
    try {
      const [bankSnap, saySnap] = await Promise.all([
        getDoc(bankRef()),
        getDoc(sayingsRef()),
      ]);
      const content: AdminContent = {
        bank: parseBank(bankSnap.exists() ? bankSnap.data() : undefined),
        sayings: parseSayings(saySnap.exists() ? saySnap.data() : undefined),
      };
      cache = content;
      cacheAt = Date.now();
      return content;
    } catch {
      return cache ?? emptyAdminContent();
    } finally {
      inflight = null;
    }
  })();
  inflight = run;
  return run;
}

// 서버에서 온 것을 그대로 믿지 않는다 — 모양이 어긋나도 화면이 깨지지 않게
function parseBank(data: Record<string, unknown> | undefined): AdminBank {
  const hidden = Array.isArray(data?.hidden)
    ? (data.hidden as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const overrides: Record<string, BankOverride> = {};
  const raw = data?.overrides;
  if (raw && typeof raw === "object") {
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const ov: BankOverride = {};
      if (typeof o.question === "string" && o.question.trim()) ov.question = o.question;
      if (typeof o.context === "string" && o.context.trim()) ov.context = o.context;
      if (typeof o.title === "string" && o.title.trim()) ov.title = o.title;
      if (ov.question || ov.context || ov.title) overrides[id] = ov;
    }
  }
  return { hidden, overrides };
}

function parseSayings(data: Record<string, unknown> | undefined): AdminSayings {
  const extra: ExtraSaying[] = [];
  if (Array.isArray(data?.extra)) {
    for (const v of data.extra as unknown[]) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.text !== "string" || !o.text.trim())
        continue;
      extra.push({
        id: o.id,
        name: typeof o.name === "string" ? o.name : "",
        era: typeof o.era === "string" ? o.era : "",
        text: o.text,
      });
    }
  }
  const hiddenIds = Array.isArray(data?.hiddenIds)
    ? (data.hiddenIds as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  return { extra, hiddenIds };
}

// ── 은행 화두 손질 (관리자 전용 — 규칙이 지킨다) ─────────────────

// 은행 화두를 랜덤 풀에서 감춘다 — 코드는 그대로, 뽑히지만 않는다
export async function hideBankHwadu(hwaduId: string) {
  await setDoc(bankRef(), { hidden: arrayUnion(hwaduId) }, { merge: true });
  invalidate();
}

// 은행 화두를 덮어쓴다 — 적힌 조각만 원문을 가리고, 비운 조각은 원문이 산다
export async function overrideBankHwadu(hwaduId: string, patch: BankOverride) {
  await setDoc(
    bankRef(),
    {
      overrides: {
        [hwaduId]: {
          question: patch.question?.trim() ? patch.question.trim() : deleteField(),
          context: patch.context?.trim() ? patch.context.trim() : deleteField(),
          title: patch.title?.trim() ? patch.title.trim() : deleteField(),
        },
      },
    },
    { merge: true }
  );
  invalidate();
}

// 원래대로 — 숨김을 풀고 덮어쓴 것도 거둔다 (코드 원문으로 되돌아간다)
export async function restoreBankHwadu(hwaduId: string) {
  await setDoc(
    bankRef(),
    { hidden: arrayRemove(hwaduId), overrides: { [hwaduId]: deleteField() } },
    { merge: true }
  );
  invalidate();
}

// 화두 하나에 덮어쓴 조각을 얹는다 — 없으면 원문 그대로
export function applyBankOverride(h: Hwadu, bank: AdminBank): Hwadu {
  const ov = bank.overrides[h.id];
  if (!ov) return h;
  return {
    ...h,
    title: ov.title ?? h.title,
    question: ov.question ?? h.question,
    context: ov.context ?? h.context,
  };
}

// ── 선지식의 한마디 손질 ─────────────────────────────────────

// 내장 어록에는 안정된 id가 없다 — 텍스트 해시로 하나 만들어 준다
export function sayingId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return "b" + (h >>> 0).toString(36);
}

export type MergedSaying = Saying & { id: string; isExtra: boolean };

// 내장 + 더한 어록 전부 — 감춤은 거르지 않는다 (뒷방이 감춘 것도 봐야 하므로)
export function allSayings(content: AdminSayings): MergedSaying[] {
  return [
    ...SAYINGS.map((s) => ({ ...s, id: sayingId(s.text), isExtra: false })),
    ...content.extra.map((e) => ({
      text: e.text,
      name: e.name,
      era: e.era,
      id: e.id,
      isExtra: true,
    })),
  ];
}

// 화면에 보일 어록 — 내장 + 더한 것, 감춘 것은 뺀다
export function mergeSayings(content: AdminSayings): MergedSaying[] {
  const hidden = new Set(content.hiddenIds);
  return allSayings(content).filter((s) => !hidden.has(s.id));
}

// 어록 한 줄을 더한다
export async function addSaying(name: string, era: string, text: string) {
  const s: ExtraSaying = {
    id: `x-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    era: era.trim(),
    text: text.trim(),
  };
  if (!s.text || !s.name) throw new Error("이름과 말씀이 필요합니다");
  await setDoc(sayingsRef(), { extra: arrayUnion(s) }, { merge: true });
  invalidate();
}

// 어록 한 줄을 뺀다 — 더한 것은 걷어내고, 내장 어록은 hiddenIds로 감춘다
export async function removeSaying(id: string) {
  const content = await fetchAdminContent(true);
  const rest = content.sayings.extra.filter((e) => e.id !== id);
  if (rest.length !== content.sayings.extra.length) {
    await setDoc(sayingsRef(), { extra: rest }, { merge: true });
  } else {
    await setDoc(sayingsRef(), { hiddenIds: arrayUnion(id) }, { merge: true });
  }
  invalidate();
}

// 감춘 내장 어록을 되살린다
export async function restoreSaying(id: string) {
  await setDoc(sayingsRef(), { hiddenIds: arrayRemove(id) }, { merge: true });
  invalidate();
}
