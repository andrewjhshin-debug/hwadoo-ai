"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// 바탕 틀(layout)까지 무너졌을 때 — error.tsx 도 못 뜨는 자리다.
// 그래서 여기서는 <html>·<body> 를 제 손으로 그린다. 바깥 css 도
// 못 믿으므로 글씨와 빛깔을 그 자리에 적는다.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "#fbfaf8",
          color: "#17140f",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.5em", color: "#b08aa0" }}>
          어긋난 자리
        </p>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>잠시 길이 흐려졌습니다.</p>
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "13px 30px",
            borderRadius: 999,
            border: 0,
            background: "#17140f",
            color: "#fff",
            fontSize: 13,
            letterSpacing: "0.2em",
          }}
        >
          다시
        </button>
        {error.digest && (
          <p style={{ margin: 0, fontSize: 10, color: "#a39a8f" }}>자취 {error.digest}</p>
        )}
      </body>
    </html>
  );
}
