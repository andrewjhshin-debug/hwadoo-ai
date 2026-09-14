// ─────────────────────────────────────────────────────────────
// 외우기(誦) — 경전을 손으로 쳐서 몸에 넣는 자리.
//
// 왜 타이핑인가 —
// 읽기만 하면 눈으로 지나간다. 한 자 한 자 쳐야 입에 붙고, 입에 붙어야
// 외워진다. 옛사람은 사경(寫經)으로 했고, 우리는 자판으로 한다.
//
// 두 단계로 짠다 —
//  · 보고 치기(寫)   — 원문이 보인다. 익히는 자리.
//  · 외워 치기(誦)   — 원문이 가려진다. 이게 진짜 클리어다.
// 외워 치기에서 [보기]를 한 번이라도 쓰면 그 판은 '도움받음'이 되고,
// 연꽃은 주지 않는다. 공덕은 준다 — 도움을 받아도 끝까지 간 것은 공덕이다.
//
// 구(句) 단위로 친다. 한글은 조합 중인 글자가 있어서 한 자씩 견주면
// 자모가 덜 합쳐진 상태를 틀렸다고 잡아 버린다. 구를 다 치고 넘기면
// 그 시점엔 조합이 끝나 있으므로 깔끔하다.
// ─────────────────────────────────────────────────────────────

export const SUTRA_KEY = "hwadu.sutra.v1";
export const SUTRA_EVENT = "hwadu-sutra-updated";

export type SutraId = "samgwi" | "sahong" | "banya";

export type Sutra = {
  id: SutraId;
  name: string;
  hanja: string;
  say: string; // 이 경전이 무엇인지 한 줄
  lines: string[]; // 구(句)
  merit: number; // 외워 치기를 마치면 쌓이는 공덕(도움받아도 준다)
};

export const SUTRAS: Sutra[] = [
  {
    id: "samgwi",
    name: "삼귀의",
    hanja: "三歸依",
    say: "법회를 여는 세 마디. 여기서 시작합니다.",
    lines: [
      "거룩한 부처님께 귀의합니다",
      "거룩한 가르침에 귀의합니다",
      "거룩한 스님들께 귀의합니다",
    ],
    merit: 21,
  },
  {
    id: "sahong",
    name: "사홍서원",
    hanja: "四弘誓願",
    say: "이룰 수 없어 보이는 네 가지를 그래도 하겠다는 맹세.",
    lines: [
      "중생을 다 건지오리다",
      "번뇌를 다 끊으오리다",
      "법문을 다 배우오리다",
      "불도를 다 이루오리다",
    ],
    merit: 42,
  },
  {
    id: "banya",
    name: "반야심경",
    hanja: "般若心經",
    say: "이백일흔 자에 반야의 전부를 담았습니다. 끝판입니다.",
    lines: [
      "마하반야바라밀다심경",
      "관자재보살 행심반야바라밀다시",
      "조견오온개공 도일체고액",
      "사리자 색불이공 공불이색",
      "색즉시공 공즉시색",
      "수상행식 역부여시",
      "사리자 시제법공상",
      "불생불멸 불구부정 부증불감",
      "시고 공중무색 무수상행식",
      "무안이비설신의 무색성향미촉법",
      "무안계 내지 무의식계",
      "무무명 역무무명진 내지 무노사 역무노사진",
      "무고집멸도 무지역무득 이무소득고",
      "보리살타 의반야바라밀다고",
      "심무가애 무가애고 무유공포",
      "원리전도몽상 구경열반",
      "삼세제불 의반야바라밀다고",
      "득아뇩다라삼먁삼보리",
      "고지 반야바라밀다 시대신주 시대명주",
      "시무상주 시무등등주",
      "능제일체고 진실불허",
      "고설 반야바라밀다주 즉설주왈",
      "아제 아제 바라아제 바라승아제 모지 사바하",
      "아제 아제 바라아제 바라승아제 모지 사바하",
      "아제 아제 바라아제 바라승아제 모지 사바하",
    ],
    merit: 126,
  },
];

