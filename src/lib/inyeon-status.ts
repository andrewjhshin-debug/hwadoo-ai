/** 청실홍실로 이어진 사람이 쓴 글 — 같이 가요 글은 빼고, 이어진 짝(matched·room)만 친다 */
export function pairedPostIds(owners: Record<string, string>, together: Set<string>, paired: Set<string>): string[] {
  return Object.entries(owners).filter(([id, uid]) => !together.has(id) && paired.has(uid)).map(([id]) => id);
}
