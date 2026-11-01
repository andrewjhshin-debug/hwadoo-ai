// 인연판 알림 — 브라우저 쪽. 울리기는 서버(/api/alerts/notify)가, 읽기는 내 것만.
import { auth } from "./firebase";

/** 무언가를 한 뒤 알림을 울려 달라고 한다 — 못 울려도 하던 일은 그대로 */
export function 알림울리기(body: Record<string, unknown>) {
  const u = auth.currentUser;
  if (!u) return;
  void u
    .getIdToken()
    .then((t) =>
      fetch("/api/alerts/notify", {
        method: "POST",
        headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    )
    .catch(() => {});
}

export type 알림 = {
  id: string;
  kind: "activity" | "like" | "dm" | "keyword";
  text: string;
  postId?: string;
  threadId?: string;
  at: number;
  read: boolean;
};
