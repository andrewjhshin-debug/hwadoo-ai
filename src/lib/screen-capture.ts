export type CapturePlugin = { on(): Promise<unknown>; off(): Promise<unknown> };
export const isInyeonRoute = (path: string | null) => path === "/gathering" || !!path?.startsWith("/gathering/");

// One serialized policy owns the native flag. Old queued route calls cannot relock
// a normal page after the user has already left Inyeon.
export function createCapturePolicy(plugin: () => CapturePlugin | null) {
  let secure = false, revision = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const refresh = () => {
    const token = ++revision;
    queue = queue.catch(() => {}).then(async () => {
      if (token !== revision) return;
      const bridge = plugin();
      if (!bridge) return;
      await (secure ? bridge.on() : bridge.off());
    });
    return queue;
  };
  return { route(path: string | null) { secure = isInyeonRoute(path); return refresh(); }, refresh, stop() { secure = false; return refresh(); } };
}
