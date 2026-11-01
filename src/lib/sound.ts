// ─────────────────────────────────────────────────────────────
// 도량의 소리 — Web Audio 로 그 자리에서 빚는다. 음원 파일이 없다.
// 목탁·염주·죽비를 목탁 방과 백팔배 방이 함께 쓴다.
// 첫 터치에서 AudioContext 를 깨운다(브라우저 정책).
// ─────────────────────────────────────────────────────────────

import { isVibeOff } from "./soundPreference";
import { isSoundMuted, SOUND_MUTE_EVENT } from "@/lib/soundPreference";

// ── 소리 — 나무를 빚는다 ────────────────────────────────────

let actx: AudioContext | null = null;
/** 들여다보기용 — running 이라고 들린다는 뜻은 아니다 */
export function soundStatus() {
  return {
    context: actx?.state ?? "not-created",
    muted: isSoundMuted(),
    output: "web-audio",
    mediaPaused: null,
  };
}

// ── 안드로이드 「미디어 길」은 걷어냈다 ──────────────────────
//
// 형: 「화두 갤럭시 폰 모바일 소리가 안 난다」 / 「안 들리고… 재점검 제발」
//
// 안드로이드에서만 소리 전부를 MediaStreamAudioDestinationNode 로 돌려
// 숨은 <audio srcObject> 로 되틀던 길이 있었다. 소리를 **살리려고** 넣은
// 것인데, 재어 보니 정확히 그 반대였다 —
//
//   스피커(ac.destination) 로 간 소리 세기 : 0
//   미디어 통(MediaStream) 로 샌 소리 세기 : 224
//
// 크롬은 getUserMedia 가 아닌 MediaStream 을 <audio srcObject> 로 틀면
// 소리를 안 낸다. 그런데 play() 는 **성공으로 떨어진다.** 그래서 코드는
// 「됐다」 하고 speakerReady 를 세우고 masterGain 을 그리로 옮겨 버렸다.
// 갤럭시에서 앱 전체가 벙어리가 된 자리가 여기다. 오류 한 줄 없이.
//
// 안드로이드 크롬은 손짓만 있으면 평범한 ac.destination 으로 잘 운다.
// 길을 하나로 되돌린다 — 재는 자(scripts/sound-output-check.mjs)를 남긴다.
/**
 * 잠든 소리통을 **첫 손짓에** 깨운다.
 *
 * 형: 「웹 버전 소리 안 나노」
 *
 * 브라우저는 사람이 화면을 건드리기 전에는 AudioContext 를 재운다.
 * 우리는 `audio()` 안에서 resume() 을 부르고 있었는데, 그 호출이
 * **손짓 밖에서** 일어나면 브라우저가 그냥 무시한다 — 오류도 안 난다.
 * 폰에서는 화면을 두드리는 그 손짓이 마침 통을 만드는 순간과 겹쳐
 * 우연히 깨어났고, 마우스로 누르는 웹에서는 영영 잠들어 있었다.
 *
 * 그래서 **문서 전체에 한 번만** 귀를 달아 둔다. 어디를 누르든 첫
 * 손짓에 깨우고 곧바로 귀를 뗀다.
 */
let waking = false;
function armWake() {
  if (waking || typeof window === "undefined") return;
  waking = true;
  document.addEventListener("pointerdown", 깨우기, true);
  document.addEventListener("touchstart", 깨우기, true);
  document.addEventListener("touchend", 깨우기, true);
  document.addEventListener("pointerup", 깨우기, true);
  document.addEventListener("click", 깨우기, true);
  document.addEventListener("keydown", 깨우기, true);
  // 다른 앱에 갔다 오면 iOS 는 통을 재운다 — 돌아올 때도 한 번 깨운다
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") 깨우기();
  });
}

/**
 * 잠든 통을 되살린다.
 *
 * 형: 「소리가 다 안 나긴 해, 모바일 아직」
 *
 * 두 군데가 틀렸었다.
 *
 * ① **"suspended" 하나만 봤다.** iOS 는 전화·시리·다른 앱 소리·화면
 *    잠금 뒤에 통을 `"interrupted"` 로 세워 둔다. 표준에 없는 값이라
 *    `=== "suspended"` 검사에 안 걸리고, 그래서 아무도 깨우지 않았다.
 *    폰에서 한 번 끊기면 앱을 완전히 다시 띄우기 전까지 전부 무음이었다.
 *
 * ② **한 번 켜지면 귀를 뗐다.** running 이 되는 순간 리스너 셋을 모두
 *    떼고 `waking` 은 true 로 남아 다시 달 길이 없었다. 그 뒤에 ①이
 *    일어나면 끝이다. 귀 셋은 켜져 있어도 거의 공짜다 — 떼지 않는다.
 */
/**
 * 통마다 **딱 한 번**의 resume 약속. 모두가 이 하나를 기다린다.
 *
 * 형: 「진심 아직도 안 남, 모바일도 설치한 것도」 — 다섯 번 고쳐도 안 났다.
 * 남은 사실은 하나: 사운드체크 ①(판이 직접 만든 통 — new → await resume →
 * 소리)은 형 폰에서 **늘** 난다. 엔진은 통을 만든 뒤 ①이 안 하는 일을 했다:
 * 한 탭에 캡처 리스너 다섯이 resume 을 다섯 번, 4초 타이머 다섯 개, 1프레임
 * 무음 버퍼를 destination 에 꽂아 start. 어느 것이 범인인지 가설을 세우지
 * 않는다 — **①과 글자 그대로 같게** 만든다. resume 하나, 약속 하나, 그 외 없음.
 */
let 깨움약속: Promise<void> | null = null;
let 깨움통: AudioContext | null = null;
let 지킴통: AudioContext | null = null;
function 깨어남(ac: AudioContext): Promise<void> {
  if (ac.state === "running") return Promise.resolve();
  // **손짓 밖**(판 뜰 때 데우기)에서 건 resume 은 크롬이 나중 손짓으로 살려 주지
  // 않는다 — 그 약속을 기억해 두면 탭이 와도 영영 안 풀린다(측정으로 잡음:
  // destination 세기 0). 그래서 손짓 밖에서는 걸어만 두고 기억하지 않는다.
  // 기억하는 것은 **손짓 안에서 건 첫 resume** 하나다. 모두가 그것을 기다린다.
  if (손짓있었나() === false) {
    void ac.resume().catch(() => {});
    return 깨움약속 ?? new Promise<void>(() => {});
  }
  if (깨움통 !== ac) {
    깨움통 = ac;
    깨움약속 = ac.resume().catch(() => {});
  }
  return 깨움약속 ?? Promise.resolve();
}

