// 인연 — 도반(道伴) 찾기.
//
// 형: 「인연으로 데이팅앱 갈 거야. 가입할 때 사진 무조건 넣어야 하고,
//      인연에서 매칭되면 서로 쪽지합 열리게 하고, 가격은 이런 거까지 다」
//
// 설계 전문은 docs/인연-데이팅-설계.md 에 있다. 여기는 그 첫 겹 —
// **사람(프로필)과 사진**이다. 사람이 없으면 매칭도 값도 아무 뜻이 없다.
//
// 왜 「소개팅」이 아니라 「도반」인가 —
//   · 화두 쓰는 사람은 이미 절에 간다. 「같이 갈 사람」은 다음 걸음이지
//     낯선 앱이 아니다
//   · PG 심사에서 데이팅은 고위험 업종이다. 결이 다르면 길이 다르다
//   · 일반 데이팅앱엔 불자 필터가 없다. 여기는 전부가 불자다 — 그게 해자다
//
// 사진은 **바로 안 걸린다.** 올리면 `pending` 이고 뒷방이 통과시켜야 남에게
// 보인다. 문턱이 곧 서비스다 — 이게 없으면 첫 주에 판이 무너진다.
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { getDownloadURL, ref as sref, uploadBytes } from "firebase/storage";

/** 사진 한 장 */
export type 사진 = {
  /** 저장소 경로 — 원본은 여기 있고, 남에게는 url 로만 나간다 */
  path: string;
  url: string;
  /** 올리자마자 남에게 보이지 않는다. 뒷방이 본 뒤에 ok */
  state: "pending" | "ok" | "no";
  at: number;
};

/**
 * 고르는 것들 — 전부 **버튼**이다.
 *
 * 형: 「대부분 버튼 식으로 클릭하면 올라가게 하되 주관식도 가능하게」
 *     「심플리시티가 핵심이다. 구구절절 텍스트 많이 넣지 마라」
 *
 * 그래서 이름표는 두 글자·세 글자로만 둔다. 설명은 하나도 달지 않는다 —
 * 「골프」면 골프지, 「골프를 즐깁니다」가 아니다.
 * 목록에 없는 것은 각 줄 끝의 ＋ 로 직접 적는다(같은 칸에 들어간다).
 */
export const 성격들 = [
  "긍정", "상냥", "부드러움", "차분", "유머", "성실", "다정", "솔직",
  "배려", "낙천", "진중", "활발", "섬세", "느긋", "꼼꼼", "털털",
  "경청", "리드", "무던", "열정",
] as const;

export const 취향들 = [
  "골프", "와인", "드라이브", "여행", "맛집", "카페", "등산", "러닝",
  "헬스", "요가", "영화", "공연", "전시", "독서", "음악", "사진",
  "요리", "반려동물", "게임", "캠핑", "바다", "차(茶)",
] as const;

export const 관심들 = [
  "골프", "맛집", "미래", "결혼", "종교", "자기계발", "재테크", "건강",
  "여행", "커리어", "봉사", "명상", "공부", "창업", "집", "가족",
] as const;

export const 데이트들 = [
  "절 나들이", "산책", "맛집", "카페", "드라이브", "전시", "영화",
  "등산", "바다", "공연", "요리", "차 한잔", "템플스테이", "새벽예불",
] as const;

export const MBTI들 = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export const 흡연들 = ["안 함", "가끔", "자주"] as const;
export const 음주들 = ["안 함", "가끔", "즐김"] as const;

