"use client";

// ─────────────────────────────────────────────────────────────
// 배웅(送) — 떠난 아이를 함께 보내는 곳.
// 형(2026-11-19): 「펫로스를 연등 말고 다른 방식으로」 「서로 사연 공유하도록 생명존중 의미 담아」
//   「사진을 넣고 추모할 수 있도록」 「더 엄숙하고 진중하게」 「49재가 뭔 기능이야, 기능적인 거 고민해」
//   「사연 공유하는 게 낫지 않나」 → 제안 ㅇㅋ:
//
// ① 함께(첫 화면) — 떠나보낸 사람들의 사연. 사진은 올리는 이가 고른다.
//    반응은 합장 + 정해진 위로 한마디(댓글 자유 입력 없음 — 슬픈 사람에게 악플이 닿지 않게).
//    맨 위에 「이번 주 N명이 생명에게 회향」 — 오재 다짐이 모인다(board "petvow").
// ② 내 아이 — 칠칠일 길잡이. 재마다 다른 물음이 하나씩(빈칸 앞에서 막히지 않게).
//    초재 처음 만난 날 · 이재 좋았던 순간 사진 · 삼재 고마운 것 · 사재 미안한 것(죄책감을 꺼내 놓기)
//    · 오재 생명에게 회향(다짐 → 했어요) · 육재 놓아주기 · 막재 마지막 편지 → 추모 카드 한 장.
//    떠난 지 49일이 넘었으면 칠칠일 대신 바로 추모 공간(언제든 한 줄, 기일 셈).
// 영단 그림은 제미나이(유료) 한 장 — public/obj/pet/altar-v1.webp.
// 사진은 기기에서 줄여 저장(영정 hwadu.pet49.photo.v1 55k · 이재 사진 hwadu.pet49.moment.v1) — kvSync 가 계정에 올린다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import s from "./pet.module.css";
import { strikeBell } from "@/lib/sound";
import { auth } from "@/lib/firebase";
import { loginWithGoogle } from "@/lib/sync";
import { addComment, bowToPost, cachedPosts, createPost, fetchComments, fetchPosts, removePost, type Post } from "@/lib/community";
import { visitDayKey } from "@/components/VisitLedger";

const KEY = "hwadu.pet49.v1";
const HANDS = "hwadu.pet49.hands.v1";
const PHOTO = "hwadu.pet49.photo.v1";
const MOMENT = "hwadu.pet49.moment.v1";
const NAMES = ["초재", "이재", "삼재", "사재", "오재", "육재", "막재"];
const ORD = ["第一齋 · 初七日", "第二齋 · 二七日", "第三齋 · 三七日", "第四齋 · 四七日", "第五齋 · 五七日", "第六齋 · 六七日", "第七齋 · 七七日"];
/** 재마다 — 구절, 한자, 물음, 답한 뒤 한 줄 */
const RITES: { verse: string; han: string; ask: string; after?: string }[] = [
  { verse: "만난 것은 헤어지고,\n떠난 것은 다시 돌아온다.", han: "會者定離 去者必返", ask: "처음 만난 날은 어땠나요" },
  { verse: "함께한 날들이\n너의 길을 밝힌다.", han: "回向", ask: "가장 좋았던 순간 — 사진 한 장과 한 줄" },
  { verse: "인연 따라 왔다가\n인연 따라 간다.", han: "因緣生 因緣滅", ask: "고마웠던 것" },
  { verse: "변하는 것을 슬퍼하는 마음도\n지나간다.", han: "諸行無常", ask: "미안했던 것", after: "그 마음까지 사랑이었어요." },
  { verse: "작은 생명도 큰 생명도\n똑같이 귀하다.", han: "一切衆生 悉有佛性", ask: "이 아이 이름으로, 다른 생명에게 하나" },
  { verse: "붙잡지 않는 것도\n사랑이다.", han: "放下", ask: "이제 놓아주며 — 한 줄" },
  { verse: "좋은 곳에서 편히 쉬어.\n고마웠어.", han: "往生極樂", ask: "마지막 편지" },
];
const VOWS = ["보호소에 기부", "유기동물 봉사", "하루 채식", "길 위의 생명 돌보기"];
const COMFORT = ["함께 기억할게요", "고생 많으셨어요", "좋은 곳에 갔을 거예요", "그 마음 알아요"];