function 깨우기() {
  const ac = audioContext();
  if (!ac) return;
  if (ac.state !== "running") {
    const 약속 = 깨어남(ac);
    // 손짓이 있었는데도 4초 안에 안 깨면 화면에 말한다 — 통마다 한 번만 건다.
    // (손짓 없는 호출 — 판 뜰 때 데우기 — 는 suspended 가 정상이라 안 센다)
    if (손짓있었나() === true && 지킴통 !== ac) {
      지킴통 = ac;
      const 지킴 = window.setTimeout(() => {
        if (ac === actx && ac.state !== "running") {
          console.warn("[화두 소리] 통이 안 깨어난다 — state:", ac.state);
          소리막힘알림("asleep", ac.state);
        }
      }, 4_000);
      void 약속.then(() => window.clearTimeout(지킴));
    }
  }
  // 압축기는 뺐지만 masterGain 은 첫 손짓에 세워 둔다(첫 타 지연 없게).
  // 손짓이 있었을 때만 — 판 뜰 때 데우는 호출에서 세우면 헛알림을 부른다.
  if (!bus && 손짓있었나() === true) master(ac);
}
/** 이 문서에서 손짓이 한 번이라도 있었나 — 모르는 브라우저면 undefined */
function 손짓있었나(): boolean | undefined {
  return (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
}

/**
 * 아이폰 옆구리 무음 스위치를 비껴간다.
 *
 * iOS 는 그 스위치가 올라가 있으면 WebAudio 를 **통째로 묵살한다** —
 * 오류도 없고 state 는 running 그대로다. 그래서 「되는 것 같은데 안
 * 들린다」가 된다. 카테고리를 playback 으로 바꾸면 음악 앱처럼 쳐 줘서
 * 스위치를 타지 않는다. (Safari 16.4+. 없는 데서는 그냥 넘어간다.)
 *
 * **아이폰에서만 건다.** 크롬도 이 손잡이를 받는데, 안드로이드에서
 * playback 으로 돌리면 오디오 포커스를 새로 달라고 하는 셈이라
 * 다른 앱이 쥐고 있을 때 우리 소리가 죽을 수 있다. 갤럭시가 벙어리인
 * 동안은 **내가 끼워 넣은 변수부터** 뺀다 — 안드로이드는 애초에
 * 무음 스위치가 없으니 이 손잡이가 필요 없다.
 */
function 무음스위치비껴가기() {
  if (!/iPad|iPhone|iPod/.test(navigator.userAgent ?? "")) return;
  try {
    const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (s) s.type = "playback";
  } catch {
    /* 못 바꿔도 소리는 난다 — 무음 스위치만 탄다 */
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!actx || actx.state === "closed") {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      무음스위치비껴가기();
      actx = new AC();
      noiseBuf = null;
      breathBuf = null;
      hallNode = null;
      hallGain = null;
      bus = null;
      masterGain = null;
      live = [];
    }
    return actx;
  } catch (e) {
    // 여기로 빠지면 모든 strike 가 흔적 없이 무음이 된다. 폰을 chrome://inspect
    // 로 들여다볼 때 이 한 줄이 있어야 「통을 못 만들었다」가 보인다
    console.warn("[화두 소리] 통을 못 만들었다", e);
    return null;
  }
}

function audio(): AudioContext | null {
  if (렌더중) return actx; // 굽는 중 — 바꿔 끼운 오프라인 통을 그대로
  armWake();
  깨우기();
  return actx;
}

// 짧은 백색소음 버퍼 — 나무 결의 재료
let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 절 마당의 울림 — 목탁 소리 뒤에 남는 꼬리.
// 노이즈로 임펄스를 빚어 컨볼버에 물린다(음원 파일 없이 만드는 잔향).
let hallNode: ConvolverNode | null = null;
let hallGain: GainNode | null = null;
function hall(ac: AudioContext): GainNode {
  if (!hallNode || !hallGain) {
    const secs = 1.4;
    const n = Math.floor(ac.sampleRate * secs);
    const ir = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i++) {
        // 앞쪽은 성기게, 뒤로 갈수록 촘촘하게 — 나무 마루 깔린 방의 결
        const decay = Math.pow(1 - i / n, 3.2);
        d[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    hallNode = ac.createConvolver();
    hallNode.buffer = ir;
    // 잔향은 어둡게 — 나무 울림이지 유리가 아니다
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    hallGain = ac.createGain();
    hallGain.gain.value = 1;
    hallGain.connect(lp);
    lp.connect(hallNode);
    const wet = ac.createGain();
    wet.gain.value = 0.85;
    hallNode.connect(wet);
    // 잔향도 압축기를 거친다. 예전엔 곧장 나가서, 빨리 칠 때 울림만
    // 따로 쌓여 찌그러졌다 — 정작 그걸 받으라고 둔 압축기를 비껴갔다.
    // 잔향은 **길에서 뺐다.** 측정상 −50dB(안 들림)인데 형 갤럭시에서 ③ 목탁을
    // 죽인 두 용의자 중 하나다(압축기와 함께). 컨볼버가 NaN 을 내면 섞이는 자리
    // 전체가 무음이 된다. 보내는 쪽(send.connect(hall(ac))) 네 군데는 그대로 두고
    // 받는 끝을 끊는다 — 오는 소리는 여기서 사라진다. 잔향을 살리려면 wet 을
    // 8~12 로 올리고 normalize 를 끈 뒤 **폰에서** 다시 재야 한다.
    // wet.connect(master(ac));  ← 끊음
  }
  return hallGain;
}

// 귀가 아프지 않게 — 세게 쳐도 찌그러지지 않도록 한 번 눌러 준다
let bus: GainNode | null = null;
let masterGain: GainNode | null = null;
function master(ac: AudioContext): GainNode {
  if (!bus) {
    // 형 갤럭시 수사(2026-10-17)의 끝 — 사운드체크 ①②(통→스피커 직행)는 나고
    // ③ 진짜 목탁만 안 났다. ③과 ②의 차이는 **이 사슬**뿐이었다: 압축기와 잔향.
    // 둘 다 재 보니 귀에 안 들리는 기여였다(압축기 +1.5dB, 잔향 −50dB) —
    // 그런데 형 폰에서는 소리를 통째로 먹었다. 들리지도 않는 것이 소리를
    // 죽이면 그건 있을 자리가 없다. 압축기를 길에서 뺀다. masterGain 은 남는다 —
    // 음소거 스위치가 이것 하나로 든다. 사슬은 이제 ②와 같다: 통 → gain → 스피커.
    masterGain = ac.createGain();
    masterGain.gain.value = isSoundMuted() ? 0 : 1;
    masterGain.connect(ac.destination);
    bus = masterGain;
    if (귀노드 && 귀노드.context === ac) masterGain.connect(귀노드);
  }
  // 저장소 변경/계정 전환 후에도 UI의 음소거와 실제 gain이 어긋나지 않는다.
  const 꺼짐 = isSoundMuted();
  masterGain?.gain.setValueAtTime(꺼짐 ? 0 : 1, ac.currentTime);
  // 꺼 놓고 「소리가 안 난다」 하는 길을 막는다 — 소리를 내려 했는데
  // 깃발이 켜져 있으면 그 자리에서 알린다. 머리 오른쪽 스피커는 19px
  // 짜리라 엄지로 스쳐 꺼 놓고도 모른다.
  if (꺼짐) 음소거알림();
  // 백팔배는 기울기(deviceorientation)만으로 센다. 그 판을 새로고침·홈화면·
  // 딥링크로 곧장 열고 손을 안 대면 **손짓이 한 번도 없다** — 기울기는 명세상
  // 활성화 이벤트가 아니라 크롬이 통을 영영 안 깨운다(실측 20초 suspended,
  // 스피커 0 / 톡 한 번 → 1.2초 뒤 running, 221). 소리를 내려는 바로 그 자리에서
  // 「톡 치라」고 말한다. 톡 자체가 armWake 의 캡처 리스너로 깨운다.
  else if (ac.state !== "running" && 손짓있었나() === false) 소리막힘알림("asleep", "no-gesture");
  return bus;
}

/** 소리를 내려 했는데 꺼져 있었다 — 한 번만 알린다 */
export const SOUND_BLOCKED_EVENT = "hwadu-sound-blocked";
/** 왜 막혔나 — muted: 깃발이 켜짐 · asleep: 통이 안 깨어남 */
export type 소리막힘 = { reason: "muted" | "asleep"; state?: string };
// 도배 방지는 **까닭별로 따로** — 한 까닭이 다른 까닭의 알림을 삼키지 않게
const 알린때 = new Map<string, number>();
function 소리막힘알림(reason: 소리막힘["reason"], state?: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const 열쇠 = reason + (state ?? "");
  if (now - (알린때.get(열쇠) ?? 0) < 8_000) return; // 연타에 도배되지 않게
  알린때.set(열쇠, now);
  window.dispatchEvent(new CustomEvent<소리막힘>(SOUND_BLOCKED_EVENT, { detail: { reason, state } }));
}
function 음소거알림() {
  소리막힘알림("muted");
}

/**
 * 통이 깨어 있지 않으면 **깬 뒤에** 친다.
 *
 * 형 갤럭시 수사의 마지막 사실 — 사운드체크 ①(판이 만든 통, resume 을 await
 * 한 뒤 소리를 만듦)은 늘 나고, 엔진이 만든 통은 새로 만들어도(④) 안 났다.
 * 둘의 차이는 순서뿐이다: 엔진은 resume() 을 던져 놓고 **바로** 노드를 만들어
 * 시작시켰다. 명세로는 깨어나면 밀린 소리가 나와야 하지만, 형 폰 크롬은
 * 「아직 안 깬 통에 꽂은 소리」를 버린다. ①과 같은 순서로 맞춘다 —
 * running 이면 지금, 아니면 resume 이 풀린 뒤 **같은 손짓 안에서** 다시.
 * 한 번만 미룬다 — 깨어난 뒤에도 안 돌면 그 소리는 버린다(무한 되풀이 방지).
 */
const 미룬것 = new Map<string, () => void>();
let 미룸통: AudioContext | null = null;
function 깬뒤에(ac: AudioContext, 열쇠: string, 다시: () => void): boolean {
  if (렌더중 || ac.state === "running") return true;
  // 손짓이 한 번도 없었으면 resume 은 영영 안 풀린다(백팔배 기울기 셈) —
  // 미루면 약속만 절마다 쌓인다. 말만 하고 버린다. 톡 뒤 첫 절부터 정상.
  if (손짓있었나() === false) {
    소리막힘알림("asleep", "no-gesture");
    return false;
  }
  // 같은 소리는 **마지막 하나만** 남긴다 — 염주를 쓸거나 자동 목탁이 돌 때
  // 안 깬 사이 들어온 타들이 깨는 순간 한 덩어리로 터지지 않게.
  미룬것.set(열쇠, 다시);
  // resume 을 따로 걸지 않는다 — 통마다 하나뿐인 그 약속(깨어남)을 기다린다.
  // 통이 바뀌면(통닫기) 옛 약속은 버린다.
  if (미룸통 !== ac) {
    미룸통 = ac;
    void 깨어남(ac).then(() => {
      if (미룸통 === ac) 미룸통 = null;
      const 둘 = [...미룬것.values()];
      미룬것.clear();
      if (ac !== actx || ac.state !== "running") return;
      for (const f of 둘) f();
    });
  }
  return false;
}

/** 바깥에서 통을 깨운다 — 「다시」 단추가 손짓 안에서 부른다 */
export function wakeSound() {
  깨우기();
}

/**
 * 점검용 — **엔진의 통**으로 맨소리를 낸다. 압축기·잔향·masterGain 을 안 거치고
 * destination 에 바로 꽂는다. 사운드체크의 ①(제 통)은 나는데 목탁은 안 날 때,
 * 이게 나면 통은 멀쩡하고 master() 사슬이 범인이다. 안 나면 통 자체(판 뜰 때
 * 손짓 밖에서 만든 것)가 범인이다.
 */
export function 맨소리(sec = 1) {
  const ac = audio();
  if (!ac) return "통 없음";
  if (!깬뒤에(ac, "맨소리", () => void 맨소리(sec))) return `${ac.state} → 깨운 뒤 냄`;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.value = 523;
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + sec);
  o.connect(g).connect(ac.destination);
  g.connect(귀(ac)); // 재기 — 통 끝에 신호가 왔는지
  o.start();
  o.stop(ac.currentTime + sec + 0.05);
  return ac.state;
}

