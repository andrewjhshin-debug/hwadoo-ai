"use client";

// ────────────────────────────────────────────────────────────────
// 내 도량(道場) — 나의 걸음 · 얻은 자리(뱃지) · 이달의 마음 · 색상 모드
// · 차 한 잔 · 지난 화두 · 내가 던진 화두 · 로그인 정보.
// 웹·모바일 공통. 사이드바/하단 탭의 '내 도량'을 누르면 이 화면으로 온다.
// 각 구획은 균질한 간격으로, 로그인 정보는 맨 아래.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "firebase/auth";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import {
  BIZ_ADDRESS,
  BIZ_MAIL_ORDER_NO,
  BIZ_NAME,
  BIZ_OWNER,
  BIZ_PHONE,
  BIZ_REG_NO,
  CONTACT_EMAIL,
  DONATION_URL,
  isAdminAccount,
  PUSH_VAPID_KEY,
  SITE_URL,
} from "@/lib/config";
import {
  disablePush,
  enablePush,
  isPushBrowserSupported,
  pushState,
  updateBells,
} from "@/lib/push";
import { BELLS, loadBellsLocal, saveBellsLocal } from "@/lib/bells";
import { formatDate, loadStore, saveStore, type Session } from "@/lib/store";
import { markAllSeen, unseenNotices, type Notice } from "@/lib/notices";
import { flatQuestion, sessionQuestion } from "@/lib/hwadu";
import { dongja } from "@/lib/dongja";
import DailyPractice from "@/components/DailyPractice";
import HipMe from "./HipMe";
import { ME_EVENT, loadMe, nameProblem, rerollName, setName } from "@/lib/me";
import ShareButton from "@/components/ShareButton";
import Info from "@/components/Info";
import LotusCount from "@/components/LotusCount";
import MyTemplePicker from "@/components/MyTemplePicker";
import { CHARMS, charmSvg, loadCharms } from "@/lib/charm";
import { nextRealm, realmOf, realmProgress, REALMS } from "@/lib/realm";
import { DAILY_EVENT } from "@/lib/daily";
import {
  DAILY_TOTAL_CAP,
  MERIT_EVENT,
  MERIT_VALUE,
  rankByNeed,
  inRound,
  loadMerit,
  nextRank,
  rankOf,
  ROUND,
  todayRoom,
  type MeritLedger,
  SOURCE_LABEL,
  type MeritSource,
} from "@/lib/merit";
import {
  fetchMyThrownStats,
  fetchThrown,
  loadMyThrown,
  type MyThrown,
  type ThrownStat,
} from "@/lib/thrown";
import { fetchMyApprovedAnswerCount } from "@/lib/community";
// 접속 표는 사이드바가 올린다(모든 화면에 있으므로) — 여기선 세기만 한다
import { watchOnlineCount } from "@/lib/presence";
import { submitFeedback } from "@/lib/feedback";
import { dmVisible, getLotus } from "@/lib/dm";
import {
  canInstall,
  isIOS,
  isStandalone,
  onInstallChange,
  promptInstall,
} from "@/lib/install";
import { loadVisits, visitDayKey } from "@/components/VisitLedger";
import YeonAvatar from "@/components/YeonAvatar";
import { loadMeditations } from "@/lib/meditation";
import {
  Person,
  Teacup,
  Book,
  Dharmachakra,
  SeonMaster,
  Banga,
  Baru,
  BodhiLeaf,
  Bojagi,
  Breath,
  Chotbul,
  Enso,
  Iljumun,
  Jeoul,
  Jukbi,
  Letter,
  LotusMark,
  LotusPond,
  Moment,
  Seogo,
  Yeomju,
  YeonkkotGold,
} from "@/components/icons";

// 공덕 점수보다 먼저 보여 줄 수행의 흔적. 0번도 숨기지 않는다 —
// "무엇을 몇 번 했나"가 내 도량에서 바로 보여야 다음 한 번을 시작한다.
const PRACTICE_HITS: { source: MeritSource; label: string }[] = [
  { source: "bow", label: "절" },
  { source: "moktak", label: "목탁" },
  { source: "bead", label: "염주" },
  { source: "breath", label: "호흡" },
  { source: "hwadu", label: "화두" },
  { source: "temple", label: "절로" },
  { source: "gathering", label: "인연" },
  { source: "sutra", label: "경전" },
  { source: "moment", label: "시절" },
  { source: "bowl", label: "싱잉볼" },
  { source: "candle", label: "초" },
  { source: "mandala", label: "만다라" },
  { source: "fortune", label: "운세" },
  { source: "mung", label: "멍" },
  { source: "hasim", label: "하심" },
  { source: "daily", label: "오늘" },
];

// 접어 두는 묶음 — 도량 아래쪽 살림살이는 찾을 때만 편다.
// 지우는 게 아니라 접는다. 필요한 사람에게는 그대로 다 있다.
function Fold({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rise group mt-11">
      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-ink-3 pb-3.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-[11px] tracking-[0.3em] text-hanji-faint">
            {title}
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-hanji-faint/70">
            {note}
          </span>
        </span>
        <span
          aria-hidden
          className="ml-3 shrink-0 text-[13px] text-hanji-faint transition-transform duration-200 group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="-mt-6">{children}</div>
    </details>
  );
}

// 이달의 마음 — 이번 달의 걸음을 로컬 기록으로 센 것
type MonthReport = {
  returned: number; // 이번 달 받은 화두 수(=회향 수)
  days: number; // 이번 달 함께한 날수 (접속일 ∪ 화두를 품고 있던 날, 고유한 날짜 수)
  meditations: number; // 이번 달 호흡 명상 마친 횟수
};

// 이 달의 흐름 — 날짜별(1일부터) 셈, 그래프가 이것을 그린다
type MonthChart = {
  returned: number[];
  meditations: number[];
};

// 올해의 마음 — 연말에 한 장으로 보는 누적 요약(공유하기 좋은 카드)
type YearReport = {
  year: number;
  returned: number;
  meditations: number;
  days: number;
};

// 품어온 시간 — 화두마다 받은 날부터 회향(또는 지금)까지 품은 일수
type HeldItem = {
  key: string;
  from: string; // 받은 날, "3.2" 꼴
  receivedAt: number; // 받은 시각 — 최신순 정렬의 기준
  question: string; // 화두 질문 전문 — 줄이지 않는다
  days: number; // 품은 일수 (최소 1일)
  current: boolean; // 지금 품는 중인가
};

// 서비스 격자 — href 가 없는 것은 아직 문이 열리지 않은 자리 (눌러도 이동하지 않는다)
type ServiceItem = {
  href?: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  soon?: boolean;
};

// 알림 구획의 상태 — 살펴보는 중 / 미지원 / 준비 중(키 없음) / 거부 / 꺼짐 / 켜짐
type PushUi = "loading" | "unsupported" | "preparing" | "denied" | "off" | "on";

// 홈 화면에 담기 구획의 상태 —
// 이미 앱으로 열림 / 프롬프트가 잡혀 있음 / 아이폰 안내 / 브라우저 메뉴 안내
type InstallUi = "standalone" | "promptable" | "ios" | "manual";

// 서비스 격자 — **그림이 겹치면 안 된다.**
//
// 한동안 사유의 방과 삼배가 둘 다 반가사유상이었고, 뜰·연꽃 공양·오늘의
// 운세가 셋 다 연꽃이었다. 비움에는 옛 목탁(밤처럼 둥근 것)이 남아 있었고,
// 공덕·법당·백팔배·멍은 칸 자체가 없었다.
// 한 칸에 한 그림, 그리고 사이드바·모바일 탭과 **같은 그림**을 쓴다.
const SERVICES: ServiceItem[] = [
  { href: "/", label: "뜰", Icon: BodhiLeaf },
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/masters", label: "선지식", Icon: SeonMaster },
  { href: "/room", label: "사유의 방", Icon: Banga },
  { href: "/my-hwadu", label: "화두 던지기", Icon: Jukbi },
  { href: "/pilgrimage", label: "손잡고 절로", Icon: Iljumun },
  { href: "/gathering", label: "인연", Icon: Person },
  // 형: 「백팔배 탭 없애고 공덕 키캡 옆으로 옮겨라. 멍 만다라 삼귀의
  //      하심 역시」 — 백팔배·멍·만다라·삼귀의·하심은 여기서 걷었다.
  //      공덕을 주는 수행은 **한자리에** 모인다. 공덕 판 머리의 갈래 띠가
  //      그 다섯을 받는다. 두 군데서 같은 곳으로 가는 문을 내면
  //      어느 쪽이 제자리인지 아무도 모른다.
  { href: "/moktak", label: "공덕", Icon: Yeomju },
  { href: "/breath", label: "호흡 명상", Icon: Breath },
  { href: "/empty", label: "비움", Icon: Baru },
  { href: "/candle", label: "법당", Icon: Chotbul },
  { href: "/lotus", label: "연꽃", Icon: YeonkkotGold },
  { href: "/community", label: "연지원", Icon: LotusPond },
  { href: "/archive", label: "지난 화두", Icon: Seogo },
  { href: "/sutra", label: "외우기", Icon: Book },
  { href: "/draw", label: "오늘의 운세", Icon: Enso },
  { href: "/rank", label: "오늘의 정진", Icon: Moment },
  { href: "/tea", label: "차 한 잔", Icon: Teacup },
  { href: "/goods", label: "굿즈", Icon: Bojagi },
  { href: "/tamjinchi", label: "불심 투자", Icon: Jeoul },
];

