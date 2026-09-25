"use client";

// ────────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 게시판, 이 화면이 통째로 게시판이다.
//
// 「다가오는 절 행사」를 여기 달았다가 뺐다. 위에 두면 게시판에 오려던 사람이
// 달력 다섯 칸을 먼저 읽어야 했고, 아래로 내리니 글이 몇 장만 쌓여도 화면
// 저 밑으로 밀려 아무도 못 봤다. 여긴 **글이 줄줄 붙는 판**이다 — 다른 것이
// 끼면 그 흐름이 끊긴다. 행사는 절로(/pilgrimage)로 옮겼다.
// 절로의 지도 팝업·다가오는 날이 주소 파라미터로 절 이름/날짜를
// 미리 채워 보낸다: /gathering?temple=진관사 · ?date=2026-08-25 · ?open=1
// (useSearchParams 는 Suspense 울타리가 필요하다 — Next 규칙)
// ────────────────────────────────────────────────────────────────

import Link from "next/link";
import HipShell from "@/components/HipShell";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GatheringBoard from "@/components/GatheringBoard";
import PullToRefresh from "@/components/PullToRefresh";

function GatheringInner() {
  const sp = useSearchParams();
  const temple = sp.get("temple") ?? undefined;
  const date = sp.get("date") ?? undefined;
  const autoOpen = sp.get("open") === "1";
  // 글 안에 들어가면 머리글도 접는다 — 위 공간을 아낀다
  const [view, setView] = useState<"list" | "post" | "write">("list");

  // 형: 「인연 같은 경우는 밑으로 쭈욱 스크롤하면 새로고침 기능 잊지 말고」
  // 게시판은 남이 쓴 글을 보러 오는 곳이라 손으로 새로 받을 길이 있어야
  // 한다. 판을 통째로 다시 끼워(key) 글을 새로 읽게 하고, 서버 쪽 캐시도
  // 같이 턴다. 목록을 보고 있을 때만 — 글을 쓰는 중에 갈아 끼우면
  // 쓰던 것이 날아간다.
  const router = useRouter();
  const [fresh, setFresh] = useState(0);
  const 새로받기 = async () => {
    router.refresh();
    setFresh((v) => v + 1);
    // 다시 그려질 틈을 준다 — 너무 빨리 끝나면 돈 것 같지가 않다
    await new Promise((r) => setTimeout(r, 620));
  };

  const 알맹이 = (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-0 pb-16 pt-4 sm:px-6 md:pt-10">
      {view === "list" && (
        <>
          <p className="rise px-5 text-center text-[13px] tracking-[0.5em] text-gold-soft sm:px-0">
            因緣 · 인연
          </p>
          {/* 만 19세 고지 — 로그인·화면 크기와 무관하게 게시판에서 늘 보인다 */}
          <p className="rise rise-d1 mt-2.5 px-5 text-center text-[11.5px] tracking-wide text-hanji-faint sm:px-0">
            만 19세 이상만 이용할 수 있습니다 · 익명 법명으로 활동합니다
          </p>

          {/* ── 도반 찾기로 가는 문 ──────────────────────────────
              형: 「인연으로 데이팅앱 갈 거야」
              게시판은 그대로 두고 그 위에 한 겹을 얹는다. 글로 설명하지
              않는다 — 눌러서 제 프로필을 채우다 보면 무엇인지 안다. */}
          <Link href="/gathering/yeon" className="rise rise-d1 hip-yeon-door">
            <b>道伴</b>
            <span>오늘의 인연</span>
            <u>›</u>
          </Link>
          {/* 문은 둘. 설명은 안 붙인다 — 형: 「개 같은 멘트 넣지 말라고 했다」 */}
          <Link
            href="/gathering/me"
            className="rise rise-d1 hip-yeon-door"
            data-thin="1"
          >
            <b>我</b>
            <span>내 프로필</span>
            <u>›</u>
          </Link>

        </>
      )}
      <section className={view === "list" ? "rise rise-d1 mt-5" : ""}>
        <GatheringBoard
          key={fresh}
          initialTemple={temple}
          initialDate={date}
          autoOpen={autoOpen}
          onViewChange={setView}
        />
      </section>

    </div>
  );

  // 글을 쓰거나 읽는 중에는 당겨도 안 걸린다 — 다만 **껍데기는 늘 있다.**
  // 조건으로 감싸고 벗기면 리액트가 나무를 갈아 안쪽이 처음부터 다시 난다
  // (「글 쓰기」를 눌러도 목록으로 튕겼다). 스위치로만 끈다.
  return (
    <PullToRefresh onRefresh={새로받기} enabled={view === "list"}>
      {알맹이}
    </PullToRefresh>
  );
}

export default function GatheringPage() {
  return (
    // 폰에서 좌우로 쓸어 넘길 수 있게 — 형: 「오른쪽 왼쪽 다 되도록」.
    // 절로는 아래 염주에 알(緣)이 있는데 쓸기 껍데기가 없어서, 쓸어
    // 들어오면 되쓸어 나갈 길이 없었다. 껍데기는 display:contents 라
    // 화면 짜임에는 아무 영향이 없다.
    <HipShell here="/gathering">
      <Suspense fallback={null}>
        <GatheringInner />
      </Suspense>
    </HipShell>
  );
}