/**
 * 점검용 — 통 끝(destination 직전)에 귀를 하나 단다. 들을 수 없으니 **센다.**
 * masterGain 과 맨소리 둘 다 여기로도 보낸다. 세기가 0 이면 그래프 안에서
 * 죽은 것이고, 세기는 있는데 안 들리면 통 밖(기기가 이 통에 출력을 안 줌)이다.
 */
let 귀노드: AnalyserNode | null = null;
function 귀(ac: AudioContext): AnalyserNode {
  if (!귀노드 || 귀노드.context !== ac) {
    귀노드 = ac.createAnalyser();
    귀노드.fftSize = 2048;
    masterGain?.connect(귀노드);
  }
  return 귀노드;
}
/** 지금 통 끝의 세기 0~255 와 통의 속사정 */
export function 통사정() {
  const ac = actx;
  if (!ac) return { 세기: -1, 말: "통 없음" };
  let 세기 = -1;
  if (귀노드) {
    const d = new Uint8Array(귀노드.frequencyBinCount);
    귀노드.getByteFrequencyData(d);
    세기 = Math.max(...d);
  }
  const b = (ac as AudioContext & { baseLatency?: number; outputLatency?: number });
  return {
    세기,
    말: `${ac.state} · ${ac.sampleRate}Hz · 지연 ${((b.baseLatency ?? 0) * 1000).toFixed(0)}/${((b.outputLatency ?? 0) * 1000).toFixed(0)}ms · 채널 ${ac.destination.channelCount}/${ac.destination.maxChannelCount} · 시계 ${ac.currentTime.toFixed(1)}`,
  };
}
/** 점검용 — 엔진 통을 아예 닫고 다음 손짓에 새로 만들게 한다 */
export async function 통닫기() {
  if (!actx) return;
  try { await actx.close(); } catch { /* 닫혀 있어도 그만 */ }
  actx = null; bus = null; masterGain = null; 귀노드 = null; hallNode = null; hallGain = null; noiseBuf = null; breathBuf = null; live = [];
  깨움통 = null; 깨움약속 = null; 지킴통 = null; 미룸통 = null; 미룬것.clear();
}

if (typeof window !== "undefined") {
  // 소리가 타이머에서 시작되더라도 앞선 첫 터치를 놓치지 않는다.
  armWake();
  window.addEventListener(SOUND_MUTE_EVENT, () => {
    if (masterGain && actx) {
      masterGain.gain.setTargetAtTime(isSoundMuted() ? 0 : 1, actx.currentTime, 0.015);
    }
    if (isSoundMuted()) hushVoice();
    else 깨우기();
  });
}

// ── 목탁 한 방 ──────────────────────────────────────────────
//
// 코드로 빚어 봤지만 나무는 나무다. 실제로 친 소리를 쓴다 —
//   공유마당 「목탁2」 · 김용배 · CC BY (한국저작권위원회)
//   20초 녹음에서 첫 타 한 번(0.9초)만 잘라 냈다. public/sfx/moktak.wav
// 표기는 /about 도량 안내에 남겨 두었다.
//
// 음원은 한 번만 받아 두고(AudioBuffer), 칠 때마다 새 소스를 물린다.
// 아직 안 받아졌으면 아래 synthMoktak 이 대신 운다 — 첫 타를 놓치지 않게.

