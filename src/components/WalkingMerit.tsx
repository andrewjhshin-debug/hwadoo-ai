"use client";
import { useWalking } from "./WalkingRuntime";
import { hasNativeSteps, toggleWalking } from "@/lib/walking";
export default function WalkingMerit() {
  const walk = useWalking();
  const sensor = { off: "꺼짐", waiting: "신호 기다리는 중", live: "신호 수신 중", denied: "권한 거부됨", silent: "신호 없음", unavailable: "지원하지 않는 기기" }[walk.motion];
  return <section className="walking-merit walking-merit-page" aria-label="포행">
    <p className="walking-merit-kicker">經行 · 포행</p>
    <div className="walking-merit-steps"><strong>{walk.steps.toLocaleString("ko-KR")}</strong><span>오늘 걸음</span></div>
    <p className="walking-merit-distance">약 {(walk.meters / 1000).toFixed(2)} km</p>
    <div className="walking-merit-track" aria-hidden>{[1, 2, 3, 4, 5].map(n => <i key={n} data-lit={walk.on && walk.level >= n ? "1" : undefined} />)}</div>
    <button type="button" onClick={toggleWalking} aria-label={walk.on ? "포행 끄기" : "포행 켜기"} title={walk.on ? "포행 끄기" : "포행 켜기"} aria-pressed={walk.on} className="walking-merit-toggle">{walk.on ? "포행 ON" : "포행 OFF"}</button>
    <p className="walking-merit-notice" role="status">{walk.hidden && walk.on && !hasNativeSteps() ? "화면이 가려져 감지가 쉬고 있어요. 돌아오면 다시 셉니다." : walk.notice}</p>
    <dl className="walking-diagnostics"><div><dt>걸음 센서</dt><dd>{sensor}</dd></div><div><dt>위치 보정</dt><dd>{walk.gps === "live" ? "위치 수신 중" : walk.gps === "denied" ? "사용 불가" : walk.gps === "waiting" ? "위치 기다리는 중" : "꺼짐"}</dd></div></dl>
    {walk.motion === "silent" && <p className="walking-merit-guide">Chrome 사이트 설정에서 ‘동작 센서’를 허용해 주세요. 실내에서는 위치 보정도 어려울 수 있어요.</p>}
    {walk.motion === "denied" && <p className="walking-merit-guide">동작 센서 권한을 허용한 뒤 OFF → ON으로 다시 시작해 주세요.</p>}
  </section>;
}