type Rite = { hyang?: boolean; letter?: string; shared?: boolean; vow?: string; vowDone?: boolean };
type Note = { day: string; text: string };
type Pet = { name: string; kind?: string; passed: string; done: Record<number, Rite>; memorial?: boolean; notes?: Note[] };

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const raw = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const md = (d: string) => `${Number(d.slice(5, 7))}. ${Number(d.slice(8, 10))}`;
const ymd = (d: string) => `${d.slice(0, 4)}. ${Number(d.slice(5, 7))}. ${Number(d.slice(8, 10))}`;
const ago = (sec?: number) => { if (!sec) return ""; const m = Math.floor((Date.now() / 1000 - sec) / 60); return m < 60 ? `${Math.max(1, m)}분` : m < 1440 ? `${Math.floor(m / 60)}시간` : `${Math.floor(m / 1440)}일`; };

/** 사진 한 장을 줄인다 — 긴 변 side 부터 줄여 가며 cap 글자 안으로 */
async function shrink(file: File, sides = [640, 520, 420, 340], cap = 55_000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    return squeeze(img, sides, cap);
  } finally { URL.revokeObjectURL(url); }
}
function squeeze(img: HTMLImageElement, sides: number[], cap: number): string {
  for (const side of sides) {
    const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext("2d")!;
    g.fillStyle = "#3a3530"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.7, 0.58]) {
      const d = c.toDataURL("image/jpeg", q);
      if (d.length < cap) return d;
    }
  }
  throw new Error("too big");
}
const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
/** 나눌 때 실을 작은 사진 — 360px, 25k 안 */
async function thumb(dataUrl: string) { return squeeze(await loadImg(dataUrl), [360, 300, 240], 25_000); }

/** 추모 카드 — 영단 그림 위에 영정·이름·날짜·한 줄. 1080×1350 */
async function memorialCard(pet: Pet, photo: string, line: string): Promise<Blob> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = await loadImg("/obj/pet/altar-v1.webp");
  const k = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
  g.drawImage(bg, (W - bg.naturalWidth * k) / 2, (H - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k);
  const fw = 400, fh = 500, fx = (W - fw) / 2, fy = 120;
  g.fillStyle = "#0f0d0b"; g.fillRect(fx - 16, fy - 16, fw + 32, fh + 32);
  g.strokeStyle = "rgba(201,170,110,.6)"; g.lineWidth = 2; g.strokeRect(fx - 8, fy - 8, fw + 16, fh + 16);
  if (photo) {
    const p = await loadImg(photo);
    const s2 = Math.max(fw / p.naturalWidth, fh / p.naturalHeight);
    const sw = fw / s2, sh = fh / s2;
    g.drawImage(p, (p.naturalWidth - sw) / 2, (p.naturalHeight - sh) / 2, sw, sh, fx, fy, fw, fh);
  } else { g.fillStyle = "#2a2622"; g.fillRect(fx, fy, fw, fh); }
  g.textAlign = "center"; g.fillStyle = "#efe6d4";
  g.font = "500 52px 'Noto Serif KR', serif"; g.fillText(pet.name, W / 2, fy + fh + 100);
  g.font = "300 26px 'Noto Serif KR', serif"; g.fillStyle = "rgba(216,207,192,.75)";
  g.fillText(`${ymd(pet.passed)} — ${ymd(addDays(pet.passed, 48))}`, W / 2, fy + fh + 148);
  if (line) {
    g.font = "400 30px 'Noto Serif KR', serif"; g.fillStyle = "#e8dfcf";
    const t = line.replace(/\s+/g, " ").slice(0, 40);
    g.fillText(`“${t}”`, W / 2, fy + fh + 212);
  }
  g.font = "300 22px 'Noto Serif KR', serif"; g.fillStyle = "rgba(216,207,192,.55)";
  g.fillText("四十九齋 圓滿 · 화두 배웅", W / 2, H - 44);
  return new Promise((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.9));
}

