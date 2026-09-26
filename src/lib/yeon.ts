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
  /**
   * 다니는 절 — 가장 강한 연결고리다.
   *
   * 그런데 **민감정보다.** 개인정보보호법 23조는 사상·신념과 함께 종교를
   * 따로 묶고, 「다른 개인정보의 처리에 대한 동의와 **별도로**」 받으라고
   * 한다. 「다니는 절」과 「가고 싶은 절」은 종교를 그대로 말한다.
   * 그래서 이 두 칸은 아래 `religionOk` 가 참일 때만 받고, 참일 때만
   * 남에게 보낸다.
   */
  temple?: string;
  /** 종교 정보(절)를 프로필에 쓰는 데 따로 동의했나 */
  religionOk?: boolean;
  /** 언제 동의했나 — 분쟁 때 이것이 근거다 */
  religionAt?: number;
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

/**
 * 휴대폰 본인확인을 **문턱으로 세울까** — 한 칸 스위치.
 *
 * 형이 PG(포트원 등) 계약을 맺으면 본인확인도 같이 열린다. 그때
 * 이 한 줄을 true 로 올리면 —
 *   · 프로필에 「휴대폰 본인확인」 줄이 서고
 *   · 확인 전에는 판에 못 서고(모자란것)
 *   · 서버도 뽑기에서 확인 안 된 사람을 빼낸다
 * 지금은 확인할 길이 없으니 꺼 둔다. **꺼 둔 채로 코드는 다 있다** —
 * 로그인 손잡이(firebase.ts)와 같은 수법이다.
 *
 * 왜 필요한가 — 사진과 1:1 쪽지와 오프라인 동행이 오가는 판이다.
 * 만 19세 확인을 태어난 해 고르기 하나에 기대고 있는데, 그건 확인이
 * 아니라 자기 신고다. 청소년보호정책(/youth)에도 「인연 기능을 이용하려면
 * 휴대전화 본인확인을 거쳐야 한다」고 이미 적어 두었다 — 적어 둔 것과
 * 도는 것이 다르면 그게 더 나쁘다.
 */
export const 본인확인_켬 = false;

/** 만 나이 — 생일을 안 받으므로 해로만 센다(보수적으로 한 살 낮춰 본다) */
export function 나이(born: number, 올해 = new Date().getFullYear()): number {
  return Math.max(0, 올해 - born);
}

/** 이 판에 들어올 수 있는가 — 만 19세 이상 */
export function 들어올수있나(born: number): boolean {
  return 나이(born) >= 19;
}

/**
 * 프로필이 남에게 보일 채비가 됐는가 — **아래 `모자란것` 으로 잰다.**
 *
 * 한동안 두 잣대가 따로 있었다. 이쪽은 「통과된 사진(ok)이 있는가」를
 * 보고 아래쪽은 「사진이 있는가」만 봤는데, 화면은 아래쪽만 불렀다.
 * 그래서 본인은 「인연 받기」를 눌러 활동이 되고 다 됐다고 믿는데,
 * 남에게는 안 보였다 — 잣대가 둘이면 반드시 한쪽은 거짓말을 한다.
 * (게다가 사진에 `ok` 를 찍는 코드가 애초에 없었다.)
 *
 * 잣대를 하나로 모은다. 여기는 그 하나를 불러 쓰는 얇은 껍데기다.
 */
export function 채비됐나(p: 인연프로필 | null): boolean {
  return 모자란것(p).length === 0;
}

