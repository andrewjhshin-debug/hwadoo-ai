"use client";

// ─────────────────────────────────────────────────────────────
// 받이 창 — **개발 중에만.**
//
// 제미나이에서 구운 그림을 손에 넣는 길이 브라우저 내려받기 하나뿐이었다.
// 크롬이 「이 사이트가 파일을 여러 개 내려받으려 합니다」로 막아 버리면
// 거기서 끝이다. 화면에서 base64 로 읽어 나르는 길도 있지만 한 장에
// 오십만 자라 너무 무겁고, 제미나이 쪽 CSP 가 우리 판으로 fetch 하는 것도
// 막는다.
//
// 그래서 **창을 하나 연다.** 제미나이 화면이 이 창을 열고 postMessage 로
// 던지면, 이 창은 제 집(localhost)이라 그대로 API 에 넘길 수 있다.
// CSP 는 fetch 를 막지 create/postMessage 를 막지 않는다.
//
// 쓰는 법 — 제미나이 화면에서:
//   const w = open("http://localhost:3000/dev/drop", "hwadu");
//   setTimeout(() => w.postMessage({ name: "foo.png", b64 }, "*"), 1500);
//
// 배포판에서는 API 가 404 로 죽으므로 이 창은 아무것도 못 한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export default function 받이창() {
  const [줄, 줄잡기] = useState<string[]>(["기다리는 중…"]);

  useEffect(() => {
    const 듣기 = async (e: MessageEvent) => {
      const d = e.data as { name?: string; b64?: string } | null;
      if (!d || typeof d.b64 !== "string" || typeof d.name !== "string") return;
      줄잡기((v) => [...v, `${d.name} 받는 중 (${d.b64!.length}자)`]);
      try {
        const r = await fetch(
          `/api/dev/drop?name=${encodeURIComponent(d.name!)}`,
          { method: "POST", body: d.b64! }
        );
        const j = await r.json();
        줄잡기((v) => [...v, j.ok ? `✅ ${j.at}` : `❌ ${JSON.stringify(j)}`]);
      } catch (err) {
        줄잡기((v) => [...v, `❌ ${String(err)}`]);
      }
    };
    window.addEventListener("message", 듣기);

    // ── 탭 이름에 실어 오는 길 ──
    // 창 열기(postMessage)는 팝업 차단에 막힌다. 그런데 `window.name` 은
    // **페이지를 옮겨도 그대로 남는다.** 제미나이 화면에서 이름 칸에
    // 「파일이름|base64」 를 넣고 이 길로 옮겨 오면, 그 탭이 그대로 이
    // 화면이 되면서 짐을 들고 온다. 차단할 것이 없다.
    const 짐 = window.name;
    if (짐 && 짐.includes("|")) {
      const i = 짐.indexOf("|");
      const 이름 = 짐.slice(0, i);
      const b64 = 짐.slice(i + 1);
      window.name = "";
      void 듣기({ data: { name: 이름, b64 } } as MessageEvent);
    }
    // 연 쪽에 「준비됐다」고 알린다
    try {
      window.opener?.postMessage({ ready: true }, "*");
    } catch {
      /* 연 쪽이 없을 수도 */
    }
    return () => window.removeEventListener("message", 듣기);
  }, []);

  return (
    <div style={{ padding: 24, font: "13px ui-monospace, monospace", color: "#333" }}>
      <p style={{ fontWeight: 700, marginBottom: 12 }}>화두 받이 창 (개발용)</p>
      {줄.map((x, i) => (
        <p key={i} style={{ margin: "3px 0" }}>
          {x}
        </p>
      ))}
    </div>
  );
}
