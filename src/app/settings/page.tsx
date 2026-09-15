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
import Info from "@/components/Info";
import LotusCount from "@/components/LotusCount";
import MyTemplePicker from "@/components/MyTemplePicker";
import MeritExchange from "@/components/MeritExchange";
import { CHARMS, charmSvg, grantCharm, loadCharms } from "@/lib/charm";
import { nextRealm, realmOf, REALMS } from "@/lib/realm";
import {
  DAILY_TOTAL_CAP,
  giveBonus,
  giveLeftToday,
  giveMerit,
  GIVE_PER_DAY,
  GIVE_UNIT,
  inRound,
  lamps,
  loadMerit,
  nextRank,
  rankOf,
  ROUND,
  SOURCE_LABEL,
  todayRoom,
  type Lamp,
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
import { initPresence, watchOnlineCount } from "@/lib/presence";
import { submitFeedback } from "@/lib/feedback";
import { dmVisible, getLotus } from "@/lib/dm";
import { loadEmailOptOut, setEmailOptOut } from "@/lib/mailPrefs";
import {
  canInstall,
  isIOS,
  isStandalone,
  onInstallChange,
  promptInstall,
} from "@/lib/install";
import { loadVisits, visitDayKey } from "@/components/VisitLedger";
import { loadMeditations } from "@/lib/meditation";
import {
  Share,
  Person,
  Teacup,
  Book,
  Dharmachakra,
  Elephant,
  SeonMaster,
  Banga,
  Bojagi,
  Breath,
  Iljumun,
  Jukbi,
  Letter,
  LotusMark,
  LotusPond,
  Mandala,
  Moktak,
} from "@/components/icons";

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

const SERVICES: ServiceItem[] = [
  { href: "/", label: "뜰", Icon: LotusMark },
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/masters", label: "선지식", Icon: SeonMaster },
  { href: "/room", label: "사유의 방", Icon: Banga },
  { href: "/my-hwadu", label: "화두 던지기", Icon: Jukbi },
  { href: "/mandala", label: "만다라", Icon: Mandala },
  { href: "/pilgrimage", label: "손잡고 절로", Icon: Iljumun },
  { href: "/gathering", label: "인연", Icon: Person },
  { href: "/empty", label: "비움", Icon: Moktak },
  { href: "/community", label: "연지원", Icon: LotusPond },
  { href: "/archive", label: "지난 화두", Icon: Book },
  { href: "/lotus", label: "연꽃 공양", Icon: LotusMark },
  { href: "/tea", label: "차 한 잔", Icon: Teacup },
  { href: "/goods", label: "굿즈", Icon: Bojagi },
  { href: "/sambae", label: "삼배", Icon: Banga },
  { href: "/breath", label: "호흡 명상", Icon: Breath },
  { href: "/sutra", label: "외우기", Icon: Book },
  { href: "/draw", label: "오늘의 운세", Icon: LotusMark },
  { href: "/rank", label: "오늘의 정진", Icon: Dharmachakra },
  { href: "/tamjinchi", label: "불심 투자", Icon: Elephant },
];

// 이 달의 흐름 — 여러 갈래를 한 그래프에 선으로 겹쳐 그린다.
// 범례를 누르면 그 선만 또렷해지고 나머지는 흐려진다 — 다시 누르면 원래대로.
const LINE_DASH = ["", "3,2.5", "1,2.5"]; // 실선 · 파선 · 점선 — 겹쳐도 갈래가 갈린다

function MonthLineChart({
  series,
}: {
  series: { label: string; values: number[] }[];
}) {
  const [pick, setPick] = useState<number | null>(null);
  const W = 300;
  const H = 56;
  const PAD = 4;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const span = Math.max(1, (series[0]?.values.length ?? 1) - 1);
  const points = (values: number[]) =>
    values
      .map(
        (v, i) => `${(i / span) * W},${H - PAD - (v / max) * (H - PAD * 2)}`
      )
      .join(" ");
  const total = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const opacityOf = (idx: number) =>
    pick === null ? 1 - idx * 0.25 : pick === idx ? 1 : 0.15;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {series.map((s, idx) => (
          <button
            key={s.label}
            onClick={() => setPick((p) => (p === idx ? null : idx))}
            className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] transition-opacity"
            style={{ opacity: pick === null || pick === idx ? 1 : 0.4 }}
          >
            <span
              className="h-[2px] w-4 shrink-0 rounded-full bg-gold"
              style={{ opacity: 1 - idx * 0.25 }}
            />
            <span className="text-hanji-dim">{s.label}</span>
            <span className="text-hanji-faint">{total(s.values)}</span>
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-2 h-14 w-full"
        role="img"
        aria-label={`${series.map((s) => s.label).join("·")} — 이번 달 날짜별 그래프`}
      >
        {/* 뒤에서부터 그려 앞쪽(첫 갈래)이 맨 위에 오게 */}
        {[...series].reverse().map((s, revIdx) => {
          const idx = series.length - 1 - revIdx;
          return (
            <polyline
              key={s.label}
              points={points(s.values)}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={pick === idx ? 2.25 : 1.5}
              strokeDasharray={LINE_DASH[idx % LINE_DASH.length]}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacityOf(idx)}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // 음양 — 인연 게시판에 표시될 나의 문양
  const [gender, setGender] = useState<"m" | "f" | undefined>(undefined);
  // 이메일 알림 — 켜짐이 기본, users/{uid}.emailOptOut 로 끈다
  const [mailOn, setMailOn] = useState(true);
  const [mailBusy, setMailBusy] = useState(false);
  // 예불 종 — 이 브라우저가 고른 시각들 (푸시 토큰 문서에도 함께 새긴다)
  const [bells, setBells] = useState<string[]>([]);
  // 공덕 — 도량에서 한 일이 모두 여기로 쌓인다
  const [merit, setMerit] = useState({ total: 0, by: {} as Partial<Record<MeritSource, number>>, given: 0 });
  const [gaveMsg, setGaveMsg] = useState("");
  const [lampList, setLampList] = useState<Lamp[]>([]);
  const [giveLeft, setGiveLeft] = useState(GIVE_PER_DAY);
  const [giveTo, setGiveTo] = useState(""); // 이름을 적어 돌릴 때
  const [returnedCount, setReturnedCount] = useState(0);
  const [span, setSpan] = useState<"month" | "year">("month");
  const [room, setRoom] = useState({ earned: 0, cap: DAILY_TOTAL_CAP, left: DAILY_TOTAL_CAP });
  const [charms, setCharms] = useState<Record<string, number | undefined>>({});
  const [receivedCount, setReceivedCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [daysWith, setDaysWith] = useState(0);
  const [teaOpen, setTeaOpen] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [report, setReport] = useState<MonthReport | null>(null);
  const [chart, setChart] = useState<MonthChart | null>(null);
  const [yearReport, setYearReport] = useState<YearReport | null>(null);
  const [yearShareMsg, setYearShareMsg] = useState<string | null>(null);
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

  // 예불 종 — 서랍에서 꺼낸다
  useEffect(() => {
    setBells(loadBellsLocal());
    setMerit(loadMerit());
    setCharms(loadCharms());
    setLampList(lamps());
    setGiveLeft(giveLeftToday());
    setRoom(todayRoom());
    setReturnedCount(loadStore().history.length);
  }, []);

  // 지금 서 있는 도와 한 칸 위 — 공덕과 회향한 화두 수를 함께 본다.
  // 서랍(localStorage)은 그릴 때 읽으면 안 된다 — 서버가 그린 첫 화면과
  // 어긋나 하이드레이션이 깨진다. 아래 effect 에서 읽어 담아 둔 값을 쓴다.
  const myRealm = realmOf(merit.total, returnedCount);
  const upRealm = nextRealm(merit.total, returnedCount);

  // 회향 — 한 번에 백팔, 하루 세 번. 총합은 줄지 않는다(대승의 셈).
  // 돌린 만큼 앞으로 쌓는 공덕이 빨라진다 — 그래야 누를 이유가 생긴다.
  const give = (to: string) => {
    const l = giveMerit(to, GIVE_UNIT);
    if (!l) {
      setGaveMsg("오늘 몫을 다 돌렸어요 — 내일 또 밝힐 수 있어요.");
      window.setTimeout(() => setGaveMsg(""), 5000);
      return;
    }
    grantCharm("hoehyang"); // 처음 돌린 사람에게 회향부
    setCharms(loadCharms());
    setMerit(l);
    setLampList(lamps());
    setGiveLeft(giveLeftToday());
    setGaveMsg(`${to}에게 공덕 ${GIVE_UNIT}을 돌렸습니다 — 등 하나가 켜졌어요.`);
    window.setTimeout(() => setGaveMsg(""), 5000);
  };

  // 종 하나를 켜고 끈다 — 서랍과 토큰 문서에 같이 적는다
  const toggleBell = (id: string) => {
    const next = bells.includes(id)
      ? bells.filter((b) => b !== id)
      : [...bells, id];
    setBells(next);
    saveBellsLocal(next);
    void updateBells(next); // 구독 전이면 조용히 실패 — 구독 때 함께 새겨진다
  };

  // 이메일 알림 상태 — 로그인 계정의 emailOptOut 을 읽는다
  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadEmailOptOut()
      .then((off) => {
        if (alive) setMailOn(!off);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const handleMailToggle = async () => {
    if (mailBusy) return;
    setMailBusy(true);
    const next = !mailOn;
    try {
      await setEmailOptOut(!next);
      setMailOn(next);
    } catch {
      // 못 적으면 그대로 둔다
    } finally {
      setMailBusy(false);
    }
  };

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
      setGender(s.gender);
      const past = s.history.length;
      setJournalCount(past);
      // store.received 가 참값이지만, 이 값이 없던 시절의 기록도 있어
      // 눈에 보이는 수보다 작아지지 않게 받쳐 준다
      setReceivedCount(Math.max(s.received, past + (s.current ? 1 : 0)));

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

      // 함께한 날 — 실제 접속일(발자국 장부) ∪ 화두를 품고 있던 날.
      // 옛날은 방문 기록이 없으니 품은 날수로 보완한다
      const allDays = new Set<string>(visits);
      for (const sess of sessions) {
        addHeldDays(sess.receivedAt, sess.journalAt ?? now, allDays);
      }
      setDaysWith(allDays.size);

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
    const stopPresence = initPresence();
    const stopWatch = watchOnlineCount(setOnlineCount);
    return () => {
      stopPresence();
      stopWatch();
    };
  }, []);

  // 음양 고르기 — 저장소에 적으면 계정으로도 함께 올라간다
  const chooseGender = (g: "m" | "f") => {
    setGender(g);
    saveStore({ ...loadStore(), gender: g });
  };

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

  // 올해의 마음 공유 — 되면 공유 시트, 안 되면 글을 그대로 클립보드에
  const shareYear = async (y: YearReport) => {
    const text = `화두 ${y.year}년 — 받은 화두 ${y.returned} · 호흡 명상 ${y.meditations} · 함께한 날 ${y.days}일\n${SITE_URL}`;
    setYearShareMsg(null);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      throw new Error("no-share");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setYearShareMsg("글로 복사했습니다.");
      } catch {
        setYearShareMsg(text);
      }
    }
  };

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

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      {/* 머리 오른쪽에 내 연꽃 — 아래쪽에도 한 줄 있지만 거기까지 내려가야
          보였다. 쓰는 자리마다 보여야 하는 숫자는 맨 위에 둔다. */}
      <div className="relative flex items-center justify-center">
        {/* 공유 — 리포트 안에 묻혀 있던 것을 꺼냈다. 남에게 보일 만한 것은
            맨 위에 있어야 누른다. 올해치가 아직 없으면 그리지 않는다. */}
        {yearReport && (
          <button
            onClick={() => void shareYear(yearReport)}
            title={`${yearReport.year}년 내 걸음 공유`}
            aria-label="올해의 걸음 공유"
            className="absolute left-0 grid h-7 w-7 place-items-center rounded-full border border-ink-3 text-hanji-faint transition-colors hover:border-gold/45 hover:text-gold-soft"
          >
            <Share className="h-3.5 w-3.5" />
          </button>
        )}
        <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
          道場 · 내 도량
        </h1>
        <LotusCount className="absolute right-0" />
      </div>
      {yearShareMsg && (
        <p className="mt-2 break-all text-center text-[11px] leading-5 text-hanji-faint">
          {yearShareMsg}
        </p>
      )}

      {/* ── 오늘 하루 — 나무 · 이어 온 날 · 오늘의 세 가지.
             매일 들어올 이유는 맨 위에 있어야 한다 ── */}
      <div className="mt-7">
        <DailyPractice />
      </div>

      {/* ── 육도(六道) — 처음 온 사람은 지옥도에서 시작해 공덕으로 오른다.
           예전엔 회향 수로 세 자리만 보였는데, 셋만 보이면 사다리가 아니다.
           여섯을 다 깔아 두어야 지금 어디쯤인지, 다음이 어딘지 한눈에 든다.
           프로필 바로 아래 — 계급은 위에 있어야 계급이다. ── */}
      <section className={`rise ${sectionGap}`}>
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            六道 — 지금 내 자리
          </p>
          <Link
            href="/rank"
            className="text-[11px] text-gold-soft transition-colors hover:text-gold"
          >
            랭킹 →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5 border-t border-ink-3 pt-5">
          {REALMS.map((r) => {
            // 뒷방 주인은 모든 자리가 밝다 — 도량 주인의 자리
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
            ? "뒷방 주인의 자리 — 여섯 도가 모두 열려 있습니다."
            : upRealm
              ? `${upRealm.to.name}까지 공덕 ${upRealm.left.toLocaleString("ko-KR")}` +
                (upRealm.needMore > 0 ? ` · 화두 ${upRealm.needMore}개` : "")
              : "가장 높은 자리"}
          <Info title="六道 · 자리" className="ml-1.5">
            자리는 <b className="text-hanji">공덕</b>과 <b className="text-hanji">회향한 화두 수</b>,
            둘 다 넘겨야 오릅니다. 목탁만 두드려서는 오르지 않습니다.
            <br />
            이틀 넘게 안 오면 공덕이 깎여 자리도 내려갑니다.
          </Info>
        </p>
      </section>

      {/* ── 공덕(功德) — 쌓고, 남에게 돌린다 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          공덕 — 쌓은 것, 나눈 것
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-[30px] leading-none text-gold">
                {merit.total.toLocaleString("ko-KR")}
              </span>
              <span className="text-[12px] text-hanji-dim">
                이번 바퀴 {inRound(merit.total)}/{ROUND}
                {merit.total >= ROUND &&
                  ` · 백팔 ${Math.floor(merit.total / ROUND)}바퀴`}
              </span>
            </p>
            <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300"
                style={{ width: `${(inRound(merit.total) / ROUND) * 100}%` }}
              />
            </div>

            {/* 하루 천장 — 목탁만 천 번 두드려 연꽃을 따는 판이 되지 않게 */}
            <p className="mt-2.5 text-[11px] leading-5 text-hanji-faint">
              오늘 쌓은 공덕{" "}
              <span className={room.left > 0 ? "text-hanji-dim" : "text-gold"}>
                {room.earned.toLocaleString("ko-KR")}
              </span>
              {" / "}
              {DAILY_TOTAL_CAP.toLocaleString("ko-KR")}
              {room.left <= 0 && " — 오늘 몫이 찼어요. 내일 또 이어 가세요"}
            </p>
          </div>

          {/* 무엇으로 쌓았나 */}
          {Object.keys(merit.by).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(Object.keys(merit.by) as MeritSource[]).map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-ink-3 px-2.5 py-1 text-[11px] text-hanji-dim"
                >
                  {SOURCE_LABEL[k]} {merit.by[k]?.toLocaleString("ko-KR")}
                </span>
              ))}
            </div>
          )}

          {/* 공덕을 연꽃으로 — 따로 있던 판을 여기로 들였다.
              같은 숫자를 두 곳에서 두 번 말하고 있었다. */}
          <div className="mt-5">
            <MeritExchange />
          </div>

          {/* ── 회향(廻向) ──
              내 것은 줄지 않는다(대승의 셈). 대신 하루 세 번뿐이고,
              돌린 만큼 앞으로 쌓는 공덕이 빨라진다 — 나눌수록 커진다. */}
          <div className="mt-5 rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
                廻向 · 회향
              </p>
              <p className="text-[11px] text-hanji-faint">
                오늘 <span className="text-gold">{giveLeft}</span>/{GIVE_PER_DAY}번
              </p>
            </div>
            {/* 「내 공덕은 줄지 않는데 돌린 만큼 빨라진다」 — 읽고 나서
                「그래서 누가 받는 건데?」가 남았다. 셋을 나눠 적는다:
                무엇을 하는 것인가 · 누가 받는가 · 나에게 무엇이 남는가. */}
            <p className="mt-2.5 break-keep text-[12.5px] leading-6 text-hanji-dim">
              내가 쌓은 공덕을 <span className="text-hanji">누군가를 위해 빌어 주는 일</span>
              입니다. 한 번에 {GIVE_UNIT}.
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[11.5px] leading-5 text-hanji-faint">
              <li>
                · 받는 사람 — <span className="text-hanji-dim">내가 적은 그 사람</span>.
                앱 안의 다른 수행자에게 가는 것이 아닙니다. 옛 절의 축원처럼,
                마음에 둔 이의 이름을 걸어 두는 자리입니다.
              </li>
              <li>
                · 내 공덕 — <span className="text-hanji-dim">한 톨도 줄지 않습니다.</span>{" "}
                촛불로 촛불을 붙여도 내 불은 그대로인 것과 같습니다.
              </li>
              <li>
                · 나에게 남는 것 —{" "}
                <span className="text-hanji-dim">
                  앞으로 쌓는 공덕이 빨라집니다(적립 배수 {GIVE_UNIT}마다 +2%, 최대 +20%).
                </span>{" "}
                지금 <span className="text-gold">×{giveBonus().toFixed(2)}</span>
              </li>
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              {["모든 중생", "아픈 이", "먼저 가신 분", "오늘 만날 사람"].map((t) => (
                <button
                  key={t}
                  onClick={() => give(t)}
                  disabled={giveLeft <= 0}
                  className="rounded-full border border-gold/45 px-3.5 py-1.5 text-[12px] text-gold transition-colors hover:bg-gold/10 disabled:border-ink-3 disabled:text-hanji-faint"
                >
                  {t}에게
                </button>
              ))}
            </div>

            {/* 이름을 적어 돌린다 — 마음에 둔 사람이 있으면 그 이름으로 */}
            <div className="mt-3 flex items-center gap-2">
              <input
                value={giveTo}
                onChange={(e) => setGiveTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && giveTo.trim() && giveLeft > 0) {
                    give(giveTo.trim());
                    setGiveTo("");
                  }
                }}
                maxLength={24}
                placeholder="이름을 적어 돌리기"
                aria-label="회향할 이름"
                className="min-w-0 flex-1 rounded-lg border border-ink-3 bg-ink/40 px-3 py-2 text-[13px] text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/50"
              />
              <button
                onClick={() => {
                  if (!giveTo.trim() || giveLeft <= 0) return;
                  give(giveTo.trim());
                  setGiveTo("");
                }}
                disabled={!giveTo.trim() || giveLeft <= 0}
                className="shrink-0 rounded-full border border-gold/45 px-4 py-2 text-[12px] text-gold transition-colors hover:bg-gold/15 disabled:border-ink-3 disabled:text-hanji-faint"
              >
                돌리다
              </button>
            </div>

            {gaveMsg && (
              <p className="mt-3 break-keep text-[12px] leading-6 text-gold-soft">
                {gaveMsg}
              </p>
            )}

            {merit.given > 0 && (
              <p className="mt-3 border-t border-ink-3 pt-3 text-[11.5px] leading-5 text-hanji-faint">
                지금까지 돌린 공덕{" "}
                <span className="text-hanji">{merit.given.toLocaleString("ko-KR")}</span>
                {" · "}
                적립 배수{" "}
                <span className="text-gold">
                  ×{giveBonus(merit as never).toFixed(2)}
                </span>
              </p>
            )}

            {/* 밝혀 둔 등 — 누구에게 돌렸는지 남는다 */}
            {lampList.length > 0 && (
              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim [&::-webkit-details-marker]:hidden">
                  <span>밝혀 둔 등</span>
                  <span className="font-serif text-[13px] text-gold-soft">
                    {lampList.length}
                  </span>
                </summary>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {lampList.slice(0, 12).map((l) => (
                    <li
                      key={l.at}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <span className="min-w-0 truncate text-hanji-dim">
                        <span className="mr-1.5 text-gold-soft">燈</span>
                        {l.to}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-hanji-faint">
                        {new Date(l.at).toLocaleDateString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* ── 나의 걸음 — 화두 수 · 함께한 날. 받은 화두를 누르면 서고로 ── */}
      <section className={`rise ${sectionGap}`}>
        <div className="flex gap-4">
          <Link
            href="/archive"
            className="flex-1 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-6 text-center transition-colors hover:border-gold/40"
          >
            <p className="font-serif text-[40px] font-light leading-none text-gold">
              {receivedCount}
            </p>
            <p className="mt-2.5 text-[11px] tracking-[0.2em] text-hanji-faint">
              받은 화두
            </p>
          </Link>
          <div className="flex-1 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-6 text-center">
            <p className="font-serif text-[40px] font-light leading-none text-gold">
              {daysWith}
              <span className="ml-1 text-[18px] text-hanji-dim">일</span>
            </p>
            <p className="mt-2.5 text-[11px] tracking-[0.2em] text-hanji-faint">
              화두와 함께
            </p>
          </div>
        </div>
        {/* 나눔의 흔적 + 실시간 접속자 + 연꽃 */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 px-1">
          {user && myLotus !== null && (
            <Link
              href="/lotus"
              className="text-[11px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-gold-soft"
            >
              내 연꽃 <span className="text-gold">{myLotus}</span>송이
            </Link>
          )}
          {onlineCount !== null && onlineCount > 0 && (
            <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
              지금 도량에{" "}
              <span className="text-hanji-dim">{onlineCount}</span>
              명이 함께 있습니다
            </p>
          )}
          {user && myAnswerCount !== null && myAnswerCount > 0 && (
            <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
              회향이{" "}
              <span className="text-hanji-dim">{myAnswerCount}</span>
              명에게 전해졌습니다
            </p>
          )}
          {user && thrownStats !== null && (() => {
            const total = Array.from(thrownStats.values()).reduce(
              (s, st) => s + st.seen, 0
            );
            return total > 0 ? (
              <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
                내 화두를{" "}
                <span className="text-hanji-dim">{total}</span>
                명이 받았습니다
              </p>
            ) : null;
          })()}
        </div>
      </section>

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
        <p className="mt-4 break-keep text-[11.5px] leading-6 text-hanji-faint">
          부적은 팔지 않습니다.
        </p>
      </section>

      {/* ── 내 절 ── */}
      <MyTemplePicker className={`rise rise-d1 ${sectionGap}`} />

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

              {/* 흐름은 이 달에만 — 올해치 일별 그래프는 너무 잘게 부서진다 */}
              {span === "month" &&
                chart &&
                (() => {
                  const lines = [
                    { label: "받은 화두", values: chart.returned },
                    { label: "호흡 명상", values: chart.meditations },
                  ];
                  if (!lines.some((l) => l.values.some((v) => v > 0))) return null;
                  return (
                    <div className="mt-5">
                      <MonthLineChart series={lines} />
                    </div>
                  );
                })()}

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
        {/* 이메일 알림 — 화두 익음·쪽지 청 메일. 로그인해야 보인다 */}
        {user && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
              알림 — 이메일
            </p>
            <button
              role="switch"
              aria-checked={mailOn}
              aria-label="이메일 알림"
              onClick={handleMailToggle}
              disabled={mailBusy}
              className={`relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
                mailOn
                  ? "border-gold bg-gold"
                  : "border-hanji-faint bg-transparent hover:border-hanji-dim"
              }`}
            >
              <span
                aria-hidden
                className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
                  mailOn ? "translate-x-5 bg-ink" : "bg-hanji-faint"
                }`}
              />
            </button>
          </div>
        )}
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

      <Fold title="그 밖에" note="음양 · 차 한 잔 · 죽비 · 내가 던진 화두 · 로그인 · 도량 안내">
      {/* ── 음양 — 인연 게시판에 표시될 나의 문양 ── */}
      <section className={`rise rise-d1 ${sectionGap}`}>
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          음양 — 나의 문양
        </p>
        <div className="mt-4 flex gap-3 border-t border-ink-3 pt-5">
          <button
            onClick={() => chooseGender("m")}
            aria-pressed={gender === "m"}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-[10px] border px-4 py-3 text-[14px] tracking-[0.15em] transition-colors ${
              gender === "m"
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-[13px] text-gold">
              陽
            </span>
            남
          </button>
          <button
            onClick={() => chooseGender("f")}
            aria-pressed={gender === "f"}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-[10px] border px-4 py-3 text-[14px] tracking-[0.15em] transition-colors ${
              gender === "f"
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-hanji-faint/60 bg-ink-2 font-serif text-[13px] text-hanji-dim">
              陰
            </span>
            여
          </button>
        </div>
        <p className="mt-2.5 break-keep text-[11px] leading-5 text-hanji-faint">
          인연 게시판의 글·댓글에 陽/陰 문양으로만 표시됩니다.
        </p>
      </section>

      {/* ── 차 한 잔 — 바로 송금 ── */}
      <section className={`rise rise-d2 ${sectionGap}`}>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-hanji-faint">
          <Teacup className="h-[15px] w-[15px] text-gold-soft" />
          차 한 잔
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <p className="text-[13px] leading-7 text-hanji-dim">
            화두의 물음과 수행은 값을 받지 않습니다.
            <br />
            마음에 머물렀다면, 차 한 잔 값으로 등불을 보태 주실 수 있습니다.
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
  );
}