//
// **음원은 하나다.**
//
// 한동안 단타와 잔발을 따로 두고 빠르기에 따라 갈아 끼웠다. 그런데
// 잔발 음원(0.2초)은 통이 없어서, 빨리 치면 나무 조각 두드리는 소리가 됐다.
// 몸통을 한 겹 더 깔아 봐도 두 소리가 어긋나 죽이 됐다.
//
// 진짜 목탁은 **한 소리**다. 빨리 치면 그 소리가 겹칠 뿐이다.
// 그래서 형이 준 녹음에서 **울림이 가장 긴 한 방**(목탁2.wav 4.345초 자리,
// 1.3초를 꼬리로 끄는 타점)만 떠 왔다. 빠르기는 아래에서 높이와 여림으로
// 만든다 — 음원을 바꾸지 않는다.
//
// **소리가 둘이다.**
//
// 형: 「목탁 소리 내가 실제로 녹음해 왔거든. 지금 거두 두고 일단
//      목탁소리 2 이런 식으로 해서 발췌해서 다듬어서 넣어 줄 수 있나」
//
//   gongyu — 공유마당 「목탁2」(김용배 · CC BY). 1.3초, 울림이 길다
//   hyung  — 형이 친 실물 목탁. 21.7초 녹음의 16.15초 자리 한 방.
//            방 잡음 꼬리를 재우고 120Hz 아래를 걷어 0.9초로 다듬었다
//            (`_틀/mokclean.mjs`). 으뜸 677Hz — 공유마당 것보다 높고 맑다
//
// 고른 소리는 목탁 화면이 서랍에 적어 두고(hwadu.moktak-sfx.v1) 여기에
// 알려 준다. 둘 다 미리 받아 두지 않는다 — 쓰는 것만 받는다.
// ─────────────────────────────────────────────────────────────
// 다른 길 — <audio> 태그로 음원 파일을 튼다.
//
// 형: 「도대체 왜 안 날까, 다른 방식으로 접근해서 고쳐 봐」
//
// WebAudio 길을 여섯 번 다듬어도 형 갤럭시에서 엔진 소리가 안 났다.
// 그런데 맨 처음 사운드체크에서 **음원 파일(<audio>)은 났다.** 그 길은
// AudioContext 를 아예 안 거친다 — 브라우저가 가장 오래, 가장 널리 트는
// 길이다. 느리고(수십 ms) 겹치면 둔하지만 **난다.** 안드로이드에서는
// 목탁·죽비를 이 길로 보낸다. 되면 나머지 소리도 파일로 구워 이 길로.
// 데스크톱은 그대로 WebAudio(또렷하고 빠르다).
// ─────────────────────────────────────────────────────────────
export type 소리길 = "element" | "webaudio";
/** 소리를 파일로 굽는 중 — 그동안은 WebAudio 길·깨우기 없이 바로 그린다 */
let 렌더중 = false;
/**
 * 굽기 훅 — 엔진의 통을 잠깐 OfflineAudioContext 로 바꿔 끼우고 소리 함수를
 * 돌린다. /dev/render-sfx 가 쓴다. 종·염주·키캡·싱잉볼·돌을 **같은 코드로**
 * 파일에 굽기 위한 것 — 손으로 다시 그리지 않는다.
 */
export function __renderWith(off: OfflineAudioContext, fn: () => void) {
  const 원래 = actx;
  const 원래bus = bus, 원래gain = masterGain, 원래hall = hallNode, 원래hallGain = hallGain, 원래noise = noiseBuf;
  actx = off as unknown as AudioContext;
  bus = null; masterGain = null; hallNode = null; hallGain = null; noiseBuf = null;
  렌더중 = true;
  try { fn(); } finally {
    렌더중 = false;
    actx = 원래; bus = 원래bus; masterGain = 원래gain; hallNode = 원래hall; hallGain = 원래hallGain; noiseBuf = 원래noise;
  }
}
/** 어느 길로 트나 — localStorage hwadoo.sound-path 로 강제할 수 있다(점검용) */
export function 소리길(): 소리길 {
  if (렌더중) return "webaudio";
  if (typeof window === "undefined") return "webaudio";
  const 강제 = window.localStorage.getItem("hwadoo.sound-path");
  if (강제 === "element" || 강제 === "webaudio") return 강제;
  return /Android/i.test(navigator.userAgent) ? "element" : "webaudio";
}
export function set소리길(v: 소리길 | null) {
  if (v) window.localStorage.setItem("hwadoo.sound-path", v);
  else window.localStorage.removeItem("hwadoo.sound-path");
}
/** 음원마다 넷을 돌려 쓴다 — 연타가 앞 소리를 끊지 않게 */
const 엘리먼트들 = new Map<string, HTMLAudioElement[]>();
const 엘리먼트수 = 4;
function 엘리먼트치기(src: string, vol: number): boolean {
  if (typeof window === "undefined") return false;
  if (isSoundMuted()) {
    음소거알림();
    return false;
  }
  let 묶음 = 엘리먼트들.get(src);
  if (!묶음) {
    묶음 = Array.from({ length: 엘리먼트수 }, () => {
      const a = new Audio(src);
      a.preload = "auto";
      (a as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      return a;
    });
    엘리먼트들.set(src, 묶음);
  }
  const a = 묶음.find((x) => x.paused || x.ended) ?? 묶음[0];
  try {
    a.volume = Math.max(0, Math.min(1, vol));
    a.currentTime = 0;
    void a.play().catch((e: unknown) => {
      // 손짓 없이 틀면 브라우저가 막는다 — 그걸 화면에 말한다
      if ((e as { name?: string })?.name === "NotAllowedError") 소리막힘알림("asleep", "no-gesture");
      else console.warn("[화두 소리] 음원 재생 실패", e);
    });
    return true;
  } catch (e) {
    console.warn("[화두 소리] 음원 재생 실패", e);
    return false;
  }
}

export type MoktakVoice = "gongyu" | "hyung";
const MOKTAK_URL: Record<MoktakVoice, string> = {
  gongyu: "/sfx/moktak.wav",
  hyung: "/sfx/moktak2.wav",
};
const moktakBufs: Partial<Record<MoktakVoice, AudioBuffer>> = {};
const moktakAsked: Partial<Record<MoktakVoice, boolean>> = {};
let moktakVoice: MoktakVoice = "gongyu";
/** 지금 울릴 음원 — 아직 안 받아졌으면 null 이고, 빚은 소리가 대신 운다 */
function moktakBuffer(): AudioBuffer | null {
  return moktakBufs[moktakVoice] ?? null;
}

function loadMoktak(ac: AudioContext, v: MoktakVoice = moktakVoice) {
  if (moktakAsked[v]) return;
  moktakAsked[v] = true;
  fetch(MOKTAK_URL[v])
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("no file"))))
    .then((b) => ac.decodeAudioData(b))
    .then((buf) => {
      moktakBufs[v] = buf;
    })
    .catch(() => {
      // 못 받았으면 빚은 소리로 간다 — 조용히
      moktakAsked[v] = false;
    });
}

/** 어느 목탁으로 울릴지 — 고른 그 자리에서 받아 둔다 */
export function setMoktakVoice(v: MoktakVoice) {
  moktakVoice = v;
  const ac = audio();
  if (ac) loadMoktak(ac, v);
}

/** 미리 받아 둔다 — 목탁 방에 들어서는 순간 부르면 첫 타가 늦지 않는다 */
export function warmMoktak() {
  const ac = audio();
  if (ac) loadMoktak(ac);
}

// ── 죽비(竹篦) 음원 ────────────────────────────────────────────
//
// 코드로 빚은 소리를 오래 썼는데, 형 말대로 얇았다. 마른 파열음은
// 대나무가 갈라지는 **결**이 있어야 하는데 잡음을 걸러 만든 소리로는
// 그 결이 안 나온다. 진짜 죽비 한 방을 떼어다 놓는다.
// 못 받았거나 아직 안 받아졌으면 아래 synthJukbi 가 대신 친다.
const JUKBI_URL = "/sfx/jukbi.wav";
let jukbiBuf: AudioBuffer | null = null;
let jukbiAsked = false;

function loadJukbi(ac: AudioContext) {
  if (jukbiAsked) return;
  jukbiAsked = true;
  fetch(JUKBI_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("no file"))))
    .then((b) => ac.decodeAudioData(b))
    .then((buf) => {
      jukbiBuf = buf;
    })
    .catch(() => {
      // 못 받았으면 빚은 소리로 간다 — 조용히
    });
}

/** 미리 받아 둔다 — 삼배·백팔배 방에 들어서는 순간 */
export function warmJukbi() {
  const ac = audio();
  if (ac) loadJukbi(ac);
}

