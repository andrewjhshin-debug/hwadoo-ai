"use client";

// ─────────────────────────────────────────────────────────────
// 얼굴 인증 — 그 자리에 있는 사람인지.
//
// 형: 「화두 사진 확인, 개인 id 사진 올릴 때 이걸로 증명하게」
//
// 여태는 「지금 카메라에서 왼손으로 V」를 찍어 올리면 **사람이 눈으로**
// 심사했다. 몸짓은 사진 한 장으로 흉내낼 수 있고, 심사는 사람 손이
// 든다. 여기서는 **깜박임**을 본다 — 인쇄된 사진도, 캡처한 얼굴도
// 눈을 감았다 뜨지는 못한다.
//
// 얼굴 좌표는 기기 안에서만 센다(MediaPipe, WASM). 영상은 어디로도
// 안 나간다 — 깜박인 **그 순간의 한 장**만 기존 심사 줄에 올라간다.
// 갤러리에서 고를 길을 아예 두지 않는 것이 이 판의 핵심이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** 눈을 감았다고 보는 값 · 떴다고 보는 값 — 사이를 왕복해야 한 번이다 */
const 감음 = 0.45;
const 뜸 = 0.18;
/** 얼굴이 이만큼은 차야 한다 — 멀리 든 사진으로 때우지 못하게 */
const 최소얼굴 = 0.26;

type 결 = "준비" | "얼굴찾기" | "깜박여" | "됐다" | "탈";

export default function FaceLive({
  gesture,
  onShot,
  onClose,
}: {
  /** 서버가 준 몸짓 — 깜박임에 더해 이것도 같이 찍는다 */
  gesture?: string;
  onShot: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [결, 결잡기] = useState<결>("준비");
  const [탈, 탈잡기] = useState("");
  const 멈춤 = useRef(false);
  /** 눈을 감은 적이 있나 — 뜬 상태에서 감았다가 다시 떠야 한 번이다 */
  const 감았다 = useRef(false);

  const 끝내기 = useCallback(() => {
    멈춤.current = true;
    const s = video.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => 끝내기, [끝내기]);

  useEffect(() => {
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => unknown; close?: () => void } | null = null;

    const 돌리기 = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (멈춤.current) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        결잡기("얼굴찾기");

        // 판이 무거워 여기서만 불러온다 — 인증에 들어와야 받는다
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );
        if (멈춤.current) return;
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (멈춤.current) return;

        let 앞시각 = -1;
        const 한바퀴 = () => {
          if (멈춤.current || !video.current || !landmarker) return;
          const v2 = video.current;
          if (v2.currentTime !== 앞시각 && v2.videoWidth > 0) {
            앞시각 = v2.currentTime;
            try {
              const r = landmarker.detectForVideo(v2, performance.now()) as {
                faceLandmarks?: { x: number; y: number }[][];
                faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
              };
              보기(r);
            } catch {
              /* 한 프레임 놓쳐도 다음 프레임이 있다 */
            }
          }
          requestAnimationFrame(한바퀴);
        };
        requestAnimationFrame(한바퀴);
      } catch (e) {
        결잡기("탈");
        탈잡기(
          (e as { name?: string })?.name === "NotAllowedError"
            ? "카메라를 허용해 주세요"
            : "카메라를 열지 못했습니다"
        );
      }
    };

    const 보기 = (r: {
      faceLandmarks?: { x: number; y: number }[][];
      faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
    }) => {
      const pts = r.faceLandmarks?.[0];
      const shapes = r.faceBlendshapes?.[0]?.categories;
      if (!pts || !shapes) {
        결잡기("얼굴찾기");
        감았다.current = false;
        return;
      }
      // 얼굴이 화면에서 차지하는 높이 — 멀면 안 센다
      let 위 = 1, 아래 = 0;
      for (const p of pts) {
        if (p.y < 위) 위 = p.y;
        if (p.y > 아래) 아래 = p.y;
      }
      if (아래 - 위 < 최소얼굴) {
        결잡기("얼굴찾기");
        감았다.current = false;
        return;
      }
      const 점 = (n: string) => shapes.find((c) => c.categoryName === n)?.score ?? 0;
      const 눈 = Math.min(점("eyeBlinkLeft"), 점("eyeBlinkRight"));
      결잡기((v) => (v === "됐다" ? v : "깜박여"));
      if (눈 > 감음) 감았다.current = true;
      else if (감았다.current && 눈 < 뜸) {
        // 감았다 떴다 — 그 자리에 있는 사람이다. 눈 뜬 지금을 찍는다
        감았다.current = false;
        찍기();
      }
    };

    const 찍기 = () => {
      const v = video.current;
      if (!v || 멈춤.current) return;
      멈춤.current = true;
      결잡기("됐다");
      const 변 = Math.min(v.videoWidth, v.videoHeight);
      const c = document.createElement("canvas");
      c.width = 변;
      c.height = 변;
      const g = c.getContext("2d");
      if (!g) return;
      // 앞 카메라는 좌우가 뒤집혀 보인다 — 찍히는 것은 바로 세운다
      g.translate(변, 0);
      g.scale(-1, 1);
      g.drawImage(v, (v.videoWidth - 변) / 2, (v.videoHeight - 변) / 2, 변, 변, 0, 0, 변, 변);
      c.toBlob(
        (b) => {
          끝내기();
          if (b) onShot(new File([b], "face.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.88
      );
    };

    void 돌리기();
    return () => {
      멈춤.current = true;
      landmarker?.close?.();
    };
  }, [onShot, 끝내기]);

  const 말 =
    결 === "탈"
      ? 탈
      : 결 === "준비"
        ? "카메라를 켜는 중"
        : 결 === "얼굴찾기"
          ? "얼굴을 동그라미에 맞춰 주세요"
          : 결 === "깜박여"
            ? "눈을 깜박여 주세요"
            : "됐습니다";

  if (typeof document === "undefined") return null;
  // 판 안에 두면 아래 탭띠와 설치 띠가 뚫고 올라온다 — body 바로 아래로.
  // z 로 겨루지 않는다(이 판의 단골 함정)
  return createPortal(
    <div className="hip-face" role="dialog" aria-label="얼굴 인증">
      <button
        type="button"
        className="hip-face-x"
        aria-label="닫기"
        onClick={() => {
          끝내기();
          onClose();
        }}
      >
        ✕
      </button>
      <div className="hip-face-ring" data-ok={결 === "됐다" ? "1" : undefined}>
        <video ref={video} playsInline muted autoPlay />
      </div>
      <p className="hip-face-say">{말}</p>
      {gesture && 결 !== "탈" && <p className="hip-face-sub">{gesture}</p>}
    </div>,
    document.body,
  );
}
