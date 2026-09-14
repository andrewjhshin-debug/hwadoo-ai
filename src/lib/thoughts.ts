// ─────────────────────────────────────────────────────────────
// 단상(斷想) — 사유의 방에 쌓이는 말들.
//
// 한 덩어리 메모였던 것을 **오간 말**로 바꾼다. 화두가 오른쪽에서 묻고,
// 내가 왼쪽에 적는다 — 여느 AI 창과 좌우가 뒤집혀 있다. 여기서 묻는 쪽은
// 기계가 아니라 화두이고, 답하는 쪽이 나이기 때문이다.
//
// 저장은 한 줄 텍스트 그대로 남긴다(session.notes). 서고·관리자·내보내기가
// 전부 그 문자열을 읽고 있어서다. 대신 말과 말 사이에 보이지 않는
// 이음쇠를 하나 끼워, 다시 읽을 때 갈라 세운다.
//   ⟪1694…⟫  ← 적은 시각
// 이음쇠가 없는 옛 글은 통째로 한 마디로 친다 — 하나도 잃지 않는다.
// ─────────────────────────────────────────────────────────────

export type Thought = { at: number; text: string };

/** 말과 말 사이의 이음쇠 — 사람이 칠 일이 없는 괄호를 골랐다 */
const MARK = /^⟪(\d{10,16})⟫$/;

/** 저장된 한 덩어리를 말들로 갈라 세운다 */
export function parseThoughts(raw: string | undefined): Thought[] {
  const text = (raw ?? "").replace(/\r\n/g, "\n");
  if (!text.trim()) return [];

  const out: Thought[] = [];
  let at = 0;
  let buf: string[] = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) out.push({ at, text: body });
    buf = [];
  };

  for (const line of text.split("\n")) {
    const m = line.trim().match(MARK);
    if (m) {
      flush();
      at = Number(m[1]);
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** 말들을 다시 한 덩어리로 — 이음쇠를 끼워서 */
export function stringifyThoughts(list: Thought[]): string {
  return list
    .filter((t) => t.text.trim())
    .map((t) => `⟪${t.at || Date.now()}⟫\n${t.text.trim()}`)
    .join("\n\n");
}

/** 이음쇠를 걷어 낸 맨 글 — 서고나 내보내기에서 사람이 읽을 몫 */
export function plainThoughts(raw: string | undefined): string {
  return parseThoughts(raw)
    .map((t) => t.text)
    .join("\n\n");
}

/** 한 마디를 더한다 */
export function appendThought(raw: string | undefined, text: string, at = Date.now()): string {
  const body = text.trim();
  if (!body) return raw ?? "";
  return stringifyThoughts([...parseThoughts(raw), { at, text: body }]);
}

/** 몇 번째 마디를 고친다(빈 글이면 지운다) */
export function editThought(raw: string | undefined, i: number, text: string): string {
  const list = parseThoughts(raw);
  if (i < 0 || i >= list.length) return raw ?? "";
  const body = text.trim();
  if (!body) list.splice(i, 1);
  else list[i] = { ...list[i], text: body };
  return stringifyThoughts(list);
}

/** 언제 적었는지 — 오늘이면 시각만, 아니면 날짜까지 */
export function whenLabel(at: number): string {
  if (!at) return "";
  const d = new Date(at);
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hhmm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return sameDay ? hhmm : `${d.getMonth() + 1}.${p(d.getDate())} ${hhmm}`;
}
