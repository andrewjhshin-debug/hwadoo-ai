// ────────────────────────────────────────────────────────────────
// 모멘트 — 절에 다녀온 한 장. 살림은 MomentBoard 가 맡는다.
// ────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import MomentBoard from "@/components/MomentBoard";

export const metadata: Metadata = {
  title: "모멘트 — 절에 다녀온 한 장",
  description:
    "절에서 찍은 사진 한 장과 해시태그. 그 자리에서 걸면 도장이 찍히고 공덕이 갑절로 쌓입니다.",
};

export default function MomentPage() {
  return <MomentBoard />;
}