// 이 달의 흐름 — 여러 갈래를 한 그래프에 선으로 겹쳐 그린다.
// 범례를 누르면 그 선만 또렷해지고 나머지는 흐려진다 — 다시 누르면 원래대로.
export default function SettingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // 이메일 알림 — 켜짐이 기본, users/{uid}.emailOptOut 로 끈다
  // 예불 종 — 이 브라우저가 고른 시각들 (푸시 토큰 문서에도 함께 새긴다)
  const [bells, setBells] = useState<string[]>([]);
  // 공덕 — 도량에서 한 일이 모두 여기로 쌓인다
  const [merit, setMerit] = useState<MeritLedger>({
    total: 0,
    by: {},
    hits: {},
    given: 0,
  });
  // 회향 장부는 서랍(localStorage)에 있다. 그릴 때 읽으면 서버가 그린
  // 첫 화면과 어긋나 하이드레이션이 깨진다 — effect 에서 담아 두고 쓴다.
  const [returnedCount, setReturnedCount] = useState(0);
  const [span, setSpan] = useState<"month" | "year">("month");
  const [room, setRoom] = useState({ earned: 0, cap: DAILY_TOTAL_CAP, left: DAILY_TOTAL_CAP });
  const [charms, setCharms] = useState<Record<string, number | undefined>>({});
  const [journalCount, setJournalCount] = useState(0);
  const [teaOpen, setTeaOpen] = useState(false);
  // 폰 판 — 「⋯」 뒤로 내린 나머지 전부
  const [meMore, setMeMore] = useState(false);
  // 법명·얼굴 — 서랍은 붙고 난 뒤에 읽는다(렌더 중 읽으면 하이드레이션이 깨진다)
  const [me, setMe] = useState<ReturnType<typeof loadMe>>(null);
  // 음양 고르개는 걷었다 — 형: 「음양 필요 없고」.
  // 다만 **이미 골라 둔 결은 그대로 쓴다** — 법명을 다시 뽑을 때
  // 두 자로 갈지 세 자로 갈지는 store 의 gender 가 조용히 쥔다.
  const [yin, setYin] = useState<"m" | "f" | undefined>(undefined);
  useEffect(() => setYin(loadStore().gender), []);

  useEffect(() => {
    setMe(loadMe());
    // 법명을 이 화면에서 고치므로, 고친 즉시 여기도 바뀌어야 한다.
    // 한 번만 읽고 말면 고쳐 놓고도 옛 이름이 그대로 떠 있다
    const onMe = () => setMe(loadMe());
    window.addEventListener(ME_EVENT, onMe);
    return () => window.removeEventListener(ME_EVENT, onMe);
  }, []);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [report, setReport] = useState<MonthReport | null>(null);
  const [chart, setChart] = useState<MonthChart | null>(null);
  const [yearReport, setYearReport] = useState<YearReport | null>(null);
  const [held, setHeld] = useState<HeldItem[]>([]);
  const [myThrown, setMyThrown] = useState<MyThrown[] | null>(null);
  const [thrownStats, setThrownStats] = useState<Map<
    string,
    ThrownStat
  > | null>(null);
  const [pushUi, setPushUi] = useState<PushUi>("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  // 차단 상태에서 버튼을 눌렀을 때 — 푸는 방법을 친절히 편다
  const [pushGuide, setPushGuide] = useState(false);
  // 새 소식 — 아직 보지 않은 것만. 여기 나열되면 곧 장부에 적혀 점이 꺼진다
  const [notices, setNotices] = useState<Notice[]>([]);
  // 홈 화면에 담기 — 서버에서는 알 수 없으니 마운트 뒤에 살핀다
  const [installUi, setInstallUi] = useState<InstallUi | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [installDone, setInstallDone] = useState(false);
  const [installGuide, setInstallGuide] = useState(false);
  // 뒷방 — 관리자에게만: 승인 기다리는 화두 수 (실패는 조용히)
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  // 나눔 통계 — 내 승인된 회향 수
  const [myAnswerCount, setMyAnswerCount] = useState<number | null>(null);
  // 실시간 접속자 수
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  // 내 연꽃 — 작게 한 줄
  const [myLotus, setMyLotus] = useState<number | null>(null);
  // 죽비 — 불편한 점을 청하는 글
  const [fb, setFb] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [fbError, setFbError] = useState("");

  useEffect(() => watchAuth(setUser), []);

  // 홈 화면에 담기 — 지금 형편을 살피고, 프롬프트가 뒤늦게 잡히면 다시 살핀다
  useEffect(() => {
    const look = () => {
      if (isStandalone()) setInstallUi("standalone");
      else if (canInstall()) setInstallUi("promptable");
      else if (isIOS()) setInstallUi("ios");
      else setInstallUi("manual");
    };
    look();
    return onInstallChange(look);
  }, []);

  // 뒷방 살림 — 관리자로 로그인했을 때만 승인 대기 수를 센다
  useEffect(() => {
    if (!isAdminAccount(user)) return;
    let alive = true;
    fetchThrown()
      .then((list) => {
        if (alive)
          setPendingCount(list.filter((t) => t.status === "pending").length);
      })
      .catch(() => {
        // 셈이 안 되어도 카드는 보인다 — 조용히 지나간다
      });
    return () => {
      alive = false;
    };
  }, [user]);

  // 새 소식 — 나열한 뒤 잠시 두었다가 본 것으로 적는다.
  // 타이머를 걷지 않는다 — 금방 떠나도 장부에는 적혀 점이 꺼진다.
  useEffect(() => {
    let alive = true;
    unseenNotices()
      .then((list) => {
        if (!alive || list.length === 0) return;
        setNotices(list);
        window.setTimeout(() => markAllSeen(list), 1500);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 예불 종과 공덕 — 서랍에서 꺼낸다.
  // 한 번만 읽고 말았더니, 이 화면에 머문 채 위쪽 「오늘의 세 가지」에서
  // 공덕을 받으면 머리줄 알약과 교환 칸만 오르고 바로 아래 「지금까지 쌓은
  // 공덕」·「오늘 N / 6,480」·갈래 칩은 그대로 멈춰 있었다. 한 화면에 같은
  // 공덕이 두 값으로 떠 있었다. 장부가 바뀌면 같이 다시 읽는다.
  useEffect(() => {
    const read = () => {
      setBells(loadBellsLocal());
      setMerit(loadMerit());
      setCharms(loadCharms());
      setRoom(todayRoom());
      setReturnedCount(loadStore().history.length);
    };
    read();
    window.addEventListener(MERIT_EVENT, read);
    window.addEventListener(DAILY_EVENT, read);
    return () => {
      window.removeEventListener(MERIT_EVENT, read);
      window.removeEventListener(DAILY_EVENT, read);
    };
  }, []);

  // 지금 서 있는 도와 한 칸 위 — 공덕과 회향한 화두 수를 함께 본다.
  // 서랍(localStorage)은 그릴 때 읽으면 안 된다 — 서버가 그린 첫 화면과
  // 어긋나 하이드레이션이 깨진다. 아래 effect 에서 읽어 담아 둔 값을 쓴다.
  const myRealm = realmOf(merit.total, returnedCount);
  const upRealm = nextRealm(merit.total, returnedCount);

  // 회향하는 자리는 **법당 하나뿐이다.**
  //
  // 한동안 여기서도 돌릴 수 있었다. 이름을 적으면 법당에 등이 사흘 걸렸다.
  // 그런데 문이 둘이면 둘 다 흐려진다 — 설정에서 돌린 회향은 어디로 갔는지
  // 안 보이고(등 하나가 남의 초 사이에 섞일 뿐이다), 법당에서 돌린 회향은
  // 설정 장부와 어긋났다. 무엇보다 「공덕이 뭔지 모르겠다」는 말은
  // **부은 것이 눈앞에서 밝아지지 않아서** 나온 말이었다.
  //
  // 그래서 이 칸은 **장부**만 맡는다 — 얼마나 돌렸나, 배수는 얼마나 붙었나,
  // 어디에 돌렸나. 돌리는 일은 법당의 여섯 자리(HallSeats)에서 한다.

  // 종 하나를 켜고 끈다 — 서랍과 토큰 문서에 같이 적는다
  const toggleBell = (id: string) => {
    const next = bells.includes(id)
      ? bells.filter((b) => b !== id)
      : [...bells, id];
    setBells(next);
    saveBellsLocal(next);
    void updateBells(next); // 구독 전이면 조용히 실패 — 구독 때 함께 새겨진다
  };

  // 이메일 알림 켜고 끄기는 화면에서 내렸다 — 상태값과 핸들러도 같이 치운다.

  // 알림 — 아침 문안: 이 브라우저의 상태를 살핀다
  useEffect(() => {
    let alive = true;
    (async () => {
      const able = await isPushBrowserSupported();
      if (!alive) return;
      if (!able) {
        setPushUi("unsupported");
        return;
      }
      if (!PUSH_VAPID_KEY) {
        setPushUi("preparing");
        return;
      }
      const state = await pushState();
      if (!alive) return;
      setPushUi(state === "unsupported" ? "preparing" : state);
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    // 걸음·이달의 마음·품어온 시간 — 저장소가 바뀌면 다시 센다.
    // (동기화·다른 창·같은 창의 다른 화면이 바꿔도 곧바로 따라간다 — Sidebar 와 같은 결)
    const refresh = () => {
      // 나의 걸음 — 받은 화두 수(지금 든 것·내려놓은 것까지),
      // 회향해 지난 화두에 남은 수, 함께한 날수
      const s = loadStore();
      setJournalCount(s.history.length);

      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const sessions: Session[] = [
        ...s.history,
        ...(s.current ? [s.current] : []),
      ];
      const visits = loadVisits();

      // 구간 [from, to] 의 날짜들을 "YYYY-MM-DD"로 모은다 — 끝날도 빠뜨리지 않는다
      const addHeldDays = (from: number, to: number, into: Set<string>) => {
        if (from > to) return;
        for (let t = from; t <= to; t += DAY) into.add(visitDayKey(t));
        into.add(visitDayKey(to));
      };

      // ── 이달의 마음 — 이번 달의 걸음을 로컬에서 센다 ──
      const base = new Date();
      const monthStart = new Date(
        base.getFullYear(),
        base.getMonth(),
        1
      ).getTime();
      const monthEnd = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        1
      ).getTime();
      const inMonth = (t: number) => t >= monthStart && t < monthEnd;

      // 이번 달 회향 수 — 회향 시각이 이번 달인 기록
      // (아주 옛 기록에는 회향 시각이 없어, 받은 시각으로 받쳐 준다)
      const returned = s.history.filter((h) =>
        inMonth(h.journalAt ?? h.receivedAt)
      ).length;

      // 이번 달 함께한 날수 — 이번 달의 접속일 ∪ 이번 달 화두를 품고 있던 날
      const monthDays = new Set<string>();
      const monthPrefix = visitDayKey(monthStart).slice(0, 8); // "YYYY-MM-"
      for (const v of visits) {
        if (v.startsWith(monthPrefix)) monthDays.add(v);
      }
      for (const sess of sessions) {
        addHeldDays(
          Math.max(sess.receivedAt, monthStart),
          Math.min(sess.journalAt ?? now, monthEnd - 1),
          monthDays
        );
      }

      // 이번 달 호흡 명상 — 마칠 때마다 적힌 명상 장부를 센다
      const meditationLog = loadMeditations();
      const meditations = meditationLog.filter((t) => inMonth(t)).length;

      setReport({ returned, days: monthDays.size, meditations });

      // ── 이 달의 흐름 — 날짜별로 나눠, 그래프가 그릴 수 있게 ──
      const daysInMonth = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0
      ).getDate();
      const dayIdx = (t: number) => new Date(t).getDate() - 1;
      const returnedByDay = new Array(daysInMonth).fill(0);
      const meditationsByDay = new Array(daysInMonth).fill(0);
      for (const h of s.history) {
        const t = h.journalAt ?? h.receivedAt;
        if (!inMonth(t)) continue;
        returnedByDay[dayIdx(t)] += 1;
      }
      for (const t of meditationLog) {
        if (inMonth(t)) meditationsByDay[dayIdx(t)] += 1;
      }
      setChart({ returned: returnedByDay, meditations: meditationsByDay });

      // ── 올해의 마음 — 연말에 한 장으로 볼 수 있는 요약. 달마다 리셋되는
      // 이달의 마음과 달리, 1월 1일부터 지금까지를 누적한다 ──
      const yearStart = new Date(base.getFullYear(), 0, 1).getTime();
      const yearEnd = new Date(base.getFullYear() + 1, 0, 1).getTime();
      const inYear = (t: number) => t >= yearStart && t < yearEnd;
      const yearReturned = s.history.filter((h) =>
        inYear(h.journalAt ?? h.receivedAt)
      ).length;
      const yearMeditations = meditationLog.filter((t) => inYear(t)).length;
      const yearDays = new Set<string>();
      const yearPrefix = String(base.getFullYear());
      for (const v of visits) {
        if (v.startsWith(yearPrefix)) yearDays.add(v);
      }
      for (const sess of sessions) {
        addHeldDays(
          Math.max(sess.receivedAt, yearStart),
          Math.min(sess.journalAt ?? now, yearEnd - 1),
          yearDays
        );
      }
      setYearReport({
        year: base.getFullYear(),
        returned: yearReturned,
        meditations: yearMeditations,
        days: yearDays.size,
      });

      // ── 품어온 시간 — 화두마다 품은 일수, 오래 품은 순(내림차순) ──
      const toHeld = (sess: Session, isCurrent: boolean): HeldItem => {
        const end = sess.journalAt ?? now;
        const d = new Date(sess.receivedAt);
        return {
          key: `${sess.hwaduId}-${sess.receivedAt}${isCurrent ? "-now" : ""}`,
          from: `${d.getMonth() + 1}.${d.getDate()}`,
          receivedAt: sess.receivedAt,
          question: flatQuestion(sessionQuestion(sess)),
          days: Math.max(1, Math.floor((end - sess.receivedAt) / DAY)),
          current: isCurrent,
        };
      };
      setHeld(
        [
          ...s.history.map((h) => toHeld(h, false)),
          ...(s.current ? [toHeld(s.current, true)] : []),
        ].sort((a, b) => b.receivedAt - a.receivedAt)
      );
    };
    refresh();
    window.addEventListener("hwadoo-store-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hwadoo-store-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // 내가 던진 화두 — 브라우저 서랍을 읽고, 서버에서 걸음(승인·받은 수)을 살핀다
  useEffect(() => {
    const list = loadMyThrown();
    setMyThrown(list);

    const ids = list
      .map((t) => t.id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (ids.length === 0) return;
    fetchMyThrownStats(ids)
      .then((stats) =>
        setThrownStats(new Map(stats.map((st) => [st.sourceId, st])))
      )
      .catch(() => {
        // 조회 실패 — 걸음 표기 없이 목록만 보인다
      });
  }, []);

  // 내 나눔 통계 — 로그인된 상태에서 승인된 회향 수를 가져온다
  useEffect(() => {
    if (!user?.uid) return;
    fetchMyApprovedAnswerCount(user.uid)
      .then(setMyAnswerCount)
      .catch(() => {});
  }, [user?.uid]);

  // 내 연꽃 잔고 — 로그인했을 때만
  useEffect(() => {
    if (!user) {
      setMyLotus(null);
      return;
    }
    getLotus()
      .then(setMyLotus)
      .catch(() => {});
  }, [user]);

  // 실시간 접속자 추적
  useEffect(() => {
    const stopWatch = watchOnlineCount(setOnlineCount);
    return () => {
      stopWatch();
    };
  }, []);

  // 구글 로그인 — 팝업이 막히거나 닫히면 그 까닭을 알린다
  const handleLogin = async () => {
    setLoginBusy(true);
    setLoginError("");
    try {
      await loginWithGoogle();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/popup-blocked") {
        setLoginError(
          "팝업이 막혔습니다. 브라우저에서 팝업을 허용하거나, 기본 브라우저로 열어 주세요."
        );
      } else if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setLoginError("로그인 창이 닫혔습니다. 다시 시도해 주세요.");
      } else {
        setLoginError("로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    } finally {
      setLoginBusy(false);
    }
  };

  // 문안 받기 — 허락을 구하고 구독한다.
  // 브라우저가 차단해 두었으면 푸는 방법을 바로 아래에 편다.
  const handlePushOn = async () => {
    setPushBusy(true);
    setPushError("");
    setPushGuide(false);
    try {
      const result = await enablePush();
      if (result === "granted") {
        setPushUi("on");
      } else if (result === "denied") {
        setPushUi("denied");
        setPushGuide(true);
      } else if (result === "unsupported") {
        setPushUi("unsupported");
      } else {
        setPushError("알림을 켜지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  // 그만 받기 — 조용히 구독을 내린다
  const handlePushOff = async () => {
    setPushBusy(true);
    setPushError("");
    try {
      await disablePush();
      setPushUi("off");
    } finally {
      setPushBusy(false);
    }
  };

  // 토글 한 번으로 — 켜짐이면 내리고, 꺼짐이면 올린다.
  // 차단이면 첫 누름에 푸는 법 안내를 펴고, 다음 누름부터는 다시 시도한다
  // (안내대로 허용을 풀고 왔다면 그대로 켜진다)
  const handlePushToggle = () => {
    if (pushUi === "on") {
      void handlePushOff();
    } else if (pushUi === "denied" && !pushGuide) {
      setPushGuide(true);
    } else if (pushUi === "off" || pushUi === "denied") {
      void handlePushOn();
    }
  };

  // 홈 화면에 담기 — 받아 둔 프롬프트를 연다
  const handleInstall = async () => {
    setInstallBusy(true);
    try {
      const result = await promptInstall();
      if (result === "accepted") setInstallDone(true);
      // dismissed / unavailable — 프롬프트가 비워져 onInstallChange 가 안내로 바꾼다
    } finally {
      setInstallBusy(false);
    }
  };

  const sectionGap = "mt-11";

  // 품어온 시간 한 줄 — "3.2 · {질문 전문} · 108일" (여러 줄 허용, 줄이지 않는다)
  const heldRow = (h: HeldItem) => (
    <li key={h.key} className="break-keep text-[12px] leading-6 text-hanji-dim">
      <span className="text-hanji-faint">{h.from}</span>
      {" · "}
      <span className="text-hanji">{h.question}</span>
      <span className="text-hanji-faint">
        {" · "}
        {h.current ? <>지금 품는 중 · {h.days}일째</> : <>{h.days}일</>}
      </span>
    </li>
  );

  // ── 폰 판에 올릴 것만 추려 둔다 ──
  const meRank = rankByNeed(realmOf(merit.total, journalCount).need);
  const meUp = nextRealm(merit.total, journalCount);
  // 서비스 전부 — 형: 「서비스 다 넣어주고」.
  // 폰 판은 그림 대신 **한자 한 글자**다. 스물넷을 동그라미로 깔면
  // 그림은 다 달라도 알아보기 어렵고, 한 글자는 작아도 또렷하다.
  const ME_MARK: Record<string, string> = {
    "/": "苑", "/ganhwaseon": "禪", "/masters": "師", "/room": "思",
    "/my-hwadu": "問", "/mandala": "曼", "/pilgrimage": "寺", "/gathering": "緣",
    "/moktak": "功", "/sambae": "歸", "/bae": "拜", "/breath": "息",
    "/mung": "無", "/empty": "空", "/candle": "燈", "/lotus": "蓮",
    "/community": "池", "/archive": "庫", "/sutra": "經", "/draw": "占",
    "/rank": "進", "/tea": "茶", "/goods": "物", "/tamjinchi": "投",
    "/hasim": "下", "/letters": "信", "/moment": "時", "/try": "試",
  };
  const meServices = [
    // 하심도 공덕 판 갈래로 갔다 — 여기서는 열지 않는다
    ...SERVICES.filter((v) => v.href && !v.soon).map((v) => ({
      href: v.href as string,
      label: v.label,
    })),
    { href: "/letters", label: "쪽지" },
    // 형: 「버튼 중에 체험하기 하나 넣고 되살리자」
    { href: "/try", label: "체험하기" },
  ]
    .filter((v, i, a) => a.findIndex((w) => w.href === v.href) === i)
    .map((v) => ({ ...v, mark: ME_MARK[v.href] ?? "·" }));

  // 형: 「왜 공덕에 멍 없냐. 안 했어도 공덕 주는 건 다 0번이라고라도
  //      표현해서 올려둬」
  // 한 것만 보이면 **무엇을 하면 공덕이 붙는지** 알 수가 없다.
  // 갈래 전부를 깔고, 한 것부터 앞에 세운다 — 0 도 자리를 지킨다.
  const meHits = (Object.keys(MERIT_VALUE) as MeritSource[])
    .map((k) => [k, merit.hits?.[k] ?? 0] as [MeritSource, number])
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    // 형: 「내가 쌓은 공덕은 … 몇 번 쳤는지를 내 도량에서 보여주고」.
    // 넷으로 자르던 것을 걷는다 — 한 것은 다 보여 준다
    .map(([k, n]) => ({ label: SOURCE_LABEL[k] ?? k, n: n ?? 0 }));

  return (
    <>
    {/* ── 폰 판(我) ──
        옛 내 도량은 한 스크롤에 열다섯 덩이였다. 폰에서는 넷만 둔다 —
        이름 · 자리 · 쌓은 것 · 무엇을 몇 번. 나머지는 「⋯」 뒤로.
        지운 것은 없다, 한 겹 아래로 갔을 뿐이다. */}
    {!meMore && (
      <HipMe
        name={me?.name ?? "나무"}
        rank={{ hanja: meRank.hanja, name: meRank.name }}
        pct={Math.round(realmProgress(merit.total, journalCount) * 100)}
        next={
          meUp
            ? {
                hanja: rankByNeed(meUp.to.need).hanja,
                left: meUp.left,
                need: meUp.needMore,
              }
            : null
        }
        merit={merit.total}
        hits={meHits}
        services={meServices}
        guest={user === null}
        law={{
          links: [
            { href: "/about", label: "서비스 소개" },
            { href: "/terms", label: "이용약관" },
            { href: "/privacy", label: "개인정보" },
            { href: "/youth", label: "청소년보호" },
          ],
          email: CONTACT_EMAIL,
          biz: `${BIZ_NAME} · 대표 ${BIZ_OWNER} · 사업자등록번호 ${BIZ_REG_NO} · 통신판매업신고 ${BIZ_MAIL_ORDER_NO} · ${BIZ_ADDRESS} · 연락처 ${BIZ_PHONE ?? CONTACT_EMAIL}`,
        }}
        account={
          user === undefined ? (
            <p className="hip-acc-wait">불러오는 중</p>
          ) : user ? (
            <>
              {/* 들어와 있는 사람 — 얼굴 한 자리와 이메일 한 줄.
                  형: 「내 도량에서 로그인 부분도 디자인 좀 더 주고」 */}
              <div className="hip-acc-card">
                <i aria-hidden>{isAdminAccount(user) ? "牛" : "人"}</i>
                <div>
                  <p className="hip-acc-name">
                    {user.displayName ?? "수행자"}
                  </p>
                  <p className="hip-acc-who">{user.email ?? "이메일 없음"}</p>
                </div>
              </div>

              {/* 뒷방 — **관리자로 들어왔을 때만.**
                  형: 「나는 andrewjhshin@gmail.com 이고 관리자니까 관리 기능
                  뒷방 관리하는 거, 그거 내 아이디로 접속했을 때만 그 기능 줘야지.
                  오리지날에 있는 거 그대로 가져가자」 — 옛 판의 그 칸 그대로,
                  승인 기다리는 화두 수까지 같이 온다. */}
              {isAdminAccount(user) && (
                <Link href="/admin" className="hip-acc-admin">
                  <b>뒷방</b>
                  <span>
                    {pendingCount === null
                      ? "살피는 중"
                      : pendingCount > 0
                        ? `기다리는 화두 ${pendingCount}`
                        : "기다리는 물음 없음"}
                  </span>
                </Link>
              )}

              <button
                onClick={() => logout().catch(() => {})}
                className="hip-acc-out"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                disabled={loginBusy}
                className="hip-strike"
              >
                {loginBusy ? "여는 중" : "구글로 로그인"}
              </button>
              <p className="hip-acc-why">
                로그인하면 기기가 바뀌어도 이어집니다 · 만 19세 이상
              </p>
              {loginError && <p className="hip-acc-bad">{loginError}</p>}
            </>
          )
        }
        /* 법명 고치기 — 형: 「내 도량에서 법명이나 아이디 고칠 수 있도록」.
           setName 은 어긋나면 까닭을 문자열로 돌려준다(맞으면 null) */
        onRename={(next) => setName(next) ?? null}
        onReroll={() =>
          rerollName(yin === "m" ? "yang" : yin === "f" ? "eum" : undefined)
        }
        nameProblem={nameProblem}
        seats={REALMS.map((seat) => {
          const r = rankByNeed(seat.need);
          return {
            hanja: r.hanja,
            name: r.name,
            need: seat.need,
            got: isAdminAccount(user) || merit.total >= seat.need,
            here: myRealm.id === seat.id,
          };
        })}
        charms={
          <div className="hip-charms">
            {CHARMS.map((c) => (
              <span
                key={c.id}
                data-got={charms[c.id] ? "1" : undefined}
                title={charms[c.id] ? c.wish : c.how}
                dangerouslySetInnerHTML={{ __html: charmSvg(c.id, "m" + c.id) }}
              />
            ))}
          </div>
        }
        bells={
          <div className="hip-bells">
            {BELLS.map((b) => (
              <button
                key={b.id}
                onClick={() => toggleBell(b.id)}
                data-on={bells.includes(b.id) ? "1" : undefined}
              >
                {b.time}
              </button>
            ))}
          </div>
        }
      />
    )}
    <div className={`mx-auto w-full max-w-xl flex-1 px-6 py-12 ${meMore ? "" : "max-md:hidden"}`}>
      {/* 머리 — 왼쪽 공유, 가운데 이름, 오른쪽 내 연꽃·공덕.
          셋을 absolute 로 띄워 뒀더니 알약이 넓어지면서 이름 위로 올라탔다.
          이제 한 줄에 제자리를 준다 — 이름은 남은 폭 한가운데. */}
      <div className="flex items-center gap-2">
        <ShareButton
          title="내 도량 공유"
          text={yearReport
            ? `화두 ${yearReport.year}년 — 받은 화두 ${yearReport.returned} · 호흡 명상 ${yearReport.meditations} · 함께한 날 ${yearReport.days}일`
            : "화두 내 도량"}
        />
        <h1 className="min-w-0 flex-1 truncate text-center text-xs tracking-[0.5em] text-gold-soft">
          道場 · 내 도량
        </h1>
        <LotusCount className="shrink-0" />
      </div>

      {/* ── 누구로 들어와 있나 · 나가는 문 ──
          로그아웃 단추는 이 긴 화면의 **맨 아래**에 있었다. 폰에서는
          엄지로 한참 굴려야 닿아, 형이 「모바일에서 로그아웃이 안 보인다」
          했다. 맞다 — 나가는 문은 눈에 보이는 데 있어야 한다.
          계정 줄과 함께 맨 위로 올린다. 아래 것은 그대로 둔다(익숙한
          사람이 찾던 자리를 없애지는 않는다). ── */}
      {user && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3">
          {/* 동그란 얼굴 — 누르면 남이 보는 나로. 형: 「동그라미 프로필에
              사진 하고 그 안에 돋보기 넣고」 */}
          <YeonAvatar />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-hanji">
              {user.displayName ?? "수행자"}님
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-hanji-faint">
              {user.email ?? "이메일 없음"}
            </p>
          </div>
          <button
            onClick={() => logout().catch(() => {})}
            className="shrink-0 rounded-full border border-ink-3 px-4 py-2 text-[11.5px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* ── 오늘 하루 — 나무 · 이어 온 날 · 오늘의 세 가지.
             매일 들어올 이유는 맨 위에 있어야 한다 ── */}
      <div className="mt-7">
        <DailyPractice />
      </div>

      {/* ── 자리(位) — 동자에서 시작해 공덕과 화두로 오른다.
           여섯을 다 깔아 두어야 지금 어디쯤인지, 다음이 어딘지 한눈에 든다.
           프로필 바로 아래 — 계급은 위에 있어야 계급이다.

           한동안 이 칸에 육도(지옥도·아귀도·축생도…)를 깔았다. 뗐다 —
           육도는 오르는 사다리가 아니라 벗어나야 할 굴레이고, 목표는
           천상도가 아니라 그 밖이다. 천상도조차 복이 다하면 떨어진다.
           게다가 사람에게 「지금 당신은 지옥도, 다음은 아귀도」라고 말하는
           화면이었다. 문턱(realm.ts REALMS)은 그대로 쓰고 이름만 바꾼다. ── */}
      <section className={`rise ${sectionGap}`}>
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            位 · 자리
          </p>
          <Link
            href="/rank"
            className="text-[11px] text-gold-soft transition-colors hover:text-gold"
          >
            랭킹 →
          </Link>
        </div>
        {/* ── 輪 · 수레바퀴 ──
            여섯 자리를 한 줄 격자로 깔면 글자가 열여덟이다 — 한자 여섯 ·
            이름 여섯 · 문턱 여섯. 형: 「텍스트 최대한 빼고 힙하고 합하게」.

            바퀴로 세우면 **한자 여섯 글자만** 남는다. 이름과 문턱은
            누르면 알면 되는 것이지, 늘 떠 있을 것이 아니다.
            (문턱은 그대로 realm.ts 가 쥐고, 이름은 rankByNeed 에서 온다 —
             육도 등급표로 되돌리지 않는다) */}
        <div className="mt-4 border-t border-ink-3 pt-6 md:hidden">
          <div className="hip-wheel">
            <svg viewBox="0 0 300 300" aria-hidden>
              <circle cx="150" cy="150" r="104" fill="none" stroke="var(--hip-edge)" strokeWidth="1.5" />
              <circle
                cx="150" cy="150" r="74" fill="none"
                stroke="var(--hip-edge-soft)" strokeWidth="1" strokeDasharray="3 8"
              />
            </svg>
            {REALMS.map((realmSeat, idx) => {
              // 문턱은 육도가 쥐고, 이름은 자리에서 가져온다(merit.rankByNeed)
              const r = { ...rankByNeed(realmSeat.need), id: realmSeat.id, mark: rankByNeed(realmSeat.need).hanja };
              // 뒷방 주인은 모든 자리가 밝다 — 도량 주인의 자리
              const got = isAdminAccount(user) || merit.total >= r.need;
              const here = isAdminAccount(user)
                ? r.id === "cheonsang"
                : myRealm.id === r.id;
              const a = ((idx / REALMS.length) * 360 - 90) * (Math.PI / 180);
              return (
                <button
                  key={r.id}
                  type="button"
                  title={`${r.name} · 공덕 ${r.need.toLocaleString("ko-KR")}`}
                  aria-label={`${r.name} · 공덕 ${r.need.toLocaleString("ko-KR")}`}
                  aria-current={here ? "true" : undefined}
                  data-got={got ? "1" : undefined}
                  data-here={here ? "1" : undefined}
                  style={{
                    left: `${50 + 34.7 * Math.cos(a)}%`,
                    top: `${50 + 34.7 * Math.sin(a)}%`,
                  }}
                >
                  {r.mark}
                </button>
              );
            })}
            <span className="hub">{rankByNeed(myRealm.need).hanja}</span>
          </div>
        </div>

        {/* ── 웹은 원래대로 ── 형: 「웹은 원래대로 두고」.
            여섯 칸 격자를 768px 위에서만 그대로 세운다 */}
        <div className="mt-4 hidden grid-cols-6 gap-1.5 border-t border-ink-3 pt-5 md:grid">
          {REALMS.map((realmSeat) => {
            const r = { ...rankByNeed(realmSeat.need), id: realmSeat.id, mark: rankByNeed(realmSeat.need).hanja };
            const got = isAdminAccount(user) || merit.total >= r.need;
            const here = isAdminAccount(user)
              ? r.id === "cheonsang"
              : myRealm.id === r.id;
            return (
              <div
                key={r.id}
                title={`${r.name} · 공덕 ${r.need.toLocaleString("ko-KR")}`}
                className={`flex flex-col items-center gap-1.5 rounded-[11px] px-0.5 py-3 text-center transition-colors ${
                  here ? "bg-gold/10 ring-1 ring-gold/40" : ""
                } ${got ? "" : "opacity-40"}`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    here
                      ? "border-gold bg-gold text-ink"
                      : got
                        ? "border-gold/50 bg-gold/5 text-gold"
                        : "border-dashed border-ink-3 text-hanji-faint"
                  }`}
                >
                  <span className="font-serif text-[16px] font-light leading-none">
                    {r.mark}
                  </span>
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    got ? "text-hanji" : "text-hanji-dim"
                  }`}
                >
                  {r.name}
                </span>
                <span className="text-[9px] leading-tight tabular-nums text-hanji-faint">
                  {r.need === 0 ? "시작" : r.need.toLocaleString("ko-KR")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 break-keep text-[11.5px] leading-5 text-hanji-faint">
          {isAdminAccount(user)
            ? "뒷방 주인의 자리 — 여섯 자리가 모두 열려 있습니다."
            : upRealm
              ? `${rankByNeed(upRealm.to.need).name}까지 공덕 ${upRealm.left.toLocaleString("ko-KR")}` +
                (upRealm.needMore > 0 ? ` · 화두 ${upRealm.needMore}개` : "")
              : "가장 높은 자리"}
          <Info title="位 · 자리" className="ml-1.5">
            <b className="text-hanji">공덕</b>과 <b className="text-hanji">화두</b>가 쌓이면
            부처가 될 수 있습니다.
            <br />
            발길이 뜸해지면 단계가 하나씩 내려갑니다.
          </Info>
        </p>
      </section>

      {/* ── 공덕(功德) — 쌓고, 남에게 돌린다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          공덕
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <div>
            {/* 자 하나만 둔다.
                예전엔 넉 줄이 저마다 다른 자로 재고 있었다 — 총 공덕, 이번
                백팔 바퀴(17/108), 오늘 몫(1,188/2,160), 연꽃까지(1,637/6,480).
                게다가 화면 맨 위 실선까지 다섯째 자였다. 어느 게 무슨 뜻인지
                아무도 몰랐다.
                「백팔 바퀴」를 버렸다 — 세어 봐야 할 일이 달라지지 않는 수였다.
                남은 것은 셋, 저마다 묻는 것이 다르다:
                  오늘 얼마나 했나 · 연꽃까지 얼마 남았나 · 내 자리는 어디인가 */}
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-[30px] leading-none text-gold">
                {merit.total.toLocaleString("ko-KR")}
              </span>
              <span className="text-[12px] text-hanji-dim">
                지금까지 쌓은 공덕
              </span>
            </p>

            {/* 무엇을, 몇 번 —
                형: 「공덕은 횟수로 치자. 목탁 몇 번 염주 몇 번 이렇게」

                한동안 큰 동그라미 열여섯 개가 넉 줄로 깔려 있었다. 그중
                여덟은 0이었다. 안 한 일을 화면 절반에 걸어 두는 셈이라,
                정작 **한 일**이 안 보였다. 작은 알약으로 되돌린다 —
                **한 것만**, 많이 한 것부터. 머리글도 뗐다(무슨 줄인지는
                「목탁 222번」이 이미 말한다). */}
            {(() => {
              const done = PRACTICE_HITS.filter(
                ({ source }) => (merit.hits?.[source] ?? 0) > 0
              ).sort(
                (x, y) =>
                  (merit.hits?.[y.source] ?? 0) - (merit.hits?.[x.source] ?? 0)
              );
              if (done.length === 0) return null;
              return (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {done.map(({ source, label }) => (
                    <span
                      key={source}
                      className="rounded-full border border-ink-3 px-2.5 py-[3px] text-[11px] leading-[1.45] text-hanji-dim"
                    >
                      {label}{" "}
                      <span className="tabular-nums text-hanji">
                        {(merit.hits?.[source] ?? 0).toLocaleString("ko-KR")}
                      </span>
                      <span className="text-hanji-faint">번</span>
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* ① 오늘 — 이 자리의 자는 「오늘 얼마나 했나」 하나뿐이다 */}
            <div className="mt-4 flex items-baseline justify-between text-[11.5px]">
              <span className="text-hanji-faint">오늘</span>
              <span className={room.left > 0 ? "text-hanji-dim" : "text-gold"}>
                {room.earned.toLocaleString("ko-KR")} / {DAILY_TOTAL_CAP.toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, (room.earned / DAILY_TOTAL_CAP) * 100)}%`,
                }}
              />
            </div>
            {/* 같은 말을 두 줄로 하고 있었다 — 막대 밑에 한 번, 판 끝에
                또 한 번. 둘 다 「고루 돌면 찬다 · 차면 연꽃」이었다.
                막대와 숫자가 이미 그 말을 한다. 다 찬 날의 한마디만 남긴다. */}
            {room.left <= 0 && (
              <p className="mt-1.5 text-[11px] leading-5 text-gold">
                오늘 몫이 찼어요. 내일 또 이어 가세요.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 나의 걸음 ──
          형: 「받은 화두랑 화두와 함께 저거는 지우고」.
          큰 판 두 짝이 40px 숫자로 앉아 있었다. 둘 다 아래 「이달의
          마음」·「올해의 마음」이 같은 수를 다시 말하고 있었고, 서고로
          가는 길도 아래 「지난 화두 보기」가 따로 쥐고 있다. 남은 것은
          나눔의 흔적 세 줄뿐이다. */}
      {/* 두 줄 다 조건부라, 큰 판을 걷고 나니 아무것도 없는 날에는 빈 칸만
          44px 남았다. 판이 있을 땐 판이 자리를 채워 안 보이던 것이다.
          할 말이 없으면 **칸 자체를 안 연다.** */}
      {(() => {
        const given = user && myAnswerCount !== null ? myAnswerCount : 0;
        const got =
          user && thrownStats !== null
            ? Array.from(thrownStats.values()).reduce((s, st) => s + st.seen, 0)
            : 0;
        if (given <= 0 && got <= 0) return null;
        return (
          <section className={`rise ${sectionGap}`}>
            {/* 나눔의 흔적 — 내 회향이 닿은 사람, 내 화두를 받은 사람 */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 px-1">
              {given > 0 && (
                <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
                  회향이{" "}
                  <span className="text-hanji-dim">{given}</span>
                  명에게 전해졌습니다
                </p>
              )}
              {got > 0 && (
                <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
                  내 화두를{" "}
                  <span className="text-hanji-dim">{got}</span>
                  명이 받았습니다
                </p>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── 우리 절 — 부적보다 앞이다. 매일 보는 것은 이쪽이다 ── */}
      <MyTemplePicker className={sectionGap} />

      {/* ── 부적 — 수행하다 얻는 노란 종이. 도량 벽에 건다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          부적 — 도량에 건 것
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-3 pt-5">
          {CHARMS.map((c) => {
            const got = !!charms[c.id];
            return (
              <div key={c.id} className="text-center">
                <span
                  className={`mx-auto block w-full max-w-[92px] transition-opacity ${
                    got ? "" : "opacity-20 grayscale"
                  }`}
                  dangerouslySetInnerHTML={{ __html: charmSvg(c.id, "s" + c.id) }}
                />
                <p className="mt-1.5 text-[11.5px] text-hanji">
                  {got ? c.name : "―"}
                </p>
                <p className="mt-0.5 break-keep text-[10.5px] leading-4 text-hanji-faint">
                  {got ? c.wish : c.how}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 서비스 — 걸음 바로 아래, 멀리 내리지 않아도 닿게 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">서비스</p>
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-ink-3 pt-5">
          {[
            ...SERVICES,
            ...(dmVisible(user?.uid)
              ? [{ href: "/letters", label: "쪽지함", Icon: Letter } as ServiceItem]
              : []),
          ].map((s) => {
            const itemCls =
              "relative flex flex-col items-center gap-2 rounded-[12px] px-1 py-3 text-center transition-colors hover:bg-gold/5";
            const inner = (
              <>
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-ink-3 bg-ink-2/50">
                  <s.Icon className="h-5 w-5 text-gold-soft" />
                  {s.soon && (
                    <span className="absolute -right-1.5 -top-1 rounded-full border border-gold/40 bg-ink px-1.5 py-px text-[9px] leading-tight text-gold-soft">
                      곧
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-tight text-hanji-dim">
                  {s.label}
                </span>
              </>
            );
            return s.href ? (
              <Link key={s.href + s.label} href={s.href} className={itemCls}>
                {inner}
              </Link>
            ) : (
              // 아직 문이 열리지 않은 자리 — 눌러도 이동하지 않는다
              <button
                key={s.label}
                type="button"
                className={`${itemCls} cursor-default`}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 마음 리포트 ─────────────────────────────────────────
          전에는 「이달의 마음」과 「올해의 마음」이 따로 두 칸이었다.
          그런데 둘이 **똑같은 지표 셋**(받은 화두·호흡 명상·함께한 날)을
          위아래로 되풀이하고 있었다. 게다가 호흡 명상은 안 쓰는 사람에겐
          늘 0 이라 칸 하나가 통째로 죽어 있었다.

          한 판으로 합치고 기간은 알약으로 가른다. 지표도 실제로 움직이는
          것들로 갈아 끼웠다 — 받은 화두 · 회향 · 공덕 · 함께한 날. */}
      <Fold title="마음 리포트" note="이 달 · 올해">
      <section className={`rise rise-d1 ${sectionGap}`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">心 · 마음</p>
          <div className="inline-flex rounded-full border border-ink-3 bg-ink-2/50 p-0.5">
            {(
              [
                ["month", "이 달"],
                ["year", "올해"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSpan(k)}
                aria-pressed={span === k}
                className={`rounded-full px-3.5 py-1 text-[11.5px] transition-colors ${
                  span === k ? "bg-gold/15 text-gold" : "text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const r = span === "year" ? yearReport : report;
          const empty =
            !r || (r.returned === 0 && r.days === 0 && r.meditations === 0 && held.length === 0);
          if (empty) {
            return (
              <p className="mt-4 border-t border-ink-3 pt-5 text-[13px] leading-7 text-hanji-dim">
                {span === "year" ? "올해" : "이번 달"}의 걸음이 아직 없습니다.
              </p>
            );
          }
          const cells = [
            { n: r.returned, unit: "", label: "받은 화두" },
            { n: journalCount, unit: "", label: "회향한 화두" },
            { n: merit.total, unit: "", label: "쌓은 공덕" },
            { n: r.days, unit: "일", label: "함께한 날" },
          ];
          return (
            <div className="mt-4 border-t border-ink-3 pt-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {cells.map((c) => (
                  <div
                    key={c.label}
                    className="rounded-[12px] border border-ink-3 bg-ink-2/40 px-2 py-4 text-center"
                  >
                    <p className="font-serif text-[24px] font-light leading-none text-gold tabular-nums">
                      {c.n.toLocaleString("ko-KR")}
                      {c.unit && (
                        <span className="ml-0.5 text-[13px] text-hanji-dim">{c.unit}</span>
                      )}
                    </p>
                    <p className="mt-2 text-[10px] tracking-[0.15em] text-hanji-faint">
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>

              {held.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] tracking-[0.2em] text-hanji-faint">품어온 시간</p>
                  <ul className="mt-2.5 space-y-2">
                    {[held.find((h) => h.current), held.find((h) => !h.current)]
                      .filter((h): h is HeldItem => Boolean(h))
                      .map(heldRow)}
                  </ul>
                  <Link
                    href="/archive"
                    className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-ink-3 px-4 py-2 text-[11px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    <Book className="h-3.5 w-3.5 text-gold-soft" />
                    지난 화두 보기 · {journalCount}
                  </Link>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      </Fold>

      {/* ── 알림 — 아침 문안: 제목 한 줄 + 온/오프 토글.
          차단이면 토글을 눌렀을 때 푸는 법 안내가 접혀 나온다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            알림 — 문안 켜기
          </p>
          {/* 토글 스위치 — 켜짐: 금색 채움 · 꺼짐: 테두리만 */}
          <button
            role="switch"
            aria-checked={pushUi === "on"}
            aria-label="아침 문안 알림"
            onClick={handlePushToggle}
            disabled={
              pushBusy ||
              pushUi === "loading" ||
              pushUi === "unsupported" ||
              pushUi === "preparing"
            }
            className={`relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
              pushUi === "on"
                ? "border-gold bg-gold"
                : "border-hanji-faint bg-transparent hover:border-hanji-dim"
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
                pushUi === "on" ? "translate-x-5 bg-ink" : "bg-hanji-faint"
              }`}
            />
          </button>
        </div>
        {/* 예불 종 — 하루 네 번, 정해진 시각의 알림. 문안(푸시)이 켜져 있어야 온다 */}
        <div className="mt-5 rounded-[12px] border border-ink-3 px-4 py-4">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            예불 종 — 시각을 골라 두드립니다
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {BELLS.map((b) => {
              const on = bells.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBell(b.id)}
                  className={`flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                    on
                      ? "border-gold/60 bg-gold/10 text-hanji"
                      : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                  }`}
                >
                  <span className="text-[12.5px] leading-5">{b.label}</span>
                  <span
                    className={`text-[11px] tracking-wide ${on ? "text-gold-soft" : ""}`}
                  >
                    {b.time}
                  </span>
                </button>
              );
            })}
          </div>
          {pushUi !== "on" && bells.length > 0 && (
            <p className="mt-3 break-keep text-[11.5px] leading-5 text-hanji-faint">
              위의 문안 알림을 켜야 예불 종이 실제로 울립니다.
            </p>
          )}
        </div>
        <div className="mt-4 border-t border-ink-3 pt-5">
          {/* 새 소식 — 아직 보지 않은 것만, 금색 점 한 줄씩.
              나열되고 잠시 뒤 장부에 적혀, 사이드바·탭의 점이 꺼진다 */}
          {notices.length > 0 && (
            <ul className="mb-5 space-y-2 rounded-[12px] border border-gold/25 bg-gold/5 px-4 py-3.5">
              {notices.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-2.5 break-keep text-[13px] leading-6 text-hanji"
                >
                  <span
                    aria-hidden
                    className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold shadow-[0_0_6px_var(--color-gold)]"
                  />
                  {n.text}
                </li>
              ))}
            </ul>
          )}
          {/* 미지원·준비 중일 때만 한 줄 안내 */}
          {(pushUi === "unsupported" || pushUi === "preparing") && (
            <p className="break-keep text-[12px] leading-6 text-hanji-faint">
              {pushUi === "unsupported"
                ? "이 브라우저는 알림을 받을 수 없습니다. (아이폰은 홈 화면에 추가한 뒤 가능)"
                : "알림을 준비하고 있습니다."}
            </p>
          )}
          {/* 차단 상태에서 토글을 누르면 접혀 나오는 푸는 법 */}
          {pushGuide && (
            <div className="mt-4 break-keep rounded-[10px] border border-ink-3 bg-ink-2/40 px-4 py-3 text-[12px] leading-6 text-hanji-dim">
              <p className="text-hanji">
                브라우저가 알림을 막아 두었습니다.
              </p>
              <p className="mt-1.5">
                · 컴퓨터: 주소창 왼쪽 자물쇠 → 알림 → 허용 → 새로고침
              </p>
              <p>
                · 안드로이드: 주소창 자물쇠 → 권한 → 알림 허용 (없으면 ⋮ →
                설정 → 사이트 설정 → 알림)
              </p>
              <p>
                · 아이폰: 사파리 공유 단추 → 홈 화면에 추가 → 홈 화면의
                화두로 열어 다시 시도
              </p>
              <p className="mt-1.5 text-hanji-faint">
                허용한 뒤 다시 토글을 눌러 주세요.
              </p>
            </div>
          )}
          {pushError && (
            <p className="mt-3 text-[12px] leading-6 text-vermilion">
              {pushError}
            </p>
          )}
        </div>
      </section>

      {/* ── 홈 화면에 앱처럼 담기 — standalone이면 숨김 ── */}
      {installUi !== "standalone" && !installDone && (
        <section className={`rise rise-d1 ${sectionGap}`}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
              홈 화면에 앱처럼 담기
            </p>
            {installUi === "promptable" ? (
              <button
                onClick={handleInstall}
                disabled={installBusy}
                className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
              >
                {installBusy ? "여는 중…" : "담기"}
              </button>
            ) : installUi !== null ? (
              <button
                onClick={() => setInstallGuide((v) => !v)}
                className="shrink-0 rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                방법 보기
              </button>
            ) : null}
          </div>
          {installGuide && installUi !== null && installUi !== "promptable" && (
            <div className="mt-4 border-t border-ink-3 pt-4">
              <p className="break-keep text-[12px] leading-6 text-hanji-faint">
                {installUi === "ios"
                  ? "사파리 공유 단추(□↑) → '홈 화면에 추가'를 누르면 앱처럼 쓸 수 있습니다."
                  : "브라우저 메뉴(⋮)의 '앱 설치' 또는 '홈 화면에 추가'를 누르면 담깁니다."}
              </p>
            </div>
          )}
        </section>
      )}

      <Fold title="그 밖에" note="차 한 잔 · 죽비 · 내가 던진 화두 · 로그인 · 도량 안내">
      {/* 음양 고르기는 뺐다 — 가입할 때 이미 받는다.
          같은 것을 두 군데서 물으면 어느 쪽이 참인지 알 수 없다. */}

      {/* ── 차 한 잔 — 바로 송금 ── */}
      <section className={`rise rise-d2 ${sectionGap}`}>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
          <Teacup className="h-[15px] w-[15px] text-gold-soft" />
          차 한 잔
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          {/* 찻값이 어디로 가는지만 적는다. 「값을 받지 않습니다」는 뺐다 —
              차 한 잔 칸에서 굳이 돈 안 받는다고 먼저 말할 일이 아니다 */}
          <p className="text-[13px] leading-7 text-hanji-dim">
            마음에 머물렀다면, 차 한 잔을 기부하실 수 있습니다.
            <br />
            찻값은 이 도량을 잇는 데 쓰이고,{" "}
            <span className="text-gold-soft">그중 일부는 불교계에 보시</span>
            합니다.
          </p>
          {DONATION_URL ? (
            !teaOpen ? (
              // 펼치기 전 — 담백한 버튼만 (QR을 바로 드러내지 않는다)
              <button
                onClick={() => setTeaOpen(true)}
                className="mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                <Teacup className="h-4 w-4 text-gold-soft" />
                차 한 잔 보태기
              </button>
            ) : (
            <>
              {/* 모바일 — 누르면 바로 카카오페이 */}
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-obang mt-5 inline-flex items-center gap-2.5 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 sm:hidden"
              >
                <Teacup className="h-4 w-4 text-gold-soft" />
                차 한 잔 보내기
              </a>
              {/* PC — 폰 카메라로 찍는 QR (카카오페이 링크는 웹에서 바로 안 열림) */}
              <div className="mt-5 hidden flex-col items-start gap-3 sm:flex">
                <div className="rounded-md bg-[#EDE6D4] p-3">
                  <QRCodeSVG
                    value={DONATION_URL}
                    size={116}
                    bgColor="#EDE6D4"
                    fgColor="#14110D"
                    level="M"
                  />
                </div>
                <p className="text-[11px] leading-5 text-hanji-faint">
                  휴대폰 카메라로 QR을 비추면 카카오페이가 열립니다.
                </p>
              </div>
            </>
            )
          ) : (
            <p className="mt-5 text-xs tracking-widest text-hanji-faint">
              찻자리를 마련하고 있습니다
            </p>
          )}
        </div>
      </section>

      {/* ── 죽비 — 따끔한 한마디: 불편한 점을 청한다 ── */}
      <section className={`rise rise-d2 ${sectionGap}`}>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
          <Jukbi className="h-[15px] w-[15px] text-gold-soft" />
          죽비 — 따끔한 한마디
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          {fbDone ? (
            <p className="text-[13px] leading-7 text-gold-soft">
              달게 받겠습니다. 고맙습니다.
            </p>
          ) : (
            <>
              <p className="break-keep text-[13px] leading-7 text-hanji-dim">
                불편했던 점, 바라는 점을 일러 주세요.
              </p>
              <textarea
                value={fb}
                onChange={(e) => setFb(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="어느 화면에서, 무엇이 불편했는지"
                className="mt-4 w-full resize-none rounded-[10px] border border-ink-3 bg-ink-2/40 px-4 py-3 text-[13px] leading-6 text-hanji outline-none transition-colors focus:border-gold/40"
              />
              <button
                onClick={async () => {
                  if (!fb.trim()) return;
                  setFbBusy(true);
                  setFbError("");
                  try {
                    await submitFeedback(fb);
                    setFbDone(true);
                  } catch {
                    setFbError(
                      "전하지 못했습니다. 잠시 뒤 다시 시도해 주세요."
                    );
                  } finally {
                    setFbBusy(false);
                  }
                }}
                disabled={fbBusy || !fb.trim()}
                className="mt-3 rounded-[10px] border border-ink-3 px-6 py-2.5 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji disabled:opacity-40"
              >
                {fbBusy ? "전하는 중…" : "일러주기"}
              </button>
              {fbError && (
                <p className="mt-3 text-[12px] leading-6 text-vermilion">
                  {fbError}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 내가 던진 화두 — 물음의 걸음: 살펴보는 중 / 수행자 N인 ── */}
      {myThrown !== null && (
        <section className={`rise rise-d2 ${sectionGap}`}>
          <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
            <Jukbi className="h-[15px] w-[15px] text-gold-soft" />
            내가 던진 화두
          </p>
          <div className="mt-4 border-t border-ink-3 pt-5">
            {myThrown.length === 0 ? (
              <>
                <p className="text-[13px] leading-7 text-hanji-dim">
                  아직 던진 물음이 없습니다.
                </p>
                <Link
                  href="/my-hwadu"
                  className="mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-ink-3 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  <Jukbi className="h-4 w-4 text-gold-soft" />
                  화두 던지러 가기
                </Link>
              </>
            ) : (
              <ul className="space-y-5">
                {myThrown.map((t) => {
                  const stat = t.id ? thrownStats?.get(t.id) : undefined;
                  return (
                    <li
                      key={t.thrownAt}
                      className="border-l border-gold/25 pl-4"
                    >
                      <p className="break-keep text-sm font-light leading-7 text-hanji-dim">
                        {t.question}
                      </p>
                      <p className="mt-1.5 text-[11px] tracking-wider text-hanji-faint">
                        {formatDate(t.thrownAt)} 던짐
                        {t.id &&
                          (stat?.status === "approved" ? (
                            <span className="text-gold-soft">
                              {" "}
                              · 수행자 {stat.seen}인이 받았습니다
                            </span>
                          ) : (
                            <> · 도량에서 살펴보는 중</>
                          ))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── 로그인 정보 — 맨 아래 ── */}
      <section className={`rise rise-d3 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          로그인 정보
        </p>

        {user === undefined ? (
          // 인증이 확정될 때까지 — 이 구획만 기다린다 (화면 전체를 비우지 않는다)
          <div className="mt-4 border-t border-ink-3 pt-5">
            <p className="text-[13px] leading-6 text-hanji-faint">
              불러오는 중…
            </p>
          </div>
        ) : user ? (
          <>
            <div className="mt-4 flex items-center gap-4 border-t border-ink-3 pt-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 text-hanji-dim">
                <Person className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-lg font-light text-hanji">
                  {user.displayName ?? "수행자"}님
                </p>
                <p className="mt-1 truncate text-[13px] text-hanji-dim">
                  {user.email ?? "이메일 없음"}
                </p>
              </div>
            </div>
            {/* 뒷방 들목은 화면 위의 카드로 옮겼다 — 여기는 로그아웃만 */}
            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={() => logout().catch(() => {})}
                className="rounded-[10px] border border-ink-3 px-6 py-2.5 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 border-t border-ink-3 pt-5">
            <p className="text-[13px] leading-6 text-hanji-dim">
              아직 로그인하지 않았습니다.
              <br />
              로그인하면 지난 화두들이 계정에 모여 — 기기가 바뀌어도 이어집니다.
              <br />
              만 19세 이상만 이용할 수 있습니다.
            </p>
            <button
              onClick={handleLogin}
              disabled={loginBusy}
              className="btn-obang mt-5 flex items-center gap-2.5 px-6 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Person className="h-4 w-4" />
              {loginBusy ? "여는 중…" : "구글로 로그인"}
            </button>
            {loginError && (
              <p className="mt-3 text-[12px] leading-6 text-vermilion">
                {loginError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── 도량 안내 — 손안에서는 아래 띠가 없으므로 여기에 모아 둔다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          도량 안내
        </p>
        <div className="mt-4 flex flex-col border-t border-ink-3 pt-3">
          {[
            { href: "/about", label: "서비스 소개" },
            { href: "/ganhwaseon", label: "간화선이란?" },
            { href: "/terms", label: "이용약관" },
            { href: "/privacy", label: "개인정보처리방침" },
            // 만 19세 이상 서비스는 이 자리가 법정 의무다
            { href: "/youth", label: "청소년보호정책" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-[10px] px-2 py-3 text-[13px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
            >
              {l.label}
              <span className="text-hanji-faint">›</span>
            </Link>
          ))}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center justify-between rounded-[10px] px-2 py-3 text-[13px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
          >
            문의
            <span className="text-[11px] text-hanji-faint">{CONTACT_EMAIL}</span>
          </a>
        </div>
        {/* 사업자 정보 — 전자상거래법상 표기 의무 */}
        <p className="mt-3 px-2 text-[10px] leading-5 text-hanji-faint">
          {BIZ_NAME} · 대표 {BIZ_OWNER} · 사업자등록번호 {BIZ_REG_NO} ·
          통신판매업신고 {BIZ_MAIL_ORDER_NO}
          <br />
          {BIZ_ADDRESS} · 연락처 {BIZ_PHONE ?? CONTACT_EMAIL}
        </p>
        <p className="mt-2 px-2 text-[10px] tracking-widest text-hanji-faint">
          © {new Date().getFullYear()} 화두 · 물음은 오래된 것, 답은 나의 것
        </p>
      </section>

      </Fold>

      {/* ── 뒷방 — 맨 아래에 둔다.
           관리자도 위에서부터는 다른 사람과 같은 내 도량을 본다.
           살림은 끝에 한 칸 ── 그게 뒷방이다. ── */}
      {isAdminAccount(user) && (
        <section className="rise mt-6">
          <div className="rounded-[14px] border border-gold/40 bg-gold/5 px-6 py-6 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
              <div>
                <p className="font-serif text-[17px] font-light tracking-wider text-gold">
                  뒷방 — 도량 살림
                </p>
                <p className="mt-2 text-[12px] leading-6 tracking-wider text-hanji-dim">
                  {pendingCount === null ? (
                    "던져진 물음을 살피는 중…"
                  ) : pendingCount > 0 ? (
                    <>
                      승인을 기다리는 화두{" "}
                      <span className="text-gold">{pendingCount}</span>건
                    </>
                  ) : (
                    "기다리는 물음이 없습니다"
                  )}
                </p>
              </div>
              <Link
                href="/admin"
                className="btn-obang inline-flex items-center px-6 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
              >
                들어가기
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
    </>
  );
}