// ── 목탁 한 방 ──
//
// **빠르기에 따라 소리를 바꾸지 않는다.** 이게 이 파일에서 제일 오래
// 헤맨 자리다.
//
// 한동안 빨리 칠수록 음을 올리고(playbackRate), 여리게 하고, 낮은 통을
// 깎고, 꼬리를 자르고, 앞 소리를 눌렀다. 「잔발은 손목만 쓰니까」라는
// 그럴듯한 이유가 있었는데, 형 귀에는 이렇게 들렸다 —
//
//   「토스꺼는 빠르게 쳐도 일정한 공명음이 유지되는데
//     우리꺼는 빠르게 칠수록 소리가 개같아짐」
//
// 맞는 말이다. 진짜 목탁은 빨리 친다고 음이 올라가지 않는다. **같은
// 소리가 겹칠 뿐이다.** 그래서 이제 한 방은 언제나 똑같이 운다 —
// 같은 음, 같은 여림, 같은 꼬리, 끝까지. 나무라서 생기는 아주 작은
// 흔들림(±1%)만 남긴다.
//
// 겹쳐서 커지는 것은 소리를 깎아서가 아니라 **master 의 압축기**가
// 받는다. 그게 제 일이다.

/** 지금 울고 있는 소리들 — 오래된 것부터 앞에 */
let live: { g: GainNode; src: AudioBufferSourceNode }[] = [];

/**
 * 한꺼번에 울려도 좋은 소리의 수.
 *
 * 넘으면 **가장 오래된 것부터** 거둔다. 새로 친 소리는 절대 안 건드린다 —
 * 오래된 소리는 이미 꼬리 끝이라 조용히 사라지고, 방금 친 소리는
 * 온전히 운다. 거꾸로 하면(새 소리를 눌러 끄면) 형이 들은 그 소리가 난다.
 */
const VOICES = 8;

export function strikeMoktak(vol: number) {
  if (소리길() === "element") {
    엘리먼트치기(MOKTAK_URL[moktakVoice], vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "strikeMoktak", () => void strikeMoktak(vol))) return;
  loadMoktak(ac);

  const t = ac.currentTime;

  // 지금 고른 목탁 — 아직 안 받아졌으면 빚은 소리가 대신 운다
  const buf = moktakBuffer();
  if (!buf) {
    synthMoktak(ac, vol, 0);
    return;
  }

  // 자리가 모자라면 가장 오래된 소리부터 거둔다
  while (live.length >= VOICES) {
    const old = live.shift();
    if (!old) break;
    try {
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setValueAtTime(Math.max(0.0001, old.g.gain.value), t);
      old.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      old.src.stop(t + 0.17);
    } catch {
      /* 이미 끝난 소리 */
    }
  }

  const src = ac.createBufferSource();
  src.buffer = buf;
  // 나무라서 생기는 흔들림. 이게 전부다 — 빠르기는 여기 안 들어온다
  src.playbackRate.value = 0.995 + Math.random() * 0.01;

  // 바닥의 웅웅거림만 턴다. 통울림은 건드리지 않는다
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 70;
  hp.Q.value = 0.7;

  const out = ac.createGain();
  out.gain.value = vol * (0.97 + Math.random() * 0.06);

  src.connect(hp);
  hp.connect(out);
  out.connect(master(ac));

  // 방의 울림 — 늘 같은 몫으로 보낸다
  const send = ac.createGain();
  send.gain.value = vol * 0.28;
  out.connect(send);
  send.connect(hall(ac));

  src.start(t);
  // **꼬리를 자르지 않는다.** 음원이 제 끝까지 간다(1.3초).
  src.stop(t + buf.duration / src.playbackRate.value + 0.05);

  const voice = { g: out, src };
  live.push(voice);
  src.onended = () => {
    live = live.filter((v) => v !== voice);
  };
}

// ── 종(鐘) — 경쇠와 범종 ────────────────────────────────────
//
// 형: 「효과음 좀더 불교스럽게 다시해. 종이든 목탁이든 죽비든.
//      지금 넘 이상하고」
//
// 삼배에 죽비만 딱딱 치고 있었다. 죽비는 **시작과 끝을 알리는** 소리지
// 한 배 한 배에 얹는 소리가 아니다. 절에서 절할 때 울리는 건 종이다.
//
// 한국 종이 서양 종과 다른 까닭은 **맥놀이(beating)** 다. 종이 좌우로
// 꼭 같지 않아 아주 가까운 두 음이 같이 울고, 그 차이만큼 소리가
// 「우웅— 우웅—」 하고 부풀었다 잦아든다. 그래서 배음마다 짝을 지어
// 1~2Hz 어긋낸 둘을 함께 울린다. 이 한 가지가 종을 종으로 만든다.
//
// 배음은 정수배가 아니다(비조화). 그래서 종소리는 「음정」이 아니라
// 「울림」으로 들린다.
const BELL_PARTIALS = [
  // [배음비, 여림, 꼬리(초), 맥놀이(Hz)]
  [1.0, 1.0, 1.0, 0.7],
  [2.0, 0.6, 0.8, 1.1],
  [2.42, 0.42, 0.62, 1.7],
  [3.36, 0.3, 0.48, 2.3],
  [4.55, 0.2, 0.36, 3.1],
  [5.9, 0.12, 0.26, 4.2],
  // 아주 높은 배음 하나 — 치는 순간 반짝 하고 먼저 사라진다.
  // 이게 있어야 「쇠」로 들린다
  [8.2, 0.06, 0.16, 5.5],
] as const;

/**
 * 종 한 번.
 * @param size 0 = 경쇠(작고 맑게) · 1 = 범종(크고 길게)
 */
export function strikeBell(vol: number, size = 0) {
  if (소리길() === "element") {
    엘리먼트치기(size ? "/sfx/bell-large.wav" : "/sfx/bell-small.wav", vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "strikeBell", () => void strikeBell(vol, size))) return;
  const t = ac.currentTime;

  // 형: 「효과음만, 더 광명 공명 더 간지나게」
  // 목소리를 뺀 자리를 종이 채운다 — 더 낮고, 더 길게 끈다.
  // 경쇠는 2.6 → 4.4초, 범종은 7.2 → 11초. 절에서 종 한 번 치면
  // 말이 끊기고 그 울림만 남는데, 그 결을 살린다.
  const f0 = size ? 116 : 404;
  const life = size ? 11 : 4.4;

  const out = ac.createGain();
  out.gain.value = vol * (size ? 0.74 : 0.58);
  out.connect(master(ac));
  const send = ac.createGain();
  // 방 울림을 넉넉히 — 광명이 퍼지는 결은 잔향이 만든다
  send.gain.value = vol * (size ? 0.62 : 0.4);
  out.connect(send);
  send.connect(hall(ac));

  for (const [ratio, amp, tail, beat] of BELL_PARTIALS) {
    // 짝을 지어 아주 조금 어긋낸 둘 — 이 어긋남이 맥놀이를 만든다
    for (const d of [-beat / 2, beat / 2]) {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f0 * ratio + d;
      const g = ac.createGain();
      const peak = amp * (size ? 0.3 : 0.26);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + life * tail);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + life * tail + 0.1);
    }
  }

  // 채가 닿는 그 순간 — 쇠가 부딪히는 아주 짧은 기척
  const s = ac.createBufferSource();
  s.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = size ? 1900 : 3400;
  bp.Q.value = 1.4;
  const gk = ac.createGain();
  gk.gain.setValueAtTime(size ? 0.1 : 0.16, t);
  gk.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(bp);
  bp.connect(gk);
  gk.connect(out);
  s.start(t);
  s.stop(t + 0.1);
}