export const SUTRA_BY_ID: Record<SutraId, Sutra> = Object.fromEntries(
  SUTRAS.map((s) => [s.id, s])
) as Record<SutraId, Sutra>;

/** 글자 수 — 띄어쓰기를 뺀 몸통 */
export function letterCount(s: Sutra): number {
  return s.lines.join("").replace(/\s/g, "").length;
}

// ── 장부 ────────────────────────────────────────────────────

export type SutraRecord = {
  /** 보고 치기를 마친 적이 있는가 */
  read?: boolean;
  /** 외워 치기를 마친 적이 있는가 — 도움을 받았어도 마친 것은 마친 것 */
  memo?: boolean;
  /** 도움 없이 외워 친 적이 있는가 — 연꽃은 이때만 */
  clean?: boolean;
  /** 가장 빨리 마친 시간(초) */
  best?: number;
  /** 연꽃을 이미 받았는가 (서버가 진짜 장부지만, 화면이 두 번 청하지 않게) */
  lotus?: boolean;
};

export type SutraBook = Partial<Record<SutraId, SutraRecord>>;

export function loadSutra(): SutraBook {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SUTRA_KEY);
    const p = raw ? (JSON.parse(raw) as unknown) : null;
    if (!p || typeof p !== "object") return {};
    const valid = new Set(SUTRAS.map((s) => s.id));
    const out: SutraBook = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (valid.has(k as SutraId) && v && typeof v === "object") {
        out[k as SutraId] = v as SutraRecord;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function save(b: SutraBook) {
  try {
    window.localStorage.setItem(SUTRA_KEY, JSON.stringify(b));
    window.dispatchEvent(new CustomEvent(SUTRA_EVENT));
  } catch {
    // 못 적어도 수행은 이어진다
  }
}

/** 한 판을 마쳤다. 처음 마친 것인지 돌려준다 — 화면이 축하를 띄울 수 있게 */
export function markSutra(
  id: SutraId,
  mode: "read" | "memo",
  opts: { clean: boolean; seconds: number }
): { firstRead: boolean; firstMemo: boolean; firstClean: boolean; best: boolean } {
  const b = loadSutra();
  const r = b[id] ?? {};
  const firstRead = mode === "read" && !r.read;
  const firstMemo = mode === "memo" && !r.memo;
  const firstClean = mode === "memo" && opts.clean && !r.clean;
  const best = r.best === undefined || opts.seconds < r.best;

  if (mode === "read") r.read = true;
  if (mode === "memo") {
    r.memo = true;
    if (opts.clean) r.clean = true;
  }
  if (best) r.best = opts.seconds;
  b[id] = r;
  save(b);
  return { firstRead, firstMemo, firstClean, best };
}

/** 연꽃을 받았다고 적어 둔다 — 서버가 진짜 장부다 */
export function markLotusTaken(id: SutraId) {
  const b = loadSutra();
  b[id] = { ...(b[id] ?? {}), lotus: true };
  save(b);
}

/** 몇 편을 외웠나 */
export function memorizedCount(b: SutraBook = loadSutra()): number {
  return SUTRAS.filter((s) => b[s.id]?.memo).length;
}

// ── 견주기 ──────────────────────────────────────────────────

/** 띄어쓰기와 앞뒤 공백은 눈감아 준다 — 외운 것은 글자이지 칸이 아니다 */
export function same(a: string, b: string): boolean {
  return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

/**
 * 지금까지 친 것이 이 구의 앞머리로 맞는가 —
 * 치는 동안 글자를 금빛으로 물들이는 데 쓴다.
 * 조합 중인 마지막 한 글자는 눈감아 준다(ㅁ→마→막).
 */
export function matchedLength(typed: string, target: string): number {
  const t = typed.replace(/\s+/g, "");
  const g = target.replace(/\s+/g, "");
  let n = 0;
  while (n < t.length && n < g.length && t[n] === g[n]) n++;
  return n;
}