/** 아직 못 채운 것 — 화면이 그대로 물어보면 된다. **이것이 유일한 잣대다** */
export function 모자란것(p: 인연프로필 | null): string[] {
  const 빠진: string[] = [];
  if (!p || !p.photos.length) 빠진.push("사진");
  if (!p?.sex) 빠진.push("성별");
  if (!p?.born) 빠진.push("나이");
  if (!p?.area) 빠진.push("지역");
  // 형: 「사진이랑 프로필 넣어야 가입」 — 한 마디가 그 프로필이다
  if (!p?.line?.trim()) 빠진.push("한 마디");
  if (본인확인_켬 && !p?.verified) 빠진.push("본인확인");
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

/**
 * 사진을 **다시 구워서** 올린다.
 *
 * 형: 「사진 한 장 올려 봤는데 안 된다」 — 저장소가 아니라 내 코드가
 * 먼저 막고 있었다. jpg·png·webp 만 받았는데 아이폰이 찍는 것은 HEIC 다.
 *
 * 그래서 **받은 그대로 올리지 않는다.** 브라우저가 열 수 있는 그림이면
 * 무엇이든 받아서 한 번 다시 굽는다. 얻는 것이 셋이다 —
 *  ① HEIC 가 통과한다(사파리는 HEIC 를 그릴 줄 안다. 그려서 JPEG 로 굽는다)
 *  ② **박힌 위치가 떨어져 나간다.** 사진의 EXIF 에는 찍은 자리의 위도·경도가
 *     들어 있다. 얼굴 사진이 오가는 판에서 그건 집 주소다. 다시 구우면
 *     화소만 남고 그 칸은 통째로 사라진다
 *  ③ 긴 변 1600 으로 줄이니 저장소 값도 사람 수만큼 곱해지지 않는다
 * 못 굽는 것(정말 그림이 아닌 것)만 원래대로 올려 보고, 그것도 안 되면
 * 그때 막는다.
 */
async function 다시굽기(file: File): Promise<{ 짐: Blob; 종류: string; 끝: string }> {
  const 통째 = { 짐: file as Blob, 종류: file.type, 끝: "jpg" };
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      await new Promise<void>((ok, no) => {
        img.onload = () => ok();
        img.onerror = () => no(new Error("못 연다"));
        img.src = url;
      });
      const 긴 = Math.max(img.naturalWidth, img.naturalHeight);
      const 배 = 긴 > 1600 ? 1600 / 긴 : 1;
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * 배);
      c.height = Math.round(img.naturalHeight * 배);
      const x = c.getContext("2d");
      if (!x) return 통째;
      x.imageSmoothingQuality = "high";
      x.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((r) =>
        c.toBlob(r, "image/jpeg", 0.86)
      );
      if (!blob) return 통째;
      return { 짐: blob, 종류: "image/jpeg", 끝: "jpg" };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return 통째;
  }
}

/** 사진을 올린다 — 저장소에 두고, 프로필에는 pending 으로 적는다 */
export async function 사진올리기(file: File): Promise<사진> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  // 사진이 아닌 것만 막는다. 갈래는 다시 구우면서 맞춘다
  if (!/^image\//.test(file.type) && !/\.(hei[cf]|jpe?g|png|webp)$/i.test(file.name))
    throw new Error("사진 파일만 올릴 수 있습니다");
  if (file.size > 40 * 1024 * 1024) throw new Error("사진이 너무 큽니다 (40MB 까지)");

  const { 짐, 종류, 끝 } = await 다시굽기(file);
  if (!/^image\/(jpeg|png|webp)$/.test(종류))
    throw new Error(`이 사진은 다루지 못합니다 (${종류 || "갈래 모름"})`);
  if (짐.size > 8 * 1024 * 1024) throw new Error("사진이 너무 큽니다");

  const path = `yeon/${u.uid}/${Date.now()}.${끝}`;
  try {
    await uploadBytes(sref(storage, path), 짐, { contentType: 종류 });
    const url = await getDownloadURL(sref(storage, path));
    return { path, url, state: "pending", at: Date.now() };
  } catch (e) {
    // 「사진을 올리지 못했습니다」 한 줄로 삼키면 다음 사람이 또 처음부터
    // 파야 한다. 저장소가 아예 안 열려 있던 것을 찾는 데 한나절을 썼다.
    // **까닭을 그대로 보여 준다** — 고칠 사람이 바로 알아보게.
    const 코드 = (e as { code?: string })?.code ?? "";
    const 말 = {
      "storage/unauthorized": "저장소 규칙이 막고 있습니다 (npm run rules:deploy)",
      "storage/unauthenticated": "다시 들어와 주세요",
      "storage/retry-limit-exceeded": "그물이 약합니다. 잠시 뒤 다시",
      "storage/quota-exceeded": "저장소가 찼습니다",
      "storage/unknown": "저장소가 아직 안 열렸을 수 있습니다",
    }[코드];
    throw new Error(말 ? `${말} (${코드})` : `사진을 올리지 못했습니다 (${코드 || "까닭 모름"})`);
  }
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