export type 인연프로필 = {
  uid: string;
  /** 법명 — 이미 있는 것을 그대로 쓴다. 본명은 받지 않는다 */
  name: string;
  sex: "m" | "f";
  /** 태어난 해 — 만 나이로 보여 준다. 만 19세 미만은 이 판에 못 들어온다 */
  born: number;
  /** 사는 곳 — 시/도 */
  area: string;
  /** 하는 일 — 한 낱말로 */
  job?: string;
  /** 키 (cm) */
  tall?: number;
  mbti?: string;
  smoke?: string;
  drink?: string;
  /** 고른 것 + 직접 쓴 것이 같은 칸에 들어간다 */
  vibe?: string[];   // 성격
  like?: string[];   // 취향
  care?: string[];   // 요즘 관심
  date?: string[];   // 하고 싶은 데이트
  /** 다니는 절 — 가장 강한 연결고리다 */
  temple?: string;
  /** 가 보고 싶은 절 */
  wantTemple?: string;
  line?: string;
  about?: string;
  photos: 사진[];
  /** 심사중 → 활동. 쉼은 본인이 끈 것, 정지는 뒷방이 끈 것 */
  state: "심사중" | "활동" | "쉼" | "정지";
  verified?: boolean;
  /** 공덕 요약 — 하루 한 번 구워 둔다. 계급이 곧 꾸준함의 증거다 */
  merit?: { rank: string; total: number; given: number };
  seen?: number;
  at?: number;
};

export const YEON = "yeon-profiles";

/** 만 나이 — 생일을 안 받으므로 해로만 센다(보수적으로 한 살 낮춰 본다) */
export function 나이(born: number, 올해 = new Date().getFullYear()): number {
  return Math.max(0, 올해 - born);
}

/** 이 판에 들어올 수 있는가 — 만 19세 이상 */
export function 들어올수있나(born: number): boolean {
  return 나이(born) >= 19;
}

/** 프로필이 남에게 보일 채비가 됐는가 */
export function 채비됐나(p: 인연프로필 | null): boolean {
  if (!p) return false;
  if (!p.sex || !p.born || !p.area) return false;
  // 형: 「가입할 때 사진이랑 프로필 넣어야 가입되는 걸로」
  // 사진만으로는 카드가 얼굴 한 장이다. 한 마디가 있어야 사람이 읽힌다.
  if (!p.line?.trim()) return false;
  return p.photos.some((f) => f.state === "ok");
}

/** 아직 못 채운 것 — 화면이 그대로 물어보면 된다 */
export function 모자란것(p: 인연프로필 | null): string[] {
  const 빠진: string[] = [];
  if (!p || !p.photos.length) 빠진.push("사진");
  if (!p?.sex) 빠진.push("성별");
  if (!p?.born) 빠진.push("나이");
  if (!p?.area) 빠진.push("지역");
  // 형: 「사진이랑 프로필 넣어야 가입」 — 한 마디가 그 프로필이다
  if (!p?.line?.trim()) 빠진.push("한 마디");
  return 빠진;
}

export async function 내프로필(): Promise<인연프로필 | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const s = await getDoc(doc(db, YEON, u.uid));
  return s.exists() ? ({ uid: u.uid, ...s.data() } as 인연프로필) : null;
}

export async function 프로필저장(
  part: Partial<인연프로필>
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await setDoc(
    doc(db, YEON, u.uid),
    { ...part, uid: u.uid, at: serverTimestamp() },
    { merge: true }
  );
}

/** 사진을 올린다 — 저장소에 두고, 프로필에는 pending 으로 적는다 */
export async function 사진올리기(file: File): Promise<사진> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("사진은 jpg · png · webp 만 됩니다");
  if (file.size > 8 * 1024 * 1024) throw new Error("사진은 8MB 까지입니다");

  // 이름에 시각을 박아 겹치지 않게. 확장자는 형식에서 뽑는다
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `yeon/${u.uid}/${Date.now()}.${ext}`;
  await uploadBytes(sref(storage, path), file, { contentType: file.type });
  const url = await getDownloadURL(sref(storage, path));
  return { path, url, state: "pending", at: Date.now() };
}

/** 사진 한 장을 지운다(목록에서만 — 저장소 청소는 뒷방이 한다) */
export async function 사진빼기(path: string): Promise<void> {
  const p = await 내프로필();
  if (!p) return;
  await updateDoc(doc(db, YEON, p.uid), {
    photos: p.photos.filter((f) => f.path !== path),
  });
}

/** 지역 — 절이 있는 곳 위주로. 리스트가 길면 고르기가 일이 된다 */
export const 지역들 = [
  "서울",
  "경기",
  "인천",
  "강원",
  "대전·세종",
  "충북",
  "충남",
  "대구",
  "경북",
  "부산",
  "울산",
  "경남",
  "광주",
  "전북",
  "전남",
  "제주",
];