// ── 빚은 목탁 — 음원이 없을 때만 ────────────────────────────
// 딱(채가 닿는 표면) + 퍽(때리는 힘) + 통(속 빈 구멍) + 어긋난 배음 넷.
// 나무는 짧게 끝난다 — 길게 끌면 종이 된다.
function synthMoktak(ac: AudioContext, vol: number, speed = 0) {
  const t = ac.currentTime;

  const out = ac.createGain();
  // 잔발은 여리게 — 음원 있을 때와 같은 결(strikeMoktak 주석 참고)
  out.gain.value = vol * 1.5 * (1 - 0.42 * speed);
  out.connect(master(ac));

  const send = ac.createGain();
  send.gain.value = vol * 0.34 * (1 - 0.82 * speed);
  out.connect(send);
  send.connect(hall(ac));

  // 빠를수록 높고 짧게 — 속 빈 통이 낮은 소리를 다 울 틈이 없다
  const drift = (0.96 + Math.random() * 0.08) * (1 + 0.22 * speed);
  const shrink = 1 - 0.5 * speed;
  const burst = (dur: number) => {
    const s = ac.createBufferSource();
    s.buffer = noise(ac);
    s.loop = true;
    s.start(t);
    s.stop(t + dur + 0.02);
    return s;
  };

  {
    const s = burst(0.03);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
    s.connect(hp);
    hp.connect(g);
    g.connect(out);
  }
  {
    const s = burst(0.06);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1150 * drift;
    bp.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.034);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
  }
  {
    const s = burst(0.3);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 248 * drift;
    bp.Q.value = 7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * (1 - 0.55 * speed), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24 * shrink);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
  }

  const base = 452 * drift;
  ([
    [1, 0.5, 0.3],
    [1.58, 0.34, 0.19],
    [2.71, 0.2, 0.11],
    [4.36, 0.1, 0.06],
  ] as const).forEach(([mul, amp, dur]) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(base * mul, t);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
  });
}

// 염주 한 알 — 알끼리 부딪는 또렷한 딸깍 (묵직한 속살 한 점 포함)
export function clickBead(vol: number) {
  if (소리길() === "element") {
    엘리먼트치기("/sfx/bead.wav", vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "clickBead", () => void clickBead(vol))) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol * 1.15;
  out.connect(master(ac));

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);

  const o = ac.createOscillator();
  o.type = "sine";
  const f = 1700 + Math.random() * 200;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.035);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.08);

  // 알의 속살 — 낮은 나무 울림 아주 짧게 (소리에 무게를 준다)
  const o3 = ac.createOscillator();
  o3.type = "sine";
  o3.frequency.setValueAtTime(420 + Math.random() * 40, t);
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.0001, t);
  g3.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o3.connect(g3);
  g3.connect(out);
  o3.start(t);
  o3.stop(t + 0.08);
}

// ── 싱잉볼(magic bowl) — 한 번 치면 오래 운다 ─────────────────
//
// 목탁은 나무라 녹음을 썼다. 싱잉볼은 반대다 — 금속 그릇의 소리는
// **몇 개의 배음과 아주 긴 감쇠**가 거의 전부라, 빚는 편이 녹음보다 낫다.
// 녹음은 30초짜리라 파일이 무겁고 자르면 꼬리가 뚝 끊긴다.
//
// 싱잉볼의 결 세 가지를 그대로 옮겼다 —
//  ① 배음이 정수배가 아니다. 1 : 2.74 : 5.40 : 8.93 — 종·그릇의 비율이다.
//     정수배로 깔면 오르간이 된다.
//  ② **울렁임(beating)**. 그릇은 완벽한 동그라미가 아니어서 같은 모드가
//     아주 조금 어긋난 두 주파수로 갈린다. 그 차(0.7~2Hz)가 「우- 웅- 우- 웅-」
//     하는 맥놀이다. 이게 없으면 그냥 신시사이저 소리다.
//  ③ 높은 배음일수록 먼저 죽는다. 그래서 시간이 갈수록 소리가 둥글어진다.
//
// 채로 때린 순간의 「탁」도 아주 짧게 얹는다 — 그게 없으면 소리가
// 어디선가 스르륵 생겨난 것처럼 들린다.

/** 배음 비율 · 처음 세기 · 감쇠(초) · 갈라짐(Hz) */
const BOWL_MODES: [ratio: number, gain: number, decay: number, split: number][] = [
  [1, 0.42, 14, 0.7],
  [2.74, 0.3, 9.5, 1.1],
  [5.4, 0.16, 5.5, 1.7],
  [8.93, 0.075, 3.2, 2.3],
  [13.3, 0.03, 1.8, 3.1],
];

/** 그릇의 기본음 — 큰 그릇일수록 낮다. 셋을 돌려 쓴다(작은·중간·큰) */
export const BOWL_TONES = [
  { id: "small", label: "작은 그릇", hz: 288 },
  { id: "mid", label: "중간 그릇", hz: 210 },
  { id: "big", label: "큰 그릇", hz: 146 },
] as const;

export type BowlTone = (typeof BOWL_TONES)[number]["id"];

/** 지금 울고 있는 그릇 — 다시 치면 앞 소리를 부드럽게 재운다 */
let bowlStop: (() => void) | null = null;

/** 울고 있는가 — 화면이 「그치기」 단추를 보일지 정한다 */
export function bowlRinging(): boolean {
  return bowlStop !== null;
}

/** 여운을 남기고 그친다 (손바닥으로 그릇을 감싸 쥐듯) */
export function hushBowl(sec = 1.1) {
  bowlStop?.();
  bowlStop = null;
  void sec;
}

/**
 * 싱잉볼을 한 번 친다. 이미 울고 있으면 앞 소리를 재우고 새로 친다.
 * 돌려주는 값은 이 소리가 몇 초쯤 갈지 — 화면이 여운을 그릴 때 쓴다.
 */
export function strikeBowl(vol: number, tone: BowlTone = "mid"): number {
  if (소리길() === "element") {
    bowlStop?.();
    const src = `/sfx/bowl-${tone}.wav`;
    if (!엘리먼트치기(src, vol)) return 0;
    const a = 엘리먼트들.get(src)?.find((x) => !x.paused) ?? null;
    const stop = () => {
      if (!a) return;
      // 부드럽게 재운다 — 1초에 걸쳐 볼륨을 내리고 멈춘다
      const 처음 = a.volume;
      const t0 = Date.now();
      const id = window.setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / 1000);
        a.volume = 처음 * (1 - k);
        if (k >= 1) { window.clearInterval(id); a.pause(); a.volume = 처음; }
      }, 40);
    };
    bowlStop = stop;
    a?.addEventListener("ended", () => { if (bowlStop === stop) bowlStop = null; }, { once: true });
    return 14;
  }
  const ac = audio();
  if (!ac) return 0;
  // 0 을 돌려주면 호출처가 `if (!secs) return` 으로 공덕·여운 UI 를 건너뛰고,
  // 소리만 뒤늦게 난다(리뷰에서 잡음). 가장 긴 여운을 돌려준다
  if (!깬뒤에(ac, "strikeBowl", () => void strikeBowl(vol, tone))) return 14;
  const base = BOWL_TONES.find((b) => b.id === tone)?.hz ?? 210;
  const t = ac.currentTime;

  // 앞 소리는 짧게 재운다 — 뚝 끊지 않는다
  bowlStop?.();

  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(master(ac));
  // 잔향 — 법당 울림을 조금만 태운다
  const send = ac.createGain();
  send.gain.value = 0.5;
  out.connect(send);
  send.connect(hall(ac));

  const nodes: { osc: OscillatorNode[]; g: GainNode } = { osc: [], g: out };
  let longest = 0;

  for (const [ratio, gain, decay, split] of BOWL_MODES) {
    longest = Math.max(longest, decay);
    // 한 모드를 두 갈래로 — 이 미세한 어긋남이 맥놀이를 만든다
    for (const side of [-0.5, 0.5]) {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = base * ratio + side * split;
      const g = ac.createGain();
      // 때린 순간 솟았다가 길게 사그라든다
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012 + ratio * 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
      nodes.osc.push(o);
    }
  }

  // 채가 닿는 순간 — 아주 짧은 금속 긁힘
  const hit = ac.createBufferSource();
  hit.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = base * 6;
  bp.Q.value = 1.1;
  const hg = ac.createGain();
  hg.gain.setValueAtTime(0.5, t);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  hit.connect(bp);
  bp.connect(hg);
  hg.connect(out);
  hit.start(t);

  // 그치기 — 소리를 1초쯤에 걸쳐 재우고 발을 뺀다
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    const now = ac.currentTime;
    try {
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      for (const o of nodes.osc) o.stop(now + 1.2);
    } catch {
      /* 이미 끝난 소리 */
    }
    if (bowlStop === stop) bowlStop = null;
  };
  bowlStop = stop;
  // 제 수명을 다하면 스스로 물러난다
  window.setTimeout(() => {
    if (bowlStop === stop) bowlStop = null;
  }, (longest + 0.3) * 1000);

  return longest;
}

