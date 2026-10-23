"use client";

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { useConfirm } from "@/components/Confirm";
import { addMerit } from "@/lib/merit";
import { auth } from "@/lib/firebase";
import { buzz, strikeStone } from "@/lib/sound";
import { STONE_ATLAS } from "@/lib/tower-balance";
import { seedOf, GAME_WIDTH, type ReplayFrame } from "@/lib/tower-game";
import { createTowerEngine, type TowerEngine, type TowerStatus } from "@/lib/tower-engine";
import { claimTowerHeight, loadTowerRecord, towerDay } from "@/lib/tower-record";
import { makeTowerVideo, shareFrame } from "@/lib/tower-share";
import "./tower.css";

export default function TowerPage() {
  const ask = useConfirm();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<TowerEngine | null>(null);
  const atlas = useRef<HTMLImageElement | null>(null);
  const capture = useRef<AbortController | null>(null);
  const dragged = useRef<number | null>(null);
  const [run, setRun] = useState(0);
  const [game, setGame] = useState<TowerStatus>({ height: 0, peak: 0, count: 0, phase: "ready" });
  const [best, setBest] = useState(0);
  const [reward, setReward] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [seed, setSeed] = useState("");
  const [target, setTarget] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const replay = useRef<ReplayFrame[]>([]);
  const poster = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const challenge = query.get("seed") ?? "";
    const value = /^[A-Za-z0-9-]{1,24}$/.test(challenge) ? challenge : towerDay().replaceAll("-", "");
    const goal = Number(query.get("target"));
    const timer = window.setTimeout(() => {
      setSeed(value); setTarget(Number.isFinite(goal) && goal > 0 && goal < 100000 ? goal : 0);
      setBest(loadTowerRecord(auth.currentUser?.uid ?? "guest").best);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canvas.current || !seed) return;
    const el = canvas.current;
    let disposed = false, started = false;
    const image = new Image(); atlas.current = image;
    const start = () => {
      if (disposed || started) return;
      started = true;
      engine.current = createTowerEngine(el, image, seedOf(seed), setGame, height => {
        const owner = auth.currentUser?.uid ?? "guest";
        const award = () => {
          if (auth.currentUser?.uid !== owner && !(owner === "guest" && !auth.currentUser)) return;
          const { record, delta } = claimTowerHeight(owner, height);
          const gained = delta ? addMerit("tower", delta / 3, delta).gained : 0;
          if (!disposed) { setBest(record.best); if (gained) setReward(v => v + gained); }
        };
        if (navigator.locks) void navigator.locks.request(`hwadu-tower-reward:${owner}`, award);
        else award();
      }, (depth, failed) => { strikeStone(.28 + Math.min(15, depth) * .012, depth % 9); buzz(failed ? 25 : 8); });
      setReady(true);
    };
    image.onload = start;
    image.onerror = () => { if (!disposed) setError("돌 이미지를 불러오지 못했어요. 새로고침해 주세요."); };
    image.src = STONE_ATLAS;
    if (image.complete && image.naturalWidth) start();
    return () => { disposed = true; engine.current?.dispose(); engine.current = null; capture.current?.abort(); };
  }, [seed, run]);

  useEffect(() => {
    if (!video) return;
    const url = URL.createObjectURL(video);
    const timer = window.setTimeout(() => setVideoUrl(url), 0);
    return () => { clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [video]);

  useEffect(() => {
    if (sharing && !video && poster.current && atlas.current && engine.current)
      shareFrame(poster.current.getContext("2d")!, atlas.current, engine.current.record());
  }, [sharing, video]);

  const point = (x: number) => {
    const rect = canvas.current!.getBoundingClientRect();
    return (x - rect.left - rect.width / 2) / Math.min(rect.width / GAME_WIDTH, rect.height / 520);
  };
  const openShare = () => {
    if (!engine.current || game.phase === "busy") return;
    engine.current.pause(); replay.current = engine.current.replay(); setSharing(true); setVideo(null); setVideoUrl(""); setError("");
  };
  const closeShare = () => { capture.current?.abort(); setSharing(false); setRendering(false); setVideo(null); setVideoUrl(""); engine.current?.resume(); canvas.current?.focus(); };
  const download = (file: File) => {
    const url = URL.createObjectURL(file), a = document.createElement("a");
    a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const challengeUrl = () => `${window.location.origin}/tower?seed=${encodeURIComponent(seed)}&target=${game.peak.toFixed(1)}`;
  const createVideo = async () => {
    if (!atlas.current || rendering) return;
    const controller = new AbortController();
    capture.current = controller; setRendering(true); setError("");
    try { const file = await makeTowerVideo(atlas.current, replay.current, controller.signal); if (!controller.signal.aborted) setVideo(file); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "영상을 만들지 못했어요."); }
    finally { if (capture.current === controller) setRendering(false); }
  };

  return <HipRoom here="/tower" scroll={false}>
    <section className="tower-game" aria-label="돌탑 높이 도전">
      <header className="tower-score">
        <h1>石塔 · 돌탑</h1>
        <p><b>{game.height.toFixed(1)}</b><span>cm</span></p>
        <small>최고 {best.toFixed(1)} cm{target > 0 ? ` / 도전 ${target.toFixed(1)} cm` : ""}</small>
      </header>
      <canvas ref={canvas} width={720} height={1040} className="tower-canvas" tabIndex={0} role="button" aria-label="돌을 좌우로 끌고 놓으세요. 키보드는 방향키와 스페이스로 조작합니다."
        aria-disabled={!ready || game.phase !== "ready"}
        onPointerDown={event => { if (!ready || game.phase !== "ready") return; dragged.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); engine.current?.aim(point(event.clientX)); }}
        onPointerMove={event => { if (dragged.current === event.pointerId || event.pointerType === "mouse") engine.current?.aim(point(event.clientX)); }}
        onPointerUp={event => { if (dragged.current !== event.pointerId) return; dragged.current = null; engine.current?.drop(point(event.clientX)); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { dragged.current = null; }}
        onKeyDown={event => { if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(event.key)) { event.preventDefault(); if (event.key === "ArrowLeft") engine.current?.nudge(-4); else if (event.key === "ArrowRight") engine.current?.nudge(4); else if (!event.repeat) engine.current?.drop(); } }}
      >돌탑 쌓기는 캔버스를 지원하는 브라우저에서 이용할 수 있어요.</canvas>
      <div className="tower-actions">
        <p role="status">{!ready ? "돌을 준비하고 있어요" : game.phase === "busy" ? "" : game.phase === "fallen" ? "남은 돌에서 계속" : game.phase === "paused" ? "잠시 쉬는 중" : "끌어서 맞추고, 놓으면 툭"}</p>
        {game.phase === "fallen" || game.phase === "paused" ? <button className="tower-primary" onClick={() => engine.current?.resume()}>이어서 쌓기</button> : <button disabled={!ready || game.phase === "busy"} onClick={() => engine.current?.pause()}>잠시 멈춤</button>}
        <button disabled={!game.count || game.phase === "busy"} onClick={openShare}>기록 공유</button>
        {game.phase === "paused" && <button onClick={async () => { if (await ask("새로 쌓을까요?", "현재 돌탑은 사라지고 최고 기록은 남아요.")) { engine.current?.dispose(); setReady(false); setReward(0); setRun(v => v + 1); } }}>새로 쌓기</button>}
        <small aria-live="polite">{reward > 0 ? `오늘 새 높이 공덕 +${reward.toLocaleString()}` : "오늘 처음 넘긴 10cm 구간마다 공덕"}</small>
      </div>
      {error && !sharing && <p role="alert" className="tower-error">{error}</p>}
      {sharing && <div className="tower-share-veil" role="dialog" aria-modal="true" aria-label="돌탑 기록 공유" onKeyDown={e => {
        if (e.key === "Escape") closeShare();
        if (e.key === "Tab") {
          const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), video[controls]')];
          const first = items[0], last = items.at(-1);
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}>
        <div className="tower-share-panel">
          <button className="tower-share-close" onClick={closeShare} autoFocus>닫기</button>
          <h2>내 돌탑 {game.peak.toFixed(1)} cm</h2>
          <p>이 높이, 넘을 수 있어?</p>
          {video && videoUrl && <video controls playsInline src={videoUrl} aria-label="최근 8초 돌탑 리플레이" />}
          {!video && <canvas className="tower-share-poster" ref={poster} width={540} height={960} aria-label="이번 돌탑 최고 높이 기록 이미지" />}
          <div className="tower-share-buttons">
            {!video ? <button className="tower-primary" disabled={rendering} onClick={() => void createVideo()}>{rendering ? "8초 영상 만드는 중…" : "리플레이 만들기"}</button> : <>
              <button className="tower-primary" onClick={async () => { try { if (navigator.canShare?.({ files: [video] })) await navigator.share({ files: [video], title: "화두 돌탑" }); else download(video); } catch (e) { if ((e as Error).name !== "AbortError") setError("공유하지 못했어요. 영상 저장을 이용해 주세요."); } }}>영상 공유</button>
              <button onClick={() => download(video)}>영상 저장</button>
            </>}
            <button onClick={() => {
              if (!atlas.current || !engine.current) return;
              const image = document.createElement("canvas"); image.width = 540; image.height = 960;
              shareFrame(image.getContext("2d")!, atlas.current, engine.current.record());
              image.toBlob(blob => { if (blob) download(new File([blob], "hwadu-tower.png", { type: "image/png" })); }, "image/png");
            }}>기록 이미지 저장</button>
            <button onClick={async () => { try { await navigator.clipboard.writeText(challengeUrl()); setError("같은 돌 순서로 도전하는 링크를 복사했어요."); } catch { setError(`도전 주소: ${challengeUrl()}`); } }}>친구 도전 링크</button>
          </div>
          {error && <p role="status" className="tower-error">{error}</p>}
          <small>공유는 직접 선택할 때만 실행돼요. 화면·음성·프로필은 녹화하지 않아요.</small>
        </div>
      </div>}
    </section>
  </HipRoom>;
}
