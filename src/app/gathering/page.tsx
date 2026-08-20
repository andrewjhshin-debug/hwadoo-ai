// 모임은 손잡고 절로(/pilgrimage)로 합쳐졌다 — 옛 주소는 그리로 보낸다.
import { redirect } from "next/navigation";

export default function GatheringPage() {
  redirect("/pilgrimage");
}