export function buzz(ms: number) {
  if (isVibeOff()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* 진동이 없는 기기 */
  }
}

/** 돌을 얹을 때의 낮은 둔탁한 울림. 층이 오를수록 아주 조금 맑아진다. */
export function strikeStone(vol = 0.3, layer = 0) {
  if (소리길() === "element") {
    엘리먼트치기(`/sfx/stone-${Math.max(0, Math.min(3, Math.round(layer)))}.wav`, vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "strikeStone", () => void strikeStone(vol, layer))) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(Math.min(0.46, vol), t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  out.connect(master(ac));

  const body = ac.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(142 + layer * 9, t);
  body.frequency.exponentialRampToValueAtTime(88 + layer * 5, t + 0.16);
  body.connect(out);
  body.start(t);
  body.stop(t + 0.2);

  const grit = ac.createBufferSource();
  grit.buffer = noise(ac);
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 980;
  const hit = ac.createGain();
  hit.gain.setValueAtTime(0.22, t);
  hit.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  grit.connect(low);
  low.connect(hit);
  hit.connect(out);
  grit.start(t);
  grit.stop(t + 0.06);
}


// ── 숨소리 — 들숨·날숨 ─────────────────────────────────────────
// 목탁은 한 방이라 0.06초 버퍼로 족했지만, 숨은 몇 초를 이어 간다.
// 짧은 버퍼를 돌리면 그 반복 주기가 '웅—' 하는 음으로 들리므로,
// 한 호흡을 통째로 덮을 만큼 길게(8초) 한 번만 빚어 두고 돌려 쓴다.
// 백색이 아니라 핑크 노이즈 — 높은 대역이 눌려 사람 숨결에 가깝다.
let breathBuf: AudioBuffer | null = null;
function breathNoise(ac: AudioContext): AudioBuffer {
  if (!breathBuf) {
    const len = Math.floor(ac.sampleRate * 8);
    breathBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = breathBuf.getChannelData(0);
    // Paul Kellet 근사 — 필터 여럿을 겹쳐 1/f 기울기를 만든다
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return breathBuf;
}

// 한 호흡을 빚는다. 들숨은 밝아지며 차오르고, 날숨은 어두워지며 잦아든다.
// 돌려주는 함수를 부르면 곧바로 숨을 거둔다 — 마디가 바뀌거나 판을 마칠 때.
function breathe(kind: "in" | "out", sec: number, vol: number): () => void {
  const ac = audio();
  // vol 0 으로 부르면 소리는 내지 않고 오디오 문만 연다(첫 터치에서 깨우기)
  if (!ac || sec <= 0 || vol <= 0) return () => {};
  // 다른 소리와 같은 병 — 안 깬 통에 꽂지 않는다. 돌려주는 「거두기」는
  // 뒤늦게 시작된 숨을 마디가 바뀔 때 끌 수 있게 바꿔 끼운다
  let hush: () => void = () => {};
  if (!깬뒤에(ac, "breathe", () => { hush = breathe(kind, sec, vol); })) return () => hush();
  try {
    const t = ac.currentTime;
    const dur = Math.max(0.3, sec);
    const rise = kind === "in";

    const out = ac.createGain();
    out.gain.value = rise ? vol : vol * 0.8; // 날숨은 들숨보다 조금 낮게
    out.connect(master(ac));

    const src = ac.createBufferSource();
    src.buffer = breathNoise(ac);
    src.loop = true; // 8초를 넘겨 부르는 일은 드물지만, 끊기지는 않게

    // 코를 지나는 바람의 자리 — 이 통과 대역이 '스으—' 를 만든다
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.85;
    if (rise) {
      bp.frequency.setValueAtTime(420, t);
      bp.frequency.exponentialRampToValueAtTime(1250, t + dur * 0.7);
      bp.frequency.exponentialRampToValueAtTime(880, t + dur);
    } else {
      bp.frequency.setValueAtTime(1050, t);
      bp.frequency.exponentialRampToValueAtTime(360, t + dur);
    }

    // 바닥의 웅웅거림은 걷어낸다 — 숨은 가벼워야 한다
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 170;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    if (rise) {
      // 들숨 — 천천히 차올라 끝자락에서 멎는다
      g.gain.exponentialRampToValueAtTime(0.95, t + dur * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      // 날숨 — 처음에 툭 터지고 길게 놓아 준다
      g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    src.connect(bp);
    bp.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.1);

    let hushed = false;
    return () => {
      if (hushed) return;
      hushed = true;
      try {
        const now = ac.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12); // 뚝 끊기면 '툭' 한다
        src.stop(now + 0.16);
      } catch {
        /* 이미 멎은 숨 */
      }
    };
  } catch {
    return () => {}; // 소리는 곁가지다 — 조용히 삼킨다
  }
}

// 들숨 — sec 초 동안 차오른다
export function breatheIn(sec: number, vol = 0.45) {
  return breathe("in", sec, vol);
}

// 날숨 — sec 초 동안 잦아든다
export function breatheOut(sec: number, vol = 0.45) {
  return breathe("out", sec, vol);
}

// 첫 터치에서 오디오 문을 미리 열어 둔다 — 첫 들숨이 늦지 않게
export function wakeBreath() {
  audio();
}

// 죽비(竹篦) + 종울림 — 삼배의 소리.
//
// 처음엔 마른 딱 소리 하나였다. 절 한 번에 0.1초짜리 잡음 한 점이라,
// 큰절을 올리는 몸짓에 견주면 너무 가벼웠다 — 소리가 손톱 튕기는 것 같았다.
//
// 그래서 두 겹으로 앉혔다.
//   ① 죽비  마른 파열음. 박자를 이끄는 것은 여전히 이쪽이다(짧게, 여리게).
//   ② 울림  낮은 범종 한 점. 배음을 정수배가 아니라 **살짝 어긋나게** 쌓는다 —
//           실제 종은 배음이 어긋나 있어서 그 어긋남이 맥놀이(beating)를 만들고,
//           그게 「신비롭다」고 느끼는 소리의 정체다. 정수배로 쌓으면 오르간이 된다.
//   꼬리는 2초 가까이 끈다. 절 한 번에 걸리는 시간이 그쯤이라, 다음 절을
//   시작할 즈음 앞 소리가 막 사라진다.
export function strikeJukbi(vol: number) {
  if (소리길() === "element") {
    엘리먼트치기("/sfx/jukbi.wav", vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "strikeJukbi", () => void strikeJukbi(vol))) return;
  loadJukbi(ac);
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(master(ac));

  // ① 죽비 — 진짜 한 방. 칠 때마다 아주 조금씩 다르게 울려야
  //    기계가 아니라 사람이 치는 것처럼 들린다(빠르기 ±3%).
  if (jukbiBuf) {
    const real = ac.createBufferSource();
    real.buffer = jukbiBuf;
    real.playbackRate.value = 0.97 + Math.random() * 0.06;
    const rg = ac.createGain();
    rg.gain.value = 0.95;
    real.connect(rg);
    rg.connect(out);
    real.start(t);
  } else {
    // 아직 안 받아졌다 — 빚은 소리로 첫 타를 놓치지 않는다
    const src = ac.createBufferSource();
    src.buffer = noise(ac);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2300 + Math.random() * 400;
    bp.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);

    // 대나무의 속 — 짧게 떨어지는 울림 한 점
    const o = ac.createOscillator();
    o.type = "triangle";
    const f = 880 + Math.random() * 120;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.07);
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.22, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2);
    g2.connect(out);
    o.start(t);
    o.stop(t + 0.12);
  }

  // ② 범종 한 점 — 어긋난 배음 넷.
  //   2.76·5.40·8.93 은 실제 종(종형 진동체)의 배음비에 가깝다.
  //   딱 떨어지지 않는 수라 서로 맥놀이를 만든다.
  const base = 108 + Math.random() * 4; // 낮게 — 가슴에 닿는 자리
  const PARTIALS: Array<[number, number, number]> = [
    [1, 0.5, 2.1],     // [배음비, 크기, 꼬리(초)]
    [2.0, 0.26, 1.7],
    [2.76, 0.2, 1.35],
    [5.4, 0.1, 0.85],
    [8.93, 0.05, 0.5],
  ];
  // 진짜 죽비가 두툼해서, 뒤에 깔리는 범종은 한 뼘 눌러 둔다.
  // 그래도 빼지는 않는다 — 「웅장하고 신비롭게」의 팔 할이 이 한 점이다.
  const bell = ac.createGain();
  bell.gain.value = jukbiBuf ? 0.42 : 0.62;
  bell.connect(out);
  for (const [ratio, amp, tail] of PARTIALS) {
    const p = ac.createOscillator();
    p.type = "sine";
    p.frequency.setValueAtTime(base * ratio, t);
    // 아주 조금 처진다 — 금속이 식듯이
    p.frequency.exponentialRampToValueAtTime(base * ratio * 0.995, t + tail);
    const pg = ac.createGain();
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + tail);
    p.connect(pg);
    pg.connect(bell);
    p.start(t);
    p.stop(t + tail + 0.05);
  }

  // 맥놀이 한 겹 — 같은 음을 아주 조금 어긋나게 겹쳐 둔다.
  // 이 한 줄이 「신비롭다」의 팔 할이다.
  const beat = ac.createOscillator();
  beat.type = "sine";
  beat.frequency.value = base * 2.0 + 0.7;
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  beat.connect(bg);
  bg.connect(bell);
  beat.start(t);
  beat.stop(t + 1.8);
}

