/** A reply or an unanswered request is never presented as an accepted match. */
export function acceptedPostIds(owners: Record<string, string>, threads: { postId?: unknown; status?: unknown; members?: unknown }[]): string[] {
  return [...new Set(threads.filter(t => typeof t.postId === "string" && !!owners[t.postId] && t.status === "accepted" && Array.isArray(t.members) && t.members.includes(owners[t.postId])).map(t => t.postId as string))];
}

export function approvedGoPostIds(owners: Record<string, string>, gatherings: { postId: string; people?: Record<string, unknown> }[]): string[] {
  return gatherings.filter(g => !!owners[g.postId] && !!g.people?.[owners[g.postId]] && Object.keys(g.people).some(uid => uid !== owners[g.postId])).map(g => g.postId);
}
