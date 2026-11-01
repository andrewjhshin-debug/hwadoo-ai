export function letterHref(thread: string, say?: string): string {
  const query = new URLSearchParams({ thread });
  if (say) query.set("say", say.slice(0, 200));
  return `/letters?${query}`;
}

export function requestedLetter(search: string) {
  const query = new URLSearchParams(search);
  const thread = query.get("thread");
  return { thread: thread && /^[A-Za-z0-9_-]{1,160}$/.test(thread) ? thread : null, say: (query.get("say") ?? "").slice(0, 200) };
}
