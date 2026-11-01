"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import { isSoundMuted, setSoundMuted, SOUND_MUTE_EVENT, isVibeOff, setVibeOff } from "@/lib/soundPreference";
import { wakeSound } from "@/lib/sound";
import { getWalking, subscribeWalking, toggleWalking, WALKING_EMPTY } from "@/lib/walking";
import { pushState, enablePush, disablePush, type PushState } from "@/lib/push";
import "./preferences.css";

function PreferenceIcon({ kind }: { kind: string }) {
  const paths: Record<string, string> = { sound: "M9 17V5l11-2v12M9 8l11-2M9 17c0 4-6 5-6 1 0-3 6-4 6-1m11-2c0 4-6 5-6 1 0-3 6-4 6-1", vibe: "M8 4h8v16H8zM4 7v10m16-10v10M1 10v4m22-4v4", walking: "M12 6l-3 5-4 2m4-2 4 4-2 7m2-7 5 5M12 6l4 5 4 1M14 2a1.5 1.5 0 1 0 0 .1", bell: "M5 17c2-2 1-6 2-9 2-5 8-5 10 0 1 3 0 7 2 9H5m5 3c1 2 3 2 4 0" };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="preference-icon" aria-hidden="true"><path d={paths[kind]}/></svg>;
}
function Toggle({ icon, label, on, disabled = false, click }: { icon: string; label: string; on: boolean; disabled?: boolean; click: () => void }) {
  return <button className="preference-row" type="button" role="switch" aria-label={label} aria-checked={on} disabled={disabled} onClick={click}><PreferenceIcon kind={icon}/><span>{label}</span><i className="preference-toggle" data-on={on}><b/></i></button>;
}
export default function PreferencesPage() {
  const [sound, setSound] = useState(true), [vibe, setVibe] = useState(true);
  const [push, setPush] = useState<PushState | "loading">("loading"), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const walking = useSyncExternalStore(subscribeWalking, getWalking, () => WALKING_EMPTY);
  useEffect(() => {
    const sync = () => { setSound(!isSoundMuted()); setVibe(!isVibeOff()); };
    const refresh = () => { sync(); void pushState().then(setPush).catch(() => setPush("off")); };
    refresh(); window.addEventListener(SOUND_MUTE_EVENT, sync); window.addEventListener("storage", refresh); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener(SOUND_MUTE_EVENT, sync); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  const notification = async () => {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      if (push === "on") { await disablePush(); setPush(await pushState()); }
      else {
        const result = await enablePush();
        setPush(await pushState());
        if (result === "denied") setNotice("기기 설정에서 알림을 허용해 주세요.");
        if (result === "error") setNotice("알림 설정을 저장하지 못했어요. 다시 눌러 주세요.");
      }
    } catch { setNotice("알림 설정을 확인하지 못했어요."); }
    finally { setBusy(false); }
  };
  return <HipRoom here="/settings/preferences" lanes={false} rail="/settings"><main className="preferences-page">
    {/* 형: 「내 도량 설정, 우리 톤에 맞춰」 — 머리는 판(HipRoom)이 이미 그린다. 여기선 제목 한 줄 */}
    <h1><Link href="/settings" aria-label="내 도량으로">‹</Link>設 설정</h1>
    <section aria-label="기기 설정" className="preference-card">
      <Toggle icon="sound" label="소리" on={sound} click={() => { setSoundMuted(sound); setSound(!sound); if (!sound) void wakeSound(); }}/>
      <Toggle icon="vibe" label="진동" on={vibe} click={() => { setVibeOff(vibe); setVibe(!vibe); }}/>
      <Toggle icon="walking" label="포행" on={walking.on} disabled={walking.starting} click={toggleWalking}/>
    </section>
    <section aria-label="알림 설정" className="preference-card preference-separated"><Toggle icon="bell" label="알림" on={push === "on"} disabled={busy || push === "loading" || push === "unsupported"} click={() => void notification()}/></section>
    {(notice || push === "unsupported") && <p role="status" className="preference-notice">{notice || "이 기기에서는 알림을 지원하지 않아요."}</p>}
    <nav aria-label="이용 안내" className="preference-card preference-separated"><a className="preference-row" href="mailto:admin@ibod.co.kr"><span className="preference-icon preference-han" aria-hidden>問</span>문의<span className="preference-chevron">›</span></a><Link className="preference-row" href="/about"><span className="preference-icon preference-han" aria-hidden>案</span>이용 안내<span className="preference-chevron">›</span></Link></nav>
  </main></HipRoom>;
}
