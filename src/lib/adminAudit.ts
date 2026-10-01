// 뒷방의 민감한 손길은 서버 장부에만 남긴다.
// 문제가 생겼을 때 "누가, 언제, 무엇을" 했는지 복원할 수 있어야 사진
// 승인·정지 같은 권한이 한 사람의 기억에만 남지 않는다.

import { FieldValue, type Firestore } from "firebase-admin/firestore";

export async function adminAudit(
  db: Firestore,
  entry: { by: string; action: string; target?: string; detail?: Record<string, unknown> },
): Promise<void> {
  await db.collection("admin-audit").doc().set({
    ...entry,
    at: FieldValue.serverTimestamp(),
  });
}