/** 합장 */
const Hands = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21V8.5c0-1.7-.8-3.3-2-4.5L8.6 2.8a1 1 0 0 0-1.6.6L6 11l-2.3 3.5a2 2 0 0 0 .3 2.5L8 21" />
    <path d="M12 21V8.5c0-1.7.8-3.3 2-4.5l1.4-1.2a1 1 0 0 1 1.6.6L18 11l2.3 3.5a2 2 0 0 1-.3 2.5L16 21" />
  </svg>
);

export default function PetPage() {
  const [tab, setTab] = useState<"together" | "mine">("together");
  const [pet, setPet] = useState<Pet | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [passed, setPassed] = useState("");
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [vows, setVows] = useState<Post[]>([]);
  const [hands, setHands] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState("");
  const [moment, setMoment] = useState("");
  const [withPhoto, setWithPhoto] = useState(false);
  const [vowPick, setVowPick] = useState("");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [comforts, setComforts] = useState<Record<string, string[]>>({});
  const [compose, setCompose] = useState(false);
  const [cName, setCName] = useState("");
  const [cText, setCText] = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const momentRef = useRef<HTMLInputElement>(null);
  const card = useRef<Blob | null>(null);

  const reload = () => {
    fetchPosts("pet").then(setFeed).catch(() => {});
    fetchPosts("petvow").then(setVows).catch(() => {});
  };
  useEffect(() => {
    const p = read<Pet | null>(KEY, null);
    setPet(p);
    if (p) setTab("mine");
    setHands(read<string[]>(HANDS, []));
    setPhoto(raw(PHOTO)); setMoment(raw(MOMENT));
    setPassed(visitDayKey());
    setFeed(cachedPosts("pet"));
    setVows(cachedPosts("petvow")); // 검수(2026-11-24): 띠가 0명일 땐 숨으니 — 늦게 떠서 아래를 밀지 않게 지난 목록부터
    setReady(true);
    reload();
  }, []);

  // 검수(2026-11-24): 로그인하면 계정 서랍이 내려와 이 칸들을 바꾼다(kvAdopt → storage 사건) — 화면이 한 번만 읽고 말면
  //   손님 때 값으로 다음 합장·배웅이 계정 것을 덮었다. 바뀌면 다시 읽는다
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === HANDS) setHands(read<string[]>(HANDS, []));
      else if (e.key === KEY) setPet(read<Pet | null>(KEY, null));
      else if (e.key === PHOTO) setPhoto(raw(PHOTO));
      else if (e.key === MOMENT) setMoment(raw(MOMENT));
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const pickPhoto = async (f: File | undefined, key: string, set: (v: string) => void) => {
    if (!f) return;
    try { const d = await shrink(f); set(d); try { localStorage.setItem(key, d); } catch {} }
    catch { alert("이 사진은 열 수 없어요"); }
  };

  const today = visitDayKey();
  const memorial = !!pet && (pet.memorial || daysBetween(pet.passed, today) > 62);
  const riteDay = (i: number) => (pet ? addDays(pet.passed, 7 * (i + 1) - 1) : "");
  const isDone = (i: number) => !!(pet?.done[i]?.hyang && pet?.done[i]?.letter);
  const open = (i: number) => !!pet && riteDay(i) <= today;
  const current = pet && !memorial ? NAMES.findIndex((_, i) => !isDone(i)) : -1;
  const at = pick ?? current;
  const lit = !!pet && at !== -1 && !!pet.done[at]?.hyang;
  const canLight = !!pet && !memorial && at !== -1 && open(at) && !pet.done[at]?.hyang;
  const finished = !!pet && !memorial && current === -1;
  const anniv = pet ? (() => { const y = Number(today.slice(0, 4)); let a = `${y}${pet.passed.slice(4)}`; if (a < today) a = `${y + 1}${pet.passed.slice(4)}`; return daysBetween(today, a); })() : 0;

  const save = (next: Pet) => { write(KEY, next); setPet(next); };
  const update = (i: number, patch: Rite) => { if (pet) save({ ...pet, done: { ...pet.done, [i]: { ...pet.done[i], ...patch } } }); };

  // 검수(2026-11-24): 손님은 다 쓰고 눌러야 「로그인 후」가 떴고, 설정으로 가면 쓴 글이 날아갔다 —
  //   그 자리에서 로그인한다(CandleForm 결). 앱은 네이티브 계정 고르기라 화면이 그대로라 글이 남는다.
  const share = async (title: string, text: string, pic: string) => {
    setBusy(true);
    // 검수(2026-11-24): 로그인한 그 자리에서 바로 올리지 않는다 — 계정 서랍(배웅 기록·합장 목록)이 아직 안 내려와
    //   손님 때 것으로 계정 것을 덮어썼다. 로그인만 하고 돌아선다(쓴 글은 그대로, 한 번 더 누르면 올라간다)
    if (!auth.currentUser) { try { await loginWithGoogle(); } catch { /* 그만두면 글은 그대로 */ } setBusy(false); return false; }
    try { await createPost(title, text, "pet", { photo: pic ? await thumb(pic) : null }); }
    catch { setBusy(false); return false; }
    setBusy(false); reload(); return true;
  };
  const place = async (toAll: boolean) => {
    if (!pet || at === -1) return;
    const isVow = at === 4;
    const text = (isVow ? vowPick : draft).trim().slice(0, 500);
    if (!text) return;
    if (isVow) {
      if (auth.currentUser) createPost(`${pet.name} 영가`, text, "petvow").then(reload).catch(() => {});
      update(at, { letter: text, vow: text });
      setVowPick(""); setPick(null); return;
    }
    if (toAll) {
      const pic = at === 1 ? moment : withPhoto ? photo : "";
      if (!(await share(`${pet.name} 영가`, text, pic))) return;
    }
    update(at, { letter: text, shared: toAll });
    setDraft(""); setPick(null); setWithPhoto(false);
  };
  const addNote = () => {
    if (!pet || !draft.trim()) return;
    save({ ...pet, notes: [{ day: today, text: draft.trim().slice(0, 500) }, ...(pet.notes ?? [])] });
    setDraft("");
  };
  const makeCard = async () => {
    if (!pet) return;
    const line = pet.done[2]?.letter || pet.done[6]?.letter || "";
    const b = await memorialCard(pet, photo, line);
    card.current = b; setCardUrl(URL.createObjectURL(b));
  };
  const shareCard = async () => {
    const b = card.current; if (!b || !pet) return;
    const f = new File([b], `${pet.name}.jpg`, { type: "image/jpeg" });
    try { if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch { return; }
    const a = document.createElement("a"); a.href = cardUrl; a.download = `${pet.name}.jpg`; a.click();
  };

  const fold = async (p: Post) => {
    if (hands.includes(p.id)) return;
    // 검수(2026-11-24): 손님 합장은 규칙(로그인 필수)에 막혀 조용히 사라지고 단추만 눌려 있었다 — 그 자리에서 로그인
    if (!auth.currentUser) { try { await loginWithGoogle(); } catch { /* 그만둠 */ } return; } // 로그인만 — 계정 합장 목록이 내려온 뒤 다시 누른다
    const next = [...hands, p.id].slice(-300);
    setHands(next); write(HANDS, next);
    setFeed((l) => l.map((x) => (x.id === p.id ? { ...x, hapjang: (x.hapjang ?? 0) + 1 } : x)));
    bowToPost(p.id).catch(() => {});
  };
  const toggleComfort = (p: Post) => {
    if (openPost === p.id) { setOpenPost(null); return; }
    setOpenPost(p.id);
    if (!comforts[p.id]) fetchComments(p.id).then((cs) => setComforts((m) => ({ ...m, [p.id]: cs.filter((c) => !c.deleted && COMFORT.includes(c.body)).map((c) => c.body) }))).catch(() => {});
  };
  const comfort = async (p: Post, phrase: string) => {
    // 검수(2026-11-24): 위로도 그 자리에서 로그인(설정으로 보내지 않는다)
    if (!auth.currentUser) { try { await loginWithGoogle(); } catch { /* 그만둠 */ } if (!auth.currentUser) return; }
    setComforts((m) => ({ ...m, [p.id]: [...(m[p.id] ?? []), phrase] }));
    setFeed((l) => l.map((x) => (x.id === p.id ? { ...x, commentCount: (x.commentCount ?? 0) + 1 } : x)));
    addComment(p.id, phrase).catch(() => {});
  };
  // 검수(2026-11-24): 폰 뒤로가기가 쓰던 사연째 배웅을 떠났다 — 쓰기 판을 열 때 층 하나(DoryangMenu 결),
  //   뒤로가기·「그만」은 판만 닫는다.
  const composeOpen = useRef(false);
  useEffect(() => { composeOpen.current = compose; }, [compose]);
  //   층마다 제 표(petLayer) — ☰ 판이 위에 얹혔다 닫혀도 쓰던 판은 그대로 둔다
  const layer = useRef(0);
  useEffect(() => {
    const onPop = () => { if (window.history.state?.petLayer !== layer.current) setCompose(false); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openCompose = () => {
    layer.current = Date.now();
    try { window.history.pushState({ ...window.history.state, hwadooLayer: true, petLayer: layer.current }, ""); } catch { /* 못 쌓아도 판은 열린다 */ }
    setCName(pet?.name ?? ""); setCompose(true);
  };
  const postStory = async () => {
    if (!cText.trim() || !cName.trim()) return;
    if (await share(`${cName.trim().slice(0, 10)} 영가`, cText.trim().slice(0, 1000), withPhoto ? photo : "")) {
      setCText(""); setWithPhoto(false);
      if (composeOpen.current) window.history.back(); // 쌓은 층을 같이 걷으며 닫는다(올리는 사이 이미 뒤로 갔으면 그대로)
    }
  };

  const live = feed.filter((p) => !p.deleted);
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  const vowCount = vows.filter((v) => (v.createdAt?.seconds ?? 0) > weekAgo).length;
  const me = auth.currentUser?.uid;

  return (
    <HipRoom here="/pet" lanes={false} rail="/settings">
      <div className={s.page}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0], PHOTO, setPhoto); e.target.value = ""; }} />
        <input ref={momentRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0], MOMENT, setMoment); e.target.value = ""; }} />

        <div className={s.tabs} role="tablist">
          <button role="tab" aria-selected={tab === "together"} onClick={() => setTab("together")}>함께</button>
          {/* 쓰기 판이 열린 채 옮기면 판은 안 보이는데 층만 남아 다음 뒤로가기가 헛돈다 — 층째 걷는다 */}
          <button role="tab" aria-selected={tab === "mine"} onClick={() => { if (compose) window.history.back(); setTab("mine"); }}>{pet ? pet.name : "내 아이"}</button>
        </div>

        {tab === "together" ? (
          <>
            {/* 검수(2026-11-24): 「이번 주 0명이」는 쓸쓸한 빈 띠 — 한 명이라도 있을 때만 */}
            {vowCount > 0 && (
              <div className={s.vowBand}>
                <span>生</span>
                <p>이번 주 <b>{vowCount}</b>명이 떠난 아이 이름으로<br />다른 생명에게 회향했어요</p>
              </div>
            )}

            {compose ? (
              <section className={s.compose}>
                <input className={s.line} value={cName} maxLength={10} placeholder="아이 이름" onChange={(e) => setCName(e.target.value)} />
                <textarea className={s.paper} value={cText} maxLength={1000} placeholder="사연" onChange={(e) => setCText(e.target.value)} />
                {photo && <button className={s.chip} aria-pressed={withPhoto} onClick={() => setWithPhoto(!withPhoto)}>사진 함께</button>}
                <div className={s.two}>
                  <button className={s.btnw} onClick={() => window.history.back()}>그만</button>
                  <button className={s.btn} disabled={!cText.trim() || !cName.trim() || busy} onClick={postStory}>올리기</button>
                </div>
              </section>
            ) : (
              <button className={s.btn} onClick={openCompose}>사연 올리기</button>
            )}

            <section className={s.feed}>
              {live.map((p) => (
                <article key={p.id} className={s.post}>
                  {p.photo?.startsWith("data:image/jpeg;base64,") && <img className={s.postPic} src={p.photo} alt="" />}
                  <div className={s.postIn}>
                    <p className={s.postWho}>{p.title.replace(/ · .*$/, " 영가")}<em>{ago(p.createdAt?.seconds)}</em></p>
                    <p className={s.postBody}>{p.body}</p>
                    <div className={s.acts}>
                      <button className={s.hands} aria-pressed={hands.includes(p.id)} aria-label="합장" onClick={() => fold(p)}><Hands /> {p.hapjang ?? 0}</button>
                      <button className={s.hands} aria-pressed={openPost === p.id} onClick={() => toggleComfort(p)}>위로 {p.commentCount ?? 0}</button>
                      {me && p.authorUid === me && <button className={s.down} onClick={() => { if (confirm("이 사연을 내릴까요?")) removePost(p.id).then(reload).catch(() => {}); }}>내리기</button>}
                    </div>
                    {openPost === p.id && (
                      <div className={s.comfort}>
                        {(comforts[p.id] ?? []).length > 0 && <p className={s.said}>{(comforts[p.id] ?? []).slice(-6).join(" · ")}</p>}
                        <div className={s.chips}>{COMFORT.map((c) => <button key={c} className={s.chip} onClick={() => comfort(p, c)}>{c}</button>)}</div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <>
            {/* 영단 */}
            <section className={s.altar} aria-label="영단">
              <img className={s.bg} src="/obj/pet/altar-v1.webp" alt="" aria-hidden />
              <button className={s.frame} onClick={() => fileRef.current?.click()} aria-label={photo ? "사진 바꾸기" : "사진 모시기"}>
                {photo ? <img src={photo} alt="" /> : <span className={s.blank}>사진</span>}
                {pet && <><i className={s.ribL} /><i className={s.ribR} /></>}
              </button>
              <p className={s.tablet}>{pet ? `${pet.name} 靈駕` : "靈駕"}</p>
              {(lit || memorial || finished) && <i className={s.ember} aria-hidden />}
              <button className={s.burner} data-call={canLight ? "1" : undefined} disabled={!canLight} onClick={() => { strikeBell(0.5); update(at, { hyang: true }); }} aria-label="향 올리기" />
              {pet && <p className={s.ord}>{memorial ? `忌日 · D-${anniv}` : finished ? "四十九齋 圓滿" : ORD[at]}</p>}
            </section>

            {ready && !pet && (
              <section className={s.form}>
                <input className={s.line} value={name} maxLength={10} placeholder="이름" onChange={(e) => setName(e.target.value)} />
                <label className={s.date}>떠난 날<input type="date" value={passed} max={today} onChange={(e) => setPassed(e.target.value)} /></label>
                <button className={s.btn} disabled={!name.trim() || !passed} onClick={() => save({ name: name.trim().slice(0, 10), passed, done: {}, memorial: daysBetween(passed, today) > 48 })}>모시기</button>
              </section>
            )}

            {pet && !memorial && (
              <>
                {current !== -1 && open(at) && !lit && <p className={s.hint}>향로를 눌러 향을 올려요</p>}
                {current !== -1 && open(at) && lit && (
                  <section className={s.rite}>
                    <p className={s.verse}>{RITES[at].verse}</p>
                    <p className={s.han}>{RITES[at].han}</p>
                    {!pet.done[at]?.letter && (
                      <>
                        <p className={s.ask}>{RITES[at].ask}</p>
                        {at === 1 && (
                          <button className={s.moment} onClick={() => momentRef.current?.click()}>{moment ? <img src={moment} alt="" /> : <span>사진 한 장</span>}</button>
                        )}
                        {at === 4 ? (
                          <div className={s.vows}>{VOWS.map((v) => <button key={v} className={s.chip} aria-pressed={vowPick === v} onClick={() => setVowPick(v)}>{v}</button>)}</div>
                        ) : (
                          <textarea className={s.paper} value={draft} maxLength={500} placeholder={`${pet.name}에게`} onChange={(e) => setDraft(e.target.value)} />
                        )}
                        {at !== 4 && at !== 1 && photo && <button className={s.chip} aria-pressed={withPhoto} onClick={() => setWithPhoto(!withPhoto)}>나눌 때 사진 함께</button>}
                        {at === 4 ? (
                          <button className={s.btn} disabled={!vowPick} onClick={() => place(false)}>다짐</button>
                        ) : (
                          <div className={s.two}>
                            <button className={s.btnw} disabled={!draft.trim() || busy} onClick={() => place(false)}>간직</button>
                            <button className={s.btn} disabled={!draft.trim() || busy} onClick={() => place(true)}>나누기</button>
                          </div>
                        )}
                      </>
                    )}
                    {pet.done[at]?.letter && RITES[at].after && <p className={s.ask}>{RITES[at].after}</p>}
                  </section>
                )}
                {current !== -1 && !open(at) && <p className={s.hint}>{NAMES[at]} · {md(riteDay(at))}</p>}

                {/* 오재 다짐 — 했는지 */}
                {pet.done[4]?.vow && !pet.done[4]?.vowDone && (
                  <button className={s.vowDo} onClick={() => update(4, { vowDone: true })}>「{pet.done[4].vow}」 했어요</button>
                )}

                {finished && (
                  <section className={s.rite}>
                    <p className={s.verse}>{RITES[6].verse}</p>
                    <p className={s.han}>{RITES[6].han}</p>
                    {cardUrl ? (
                      <>
                        <img className={s.card} src={cardUrl} alt="추모 카드" />
                        <button className={s.btn} onClick={shareCard}>간직하기 · 보내기</button>
                      </>
                    ) : (
                      <button className={s.btn} onClick={makeCard}>추모 카드</button>
                    )}
                    <button className={s.btnw} style={{ width: "100%" }} onClick={() => save({ ...pet, memorial: true })}>추모 공간으로</button>
                  </section>
                )}

                <div className={s.head}>
                  <p className={s.headK}>四十九齋</p>
                  <p className={s.headD}>{ymd(pet.passed)} — {ymd(riteDay(6))}</p>
                </div>
                <ol className={s.rites}>
                  {NAMES.map((n, i) => (
                    <li key={n}>
                      <button data-d={isDone(i) ? "1" : undefined} data-now={i === at && !isDone(i) && open(i) ? "1" : undefined} disabled={!open(i)} onClick={() => setPick(i)}>
                        <b>{n}</b>
                        <span>{md(riteDay(i))}</span>
                        <i>{RITES[i].ask.split(" —")[0]}</i>
                        <em>{isDone(i) ? "올림" : i === at && open(i) ? "오늘" : ""}</em>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* 추모 공간 — 49일이 지난 뒤 */}
            {pet && memorial && (
              <section className={s.rite}>
                <p className={s.ask}>{pet.name}에게, 오늘 한 줄</p>
                <textarea className={s.paper} value={draft} maxLength={500} placeholder={`${pet.name}에게`} onChange={(e) => setDraft(e.target.value)} />
                <div className={s.two}>
                  <button className={s.btnw} disabled={!draft.trim()} onClick={addNote}>간직</button>
                  <button className={s.btn} disabled={!draft.trim() || busy} onClick={async () => { if (await share(`${pet.name} 영가`, draft.trim().slice(0, 500), "")) addNote(); }}>나누기</button>
                </div>
                {!cardUrl ? <button className={s.btnw} style={{ width: "100%" }} onClick={makeCard}>추모 카드</button> : (
                  <><img className={s.card} src={cardUrl} alt="추모 카드" /><button className={s.btn} onClick={shareCard}>간직하기 · 보내기</button></>
                )}
              </section>
            )}

            {pet && (
              <section className={s.mine}>
                {(pet.notes ?? []).map((n, i) => <p key={`n${i}`}><b>{md(n.day)}</b>{n.text}</p>)}
                {pet.done[1]?.letter && moment && <img className={s.momentPic} src={moment} alt="" />}
                {NAMES.map((n, i) => pet.done[i]?.letter ? <p key={n}><b>{n} · {RITES[i].ask.split(" —")[0]}</b>{pet.done[i]?.letter}{i === 4 && pet.done[4]?.vowDone ? " ✓" : ""}</p> : null)}
              </section>
            )}

            {pet && <button className={s.reset} onClick={() => { if (confirm("영단을 거둘까요?")) { write(KEY, null); setPet(null); setPhoto(""); setMoment(""); setCardUrl(""); try { localStorage.removeItem(PHOTO); localStorage.removeItem(MOMENT); } catch {} } }}>영단 거두기</button>}
          </>
        )}
      </div>
    </HipRoom>
  );
}