// ── 소리 내어 읽기(音聲) ───────────────────────────────────────
//
// 삼귀의는 원래 **소리 내어** 하는 것이다. 글로만 떠 있으면 눈으로 읽고 만다.
//
// 지금은 브라우저가 가진 목소리(Web Speech)를 쓴다. 안드로이드·아이폰의
// 기본 한국어 목소리라 길 안내 톤이고, 스님 목소리가 아니다 —
// **음원(mp3)이 들어오면 이 함수만 갈아 끼우면 된다.** 부르는 쪽은 그대로 둔다.
//   public/voice/sambae-1.mp3 … 를 놓고 여기서 new Audio(...).play() 로 바꾼다.
//
// 브라우저가 못 읽으면 조용히 지나간다 — 절은 소리가 없어도 절이다.

let voiceOn = true;

export function setVoice(on: boolean) {
  voiceOn = on;
  if (!on) hushVoice();
}

export function voiceReady(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** 읽던 것을 멈춘다 — 다음 절이 앞말을 밟지 않게 */
export function hushVoice() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* 없으면 없는 대로 */
  }
}

/** 한 줄을 읽는다. 느리게, 낮게 — 예불의 결에 맞춘다. */
export function speak(text: string) {
  if (isSoundMuted() || !voiceOn || !voiceReady() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    // 형: 「발음 좀만 더 자연스럽게, 중후하게」
    //
    // 0.82 는 **너무 느렸다.** 느리게 읽으면 경건해질 줄 알았는데,
    // 기계가 한 자씩 끊어 읽는 소리가 나 오히려 어색했다. 사람이 천천히
    // 말하는 빠르기는 0.9 언저리다. 대신 음을 더 낮춰(0.78) 무게를 준다.
    u.rate = 0.9;
    u.pitch = 0.78;
    u.volume = 1;
    // 한국어 목소리 중 **남성·저음**을 먼저 고른다. 기기 기본은 대개
    // 길 안내용 여성 고음이라 예불의 결과 멀다. 없으면 아무 한국어나.
    const kos = synth.getVoices().filter((v) => v.lang?.startsWith("ko"));
    const low =
      kos.find((v) => /male|남|민준|진수|yuna|^(?!.*female).*male/i.test(v.name)) ??
      kos.find((v) => !/female|여|유나|지민/i.test(v.name));
    const ko = low ?? kos[0];
    if (ko) u.voice = ko;
    synth.speak(u);
  } catch {
    /* 못 읽어도 절은 이미 했다 */
  }
}

// ── 키캡 ─────────────────────────────────────────────────────
// 형: 「공양에 목탁 염주 싱잉볼 옆에 키캡도 하나 넣어라.
//      클릭하면 눌려지면서 키캡 소리 나도록」
//
// 소리는 파일로 안 받는다. 기계식 키보드의 「톡」은 세 겹이 한꺼번에
// 나는 소리다 —
//   ① 스템이 하우징 바닥을 때리는 **딸깍**(아주 짧은 잡음, 높게 자른)
//   ② 키캡 플라스틱이 울리는 **통**(낮은 사인파, 순식간에 죽는)
//   ③ 스프링이 살짝 튕기는 **찡**(고음 한 점, 아주 작게)
// 셋을 겹치면 우리 귀가 「키캡」이라고 읽는다. 눌릴 때와 떼일 때의
// 소리가 달라야 진짜 같으므로 up 을 따로 둔다 — 뗄 때는 더 가볍고 높다.

/** 키캡 하나 — down 은 바닥을 치는 소리, up 은 되돌아오는 소리 */
export function clickKeycap(vol: number, phase: "down" | "up" = "down") {
  if (소리길() === "element") {
    엘리먼트치기(phase === "up" ? "/sfx/keycap-up.wav" : "/sfx/keycap-down.wav", vol);
    return;
  }
  const ac = audio();
  if (!ac) return;
  if (!깬뒤에(ac, "clickKeycap", () => void clickKeycap(vol, phase))) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol * (phase === "down" ? 1 : 0.55);
  out.connect(master(ac));

  // ① 딸깍 — 스템이 바닥에 닿는 소리
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = phase === "down" ? 1800 : 3200;
  const bp = ac.createBiquadFilter();
  bp.type = "lowpass";
  bp.frequency.value = phase === "down" ? 7000 : 9000;
  const g1 = ac.createGain();
  g1.gain.setValueAtTime(phase === "down" ? 0.9 : 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + (phase === "down" ? 0.016 : 0.01));
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g1);
  g1.connect(out);
  src.start(t);

  // ② 통 — 키캡 몸이 울리는 낮은 소리. 이게 「싸구려」와 「묵직함」을 가른다
  const o = ac.createOscillator();
  o.type = "triangle";
  const f = (phase === "down" ? 168 : 232) + Math.random() * 18;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.05);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(phase === "down" ? 0.5 : 0.24, t + 0.003);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.1);

  // ③ 찡 — 스프링. 아주 작게, 없으면 허전하고 크면 싸구려가 된다
  const o2 = ac.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(2600 + Math.random() * 400, t);
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.0001, t);
  g3.gain.exponentialRampToValueAtTime(0.06, t + 0.002);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o2.connect(g3);
  g3.connect(out);
  o2.start(t);
  o2.stop(t + 0.05);
}
