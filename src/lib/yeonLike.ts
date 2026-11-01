// 호감 — 화면 쪽 손잡이. 값·잇기는 서버(/api/yeon/like · likes · room)가 한다.
import { auth } from "./firebase";

async function 부르기(path: string, init?: { method?: string; body?: unknown }) {
  const u = auth.currentUser;
  if (!u) return null;
  return fetch(path, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${await u.getIdToken()}`, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  }).catch(() => null);
}

export type 호감결과 = { matched: boolean; pair?: string; already?: boolean } | "need-lotus" | "login" | "fail" | "nope";

export async function 호감보내기(to: string, line: string, sincere: boolean): Promise<호감결과> {
  if (!auth.currentUser) return "login";
  const r = await 부르기("/api/yeon/like", { method: "POST", body: { to, line, sincere } });
  if (!r) return "fail";
  if (r.status === 402) return "need-lotus";
  // 샘플 계정·서로 막은 사이·잘못된 상대 — 다시 눌러도 안 되는 것은 「실패」와 갈라 말한다
  if (r.status === 409 || r.status === 400) return "nope";
  if (!r.ok) return "fail";
  return (await r.json()) as { matched: boolean; pair?: string; already?: boolean };
}

export type 받은호감 = { key: string; sincere: boolean; at: number; name?: string; line?: string; uid?: string; hidden?: boolean };
export type 이어진짝 = { pair: string; uid: string; name: string; sex: string; myName: string; mySex: string; state: string; thread: string | null };

export async function 호감함(): Promise<{ got: 받은호감[]; revealed: boolean; pairs: 이어진짝[] } | null> {
  const r = await 부르기("/api/yeon/likes");
  return r?.ok ? r.json() : null;
}

/** 나도(yes) — 값 없이 잇는다 · 넘기기(pass) — 30일 숨김 */
export async function 호감답(key: string, act: "yes" | "pass"): Promise<boolean> {
  const r = await 부르기("/api/yeon/likes", { method: "POST", body: { key, act } });
  return !!r?.ok;
}

/** 쪽지방 열기 — 먼저 여는 쪽이 🪷3, 이미 열렸으면 그냥 */
export async function 방열기(pair: string): Promise<string | "need-lotus" | null> {
  const r = await 부르기("/api/yeon/room", { method: "POST", body: { pair } });
  if (!r) return null;
  if (r.status === 402) return "need-lotus";
  const j = (await r.json().catch(() => null)) as { thread?: string } | null;
  return r.ok && j?.thread ? j.thread : null;
}
