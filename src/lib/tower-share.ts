import { paintTower, type ReplayFrame } from "./tower-game";

/** Invoked directly by a button so native file sharing retains user activation. */
export async function shareTowerRecord(file: File, url: string, height: number): Promise<"shared" | "copied"> {
  const title = `화두 돌탑 ${height.toFixed(1)} cm`;
  // 형: 「공유할 때 썸넬 링크를 제대로 해야지. 토스가 마케팅하는 거 마냥」
  // 파일을 보내면 카톡엔 그림 한 장만 남고 돌아올 길이 없다. **링크**를 보낸다 —
  // /tower/challenge 가 OG 그림(높이 적힌 돌탑)을 들고 있어 카톡이 카드로 편다.
  void file;
  if (navigator.share) {
    await navigator.share({ title, text: `${height.toFixed(1)} cm. 이 높이, 넘을 수 있어?`, url });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export function shareFrame(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, frame: ReplayFrame) {
  paintTower(ctx, atlas, frame);
  ctx.fillStyle = "#fbfaf8"; ctx.fillRect(0, 0, ctx.canvas.width, 130);
  ctx.fillStyle = "#353631"; ctx.textAlign = "left";
  ctx.font = "22px sans-serif"; ctx.fillText("화두 돌탑", 32, 42);
  ctx.font = "48px sans-serif"; ctx.fillText(`${frame.height.toFixed(1)} cm`, 32, 102);
  ctx.font = "18px sans-serif"; ctx.textAlign = "right"; ctx.fillText("이 높이, 넘을 수 있어?", ctx.canvas.width - 26, ctx.canvas.height - 18);
}
/** Locally render eight seconds. Never captures screen, camera, microphone or profile data. */
export async function makeTowerVideo(atlas: HTMLImageElement, frames: ReplayFrame[], signal: AbortSignal): Promise<File> {
  if (!frames.length) throw new Error("먼저 돌을 쌓아 주세요.");
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) throw new Error("이 브라우저는 영상 저장을 지원하지 않아요. 기록 이미지를 저장해 주세요.");
  const type = ["video/mp4", "video/webm;codecs=vp8", "video/webm"].find(value => MediaRecorder.isTypeSupported(value));
  if (!type) throw new Error("이 브라우저는 영상 저장을 지원하지 않아요. 기록 이미지를 저장해 주세요.");
  const canvas = document.createElement("canvas"); canvas.width = 540; canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(20);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1_800_000 });
  return new Promise<File>((resolve, reject) => {
    const chunks: Blob[] = [];
    let raf = 0, finished = false;
    const timer = setTimeout(() => fail(new Error("영상 생성 시간이 초과됐어요. 화면을 켜 두고 다시 시도해 주세요.")), 15_000);
    const cleanup = () => { cancelAnimationFrame(raf); clearTimeout(timer); signal.removeEventListener("abort", abort); stream.getTracks().forEach(t => t.stop()); };
    const fail = (error: Error) => { if (finished) return; finished = true; cleanup(); if (recorder.state !== "inactive") recorder.stop(); reject(error); };
    const abort = () => fail(new Error("영상 만들기를 취소했어요."));
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => fail(new Error("영상을 만들지 못했어요. 기록 이미지를 저장해 주세요."));
    recorder.onstop = () => {
      if (finished) return;
      finished = true; cleanup();
      const blob = new Blob(chunks, { type: recorder.mimeType });
      if (!blob.size) { reject(new Error("빈 영상입니다. 기록 이미지를 저장해 주세요.")); return; }
      resolve(new File([blob], `hwadu-tower.${type.startsWith("video/mp4") ? "mp4" : "webm"}`, { type: recorder.mimeType }));
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort);
    const start = performance.now();
    const draw = () => {
      const elapsed = performance.now() - start;
      shareFrame(ctx, atlas, frames[Math.min(frames.length - 1, Math.floor(elapsed / 8000 * frames.length))]);
      if (elapsed >= 8000) { recorder.stop(); return; }
      raf = requestAnimationFrame(draw);
    };
    try { recorder.start(); draw(); }
    catch { fail(new Error("영상을 만들지 못했어요. 기록 이미지를 저장해 주세요.")); }
  });
}
