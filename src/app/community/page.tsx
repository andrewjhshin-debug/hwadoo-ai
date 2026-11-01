// 연지원은 닫았다 — 형: 「연지원 기능을 아예 폐쇄하고 자유 하나 넣고 인연 게시판 쓰는 거에」
import { redirect } from "next/navigation";

export default function CommunityPage() {
  redirect("/gathering");
}
