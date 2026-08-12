// ─────────────────────────────────────────────────────────────
// 화두 은행 — 서비스의 심장. 30칙.
// 질문은 짧게. 이야기는 context에, 스승들의 답은 masters에.
// 어록은 무문관·벽암록·조주록 등 전승된 선어록을 우리말로 풀어 옮긴 것.
// 스승의 이름 대신 "풀이"라 적힌 것은 이 도량이 붙인 해설이다.
// ─────────────────────────────────────────────────────────────

import type { Session } from "./store";

export type Master = {
  name: string; // 스승 이름 (또는 "풀이")
  era: string; // 시대 (풀이인 경우 빈 문자열)
  text: string; // 남긴 말
};

export type Hwadu = {
  id: string;
  title: string; // 목록에 보일 짧은 이름
  hanja?: string; // 한자 제목 (있으면)
  question: string; // 화두 본문 — 화면 한가운데, 짧게
  context?: string; // 배경 한 줄
  masters: Master[]; // 옛 스승들의 답
  audience?: "student"; // 학생 전용 화두
  forStudent?: boolean; // 고전이지만 학생에게도 좋은 화두
};

export const HWADU_BANK: Hwadu[] = [
  {
    id: "simsima",
    forStudent: true,
    title: "이 뭣고",
    hanja: "是甚麼",
    question: "지금 이것을 보고 있는\n이것은 무엇인가.",
    context: "한국 선원에서 가장 오래 들어온 물음.",
    masters: [
      {
        name: "남악 회양",
        era: "당나라",
        text: "「무엇이 이렇게 왔는가?」 하는 물음에 팔 년을 궁리한 끝에 그가 답했다. 「한 물건이라 말해도 이미 맞지 않습니다.」",
      },
      {
        name: "몽산 덕이",
        era: "송나라",
        text: "간절함이 없는 것을 근심하라. 의심이 사무치면 물음이 저절로 그대를 끌고 간다.",
      },
      {
        name: "서산 휴정",
        era: "조선",
        text: "참선하는 이는 모름지기 '이것이 무엇인고' 한 마디를, 배고픈 이가 밥 생각하듯·목마른 이가 물 생각하듯 놓치지 말아야 한다. 이 의심 하나가 사무치면, 문득 부딪히는 곳에서 눈이 열린다.",
      },
      {
        name: "고봉 원묘",
        era: "송나라",
        text: "참선에는 세 가지가 갖추어져야 한다. 크게 믿는 마음, 크게 분한 뜻, 크게 의심하는 정. 이 셋 가운데 하나라도 빠지면, 다리 부러진 솥과 같아 끝내 못 쓰는 그릇이 되고 만다.",
      },
      {
        name: "성철",
        era: "현대",
        text: "'이뭣고' 하고 챙길 때, 그 챙기는 놈이 누구인가를 다시 돌이켜 보라. 답을 찾으려 하지 말고, 오직 의심 한 덩어리가 되어라. 자나 깨나 한결같으면 그 자리가 곧 깨침이다.",
      },
    ],
  },
  {
    id: "mu",
    title: "무(無)",
    hanja: "無",
    question: "개에게도 불성이 있는가.\n조주는 답했다 — 무(無).\n\n어찌하여 없다 하였는가.",
    context: "무문관 제1칙 — 천칠백 화두의 첫 관문.",
    masters: [
      {
        name: "무문 혜개",
        era: "송나라",
        text: "온몸을 들어 하나의 의심 덩어리를 만들라. 밤에도 낮에도 이 '무'자를 들되, 있고 없고로 헤아리지 마라. 뜨거운 쇠구슬을 삼킨 듯, 뱉으려 해도 뱉어지지 않아야 한다.",
      },
      {
        name: "조주 종심",
        era: "당나라",
        text: "다른 날 다른 스님이 같은 것을 묻자, 조주는 이번엔 「있다(有)」 하였다.",
      },
    ],
  },
  {
    id: "cypress",
    title: "뜰 앞의 잣나무",
    hanja: "庭前柏樹子",
    question: "조사가 서쪽에서 온 뜻이 무엇인가.\n\n— 뜰 앞의 잣나무니라.",
    context: "무문관 제37칙 — 조주의 답.",
    masters: [
      {
        name: "조주 종심",
        era: "당나라",
        text: "「경계를 들어 보이지 마십시오.」 「나는 경계를 들어 보인 적이 없다.」 「그렇다면 그 뜻이 무엇입니까?」 「뜰 앞의 잣나무니라.」",
      },
      {
        name: "무문 혜개",
        era: "송나라",
        text: "이 답을 분명히 보아낸다면, 앞으로는 석가도 없고 뒤로는 미륵도 없다.",
      },
    ],
  },
  {
    id: "original-face",
    title: "본래면목",
    hanja: "本來面目",
    context: "육조단경 · 혜능과 혜명의 문답.",
    question: "부모에게서 태어나기 전,\n그대의 본래 얼굴은 무엇인가.",
    masters: [
      {
        name: "육조 혜능",
        era: "당나라",
        text: "「선도 생각하지 말고 악도 생각하지 마라. 바로 이러한 때, 그대의 본래면목은 무엇인가?」 혜명은 그 말끝에 크게 깨달았다.",
      },
    ],
  },
  {
    id: "one-returns",
    title: "만법귀일",
    hanja: "萬法歸一",
    question: "모든 것은 하나로 돌아간다.\n그 하나는 어디로 돌아가는가.",
    context: "벽암록 제45칙.",
    masters: [
      {
        name: "조주 종심",
        era: "당나라",
        text: "「내가 청주에 있을 때 베적삼 한 벌을 지었는데, 그 무게가 일곱 근이었다.」",
      },
      {
        name: "원오 극근",
        era: "송나라",
        text: "이치로 풀려는 순간 하나는 벌써 둘이 된다. 조주의 베적삼은 이치의 길을 끊어 버린 것이다.",
      },
    ],
  },
  {
    id: "tea",
    title: "끽다거",
    hanja: "喫茶去",
    context: "조주록 — 조주 종심의 끽다거.",
    question: "처음 온 이에게도, 왔던 이에게도,\n조주는 같은 말을 건넸다.\n\n— 차나 마시게.\n\n무엇을 건넨 것인가.",
    masters: [
      {
        name: "함허 득통",
        era: "조선",
        text: "한 잔의 차에 한 조각 마음이 나온다. 차와 선은 한맛이다.",
      },
      {
        name: "풀이",
        era: "",
        text: "온 사람에게도, 왔던 사람에게도, 묻는 사람에게도 — 마셔야 할 것은 같았다.",
      },
    ],
  },
  {
    id: "who-am-i",
    forStudent: true,
    title: "나는 누구인가",
    question: "나는 누구인가.",
    context: "천 가지 물음이 끝내 돌아오는 자리.",
    masters: [
      {
        name: "달마 · 혜가",
        era: "위진남북조",
        text: "「마음이 불안합니다.」 「그 마음을 가져오너라. 편안케 해 주리라.」 「찾아보아도 끝내 얻을 수가 없습니다.」 「내 이미 그대 마음을 편안케 하였다.」",
      },
      {
        name: "임제 의현",
        era: "당나라",
        text: "지금 법문을 듣고 있는, 어디에도 기대지 않은 그 사람 — 그가 바로 살아 있는 부처다. 밖에서 찾지 마라.",
      },
    ],
  },
  {
    id: "life-death",
    title: "생사",
    hanja: "生死",
    context: "전등록 — 도오와 점원의 문답.",
    question: "사람이 죽으면,\n어디로 가는가.",
    masters: [
      {
        name: "도오 원지",
        era: "당나라",
        text: "관을 두드리며 「살았습니까, 죽었습니까?」 묻는 제자에게 답했다. 「말하지 않겠다, 말하지 않겠다(不道不道).」",
      },
      {
        name: "서산 휴정",
        era: "조선",
        text: "삶은 한 조각 뜬구름이 일어남이요, 죽음은 한 조각 뜬구름이 스러짐이라.",
      },
    ],
  },
  {
    id: "mountain-water",
    title: "산은 산, 물은 물",
    hanja: "山是山",
    context: "전등록 · 청원 유신의 상당법어.",
    question: "산은 산이요, 물은 물이다.\n\n이 말이 왜 법문이 되는가.",
    masters: [
      {
        name: "청원 유신",
        era: "송나라",
        text: "공부하기 전에는 산은 산, 물은 물이었다. 공부가 깊어지자 산은 산이 아니고 물은 물이 아니었다. 이제 쉴 곳을 얻고 보니 — 산은 다만 산이요, 물은 다만 물이더라.",
      },
      {
        name: "성철",
        era: "현대 한국",
        text: "보고 듣는 이것 밖에 진리가 따로 없으니 — 산은 산이요, 물은 물이로다.",
      },
    ],
  },
  {
    id: "bottle-bird",
    title: "병 속의 새",
    question: "병 속의 새가 다 자랐다.\n\n병도 깨지 말고, 새도 다치지 말고,\n꺼내 보라.",
    context: "남전과 육긍대부의 문답.",
    masters: [
      {
        name: "남전 보원",
        era: "당나라",
        text: "남전이 문득 불렀다. 「대부여!」 「예.」 「나왔느니라.」",
      },
    ],
  },
  {
    id: "one-hand",
    title: "한 손바닥의 소리",
    hanja: "隻手音聲",
    context: "백은 혜학의 척수음성(隻手音聲).",
    question: "한 손바닥의 소리를\n들어 보라.",
    masters: [
      {
        name: "백은 혜학",
        era: "에도 일본",
        text: "귀로 듣는 것을 그만두었을 때 비로소 들리는 소리가 있다. 이 소리는 고요보다 깊다.",
      },
    ],
  },
  {
    id: "suffering",
    forStudent: true,
    title: "고통",
    hanja: "苦",
    context: "잡아함경 — 두 번째 화살의 비유.",
    question: "아픔과 괴로움은\n같은 것인가, 다른 것인가.",
    masters: [
      {
        name: "붓다",
        era: "고대 인도",
        text: "잘 배운 이는 첫 화살은 맞을지언정, 두 번째 화살은 맞지 않는다. 아픔에 괴로움을 더하는 것은 언제나 자기 자신이다.",
      },
    ],
  },
  {
    id: "put-down",
    title: "방하착",
    hanja: "放下著",
    question: "내려놓아라.\n\n빈손인 사람은,\n무엇을 내려놓는가.",
    context: "조주와 엄양의 문답 — 「빈손인데 무엇을 내려놓습니까?」 「그렇다면 지고 가거라.」",
    masters: [
      {
        name: "대혜 종고",
        era: "송나라",
        text: "놓아 버리고 또 놓아 버려라. 놓아 버렸다는 그 자리마저 놓아 버려라.",
      },
      {
        name: "풀이",
        era: "",
        text: "'빈손'이라는 생각 — 엄양이 지고 온 것은 그것이었다.",
      },
    ],
  },
  {
    id: "ordinary-mind",
    title: "평상심시도",
    hanja: "平常心是道",
    question: "평소의 마음이 곧 길이라 한다.\n향하려 하면 어긋난다.\n\n그렇다면 어떻게 이르는가.",
    context: "무문관 제19칙 — 남전과 조주의 문답.",
    masters: [
      {
        name: "남전 보원",
        era: "당나라",
        text: "도는 알고 모름에 속하지 않는다. 앎은 헛된 알음알이요, 모름은 그저 캄캄함일 뿐이다.",
      },
      {
        name: "무문 혜개",
        era: "송나라",
        text: "봄에는 꽃, 가을에는 달, 여름에는 바람, 겨울에는 눈. 쓸데없는 생각만 두지 않으면 이것이 좋은 시절이다.",
      },
    ],
  },
  {
    id: "what-is-buddha",
    title: "부처란 무엇인가",
    hanja: "如何是佛",
    context: "무문관 제18칙 · 동산 수초 마삼근(麻三斤).",
    question: "부처란 무엇인가.\n\n동산은 답했다 — 삼베 세 근.",
    masters: [
      {
        name: "임제 의현",
        era: "당나라",
        text: "부처를 만나면 부처를 죽이고, 조사를 만나면 조사를 죽여라. 그래야 비로소 얽매임에서 벗어나리라.",
      },
      {
        name: "풀이",
        era: "",
        text: "높은 곳에서 부처를 찾는 마음이, 부처를 가장 멀리 밀어낸다.",
      },
    ],
  },
  {
    id: "good-day",
    forStudent: true,
    title: "일일시호일",
    hanja: "日日是好日",
    question: "어찌하여,\n날마다 좋은 날인가.",
    context: "벽암록 제6칙 — 운문이 스스로 묻고 스스로 답했다.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "좋은 일이 있는 날이 좋은 날이 아니다. 운문은 날씨를 말한 것이 아니다.",
      },
    ],
  },
  {
    id: "wind-flag",
    forStudent: true,
    title: "바람인가, 깃발인가",
    hanja: "非風非幡",
    question: "깃발이 펄럭인다.\n\n바람이 움직이는가,\n깃발이 움직이는가.",
    context: "무문관 제29칙 — 혜능은 「그대들의 마음이 움직인다」 하였다.",
    masters: [
      {
        name: "무문 혜개",
        era: "송나라",
        text: "바람도 아니요, 깃발도 아니요, 마음도 아니다 — 여기까지 보아야 조사를 본 것이다.",
      },
    ],
  },
  {
    id: "nothing-original",
    title: "본래무일물",
    hanja: "本來無一物",
    question: "본래 한 물건도 없다.\n\n그렇다면 지금 이 몸과 마음은\n무엇인가.",
    context: "육조 혜능의 게송 — 본래 한 물건도 없거늘, 어느 곳에 티끌이 앉으랴.",
    masters: [
      {
        name: "신수",
        era: "당나라",
        text: "몸은 보리의 나무요 마음은 밝은 거울틀. 부지런히 털고 닦아 티끌 앉지 않게 하라. — 혜능과 겨룬 다른 답.",
      },
      {
        name: "풀이",
        era: "",
        text: "닦는 자와 닦을 것 없는 자, 두 게송 사이에서 그대는 어디에 서 있는가.",
      },
    ],
  },
  {
    id: "finger-moon",
    forStudent: true,
    title: "달과 손가락",
    hanja: "指月",
    context: "능엄경 — 달을 가리키는 손가락의 비유.",
    question: "달을 보았다면,\n손가락은 무엇인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "경전 팔만 사천 권이 모두 손가락이다. 이 화두도 손가락이다. 달은 어디에 있는가.",
      },
    ],
  },
  {
    id: "silver-mountain",
    title: "은산철벽",
    hanja: "銀山鐵壁",
    context: "선가(禪家)의 오랜 비유 — 은산철벽.",
    question: "물러설 수도 없고,\n나아갈 수도 없다.\n\n그때 어찌하겠는가.",
    masters: [
      {
        name: "고봉 원묘",
        era: "원나라",
        text: "큰 의심 아래 반드시 큰 깨달음이 있다(大疑之下 必有大悟).",
      },
    ],
  },
  {
    id: "no-string",
    title: "줄 없는 거문고",
    hanja: "沒絃琴",
    context: "도연명의 무현금(無絃琴) 고사에서.",
    question: "줄 없는 거문고로,\n한 곡 타 보라.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "줄이 없어 탈 수 없다면 — 줄이 있을 때는 정녕 그대가 타고 있었는가.",
      },
    ],
  },
  {
    id: "bridge-flows",
    title: "다리가 흐른다",
    question: "다리가 흐르고,\n물은 흐르지 않는다.\n\n무슨 뜻인가.",
    context: "부대사의 게송 — 사람이 다리 위를 지나는데, 다리가 흐르고 물은 흐르지 않는다.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "물이 흐른다는 것은 물가에 선 자의 말이다. 물 위에 있는 자에게는 무엇이 흐르는가.",
      },
    ],
  },
  {
    id: "tree-mouth",
    title: "나무 위의 사람",
    hanja: "香嚴上樹",
    question: "입으로 가지를 물고 매달렸다.\n그때 누군가 도(道)를 묻는다.\n\n어찌하겠는가.",
    context: "무문관 제5칙 — 답하지 않으면 물음을 저버리고, 입을 열면 떨어져 죽는다.",
    masters: [
      {
        name: "무문 혜개",
        era: "송나라",
        text: "폭포처럼 쏟아지는 말재주도 여기서는 소용없다. 이 물음에 답할 수 있다면, 죽은 길을 살려 낼 것이다.",
      },
    ],
  },
  {
    id: "bell-sound",
    forStudent: true,
    title: "종소리",
    context: "능엄경 — 종소리와 듣는 성품(聞性).",
    question: "종이 울린다.\n\n소리는 종에 있는가,\n귀에 있는가.",
    masters: [
      {
        name: "붓다",
        era: "능엄경",
        text: "소리가 귀로 오는가, 귀가 소리로 가는가. 오고 감이 모두 성립하지 않는다면, 듣는 이것은 무엇인가.",
      },
    ],
  },
  {
    id: "gateless",
    title: "문 없는 문",
    hanja: "無門關",
    context: "무문관 서(序) — 대도무문(大道無門).",
    question: "문 없는 문을,\n어떻게 지나는가.",
    masters: [
      {
        name: "무문 혜개",
        era: "송나라",
        text: "큰 길에는 문이 없으나, 갈래길은 천 갈래다(大道無門 千差有路). 이 관문을 뚫으면 천하를 홀로 걸으리라.",
      },
    ],
  },
  {
    id: "snow",
    forStudent: true,
    title: "눈송이",
    question: "송이송이 내리는 눈은,\n어디에 떨어지는가.",
    context: "방거사가 눈을 보며 말했다 — 「좋은 눈이로다. 송이송이, 딴 곳에 떨어지지 않는구나.」",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "딴 곳이 없다면, 지금 그대가 서 있는 이곳은 어디인가.",
      },
    ],
  },
  {
    id: "corpse-dragger",
    title: "이 몸을 끌고 다니는 자",
    hanja: "拖死屍者誰",
    question: "이 몸을 끌고 다니는 것은\n누구인가.",
    context: "고봉 스님이 스승에게서 받아 평생을 들었던 물음.",
    masters: [
      {
        name: "고봉 원묘",
        era: "원나라",
        text: "잠들면 꿈도 없고 생각도 없다. 그때 나는 어디에 있는가 — 이 물음에 몸이 얼어붙었다.",
      },
    ],
  },
  {
    id: "now",
    forStudent: true,
    title: "지금",
    context: "금강경 — 과거·현재·미래의 마음은 얻을 수 없다.",
    question: "'지금'이라 말하는 순간,\n지금은 어디로 갔는가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "지나간 마음도 얻을 수 없고, 오지 않은 마음도 얻을 수 없고, 지금 마음도 얻을 수 없다 — 금강경의 세 마디가 여기서 만난다.",
      },
    ],
  },
  {
    id: "golden-wind",
    title: "체로금풍",
    hanja: "體露金風",
    question: "나뭇잎이 다 떨어지면,\n무엇이 남는가.",
    context: "「나무가 시들고 잎이 지면 어떠합니까?」 하는 물음에 대한 운문의 답.",
    masters: [
      {
        name: "운문 문언",
        era: "당나라",
        text: "「몸이 온전히 가을바람에 드러나느니라(體露金風).」",
      },
    ],
  },
  {
    id: "breath",
    forStudent: true,
    title: "숨",
    question: "지금 이 숨을,\n누가 쉬고 있는가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "쉬려고 쉬는 숨이 아니다. 그대가 잊고 있어도 숨은 쉬어진다 — 그렇다면 쉬는 이는 누구인가.",
      },
    ],
  },

  // ── 학생·어린이의 화두 — 쉬운 말, 깊은 물음 ──────────────
  {
    id: "st-friend",
    audience: "student",
    title: "친구란 무엇인가",
    question: "친구란 무엇인가.\n같이 노는 사람은 다 친구인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "같이 있으면 즐거운 사람과, 힘들 때 생각나는 사람은 같은 사람인가. 목록을 만들어 보면 뜻밖의 이름이 남는다.",
      },
    ],
  },
  {
    id: "st-study",
    audience: "student",
    title: "왜 공부하는가",
    question: "나는 왜 공부를 하는가.\n시험이 없어도, 공부할 것인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "'해야 해서'라는 답이 나오면 한 번 더 물어보라. 누가 하라고 했는가. 그 사람은 왜 하라고 했는가.",
      },
    ],
  },
  {
    id: "st-same-me",
    audience: "student",
    title: "어제의 나",
    question: "나는 어제의 나와\n같은 사람인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "몸의 세포는 바뀌고, 생각도 바뀐다. 그런데도 '나'라고 부를 수 있는 것은 무엇이 남아 있어서인가.",
      },
    ],
  },
  {
    id: "st-fun",
    audience: "student",
    title: "재미란 무엇인가",
    question: "게임은 왜 재미있고,\n공부는 왜 재미없는가.\n\n정말 그런가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "게임도 숙제로 내주면 재미없어진다는 말이 있다. 그렇다면 재미는 일 안에 있는가, 내 마음 안에 있는가.",
      },
    ],
  },
  {
    id: "st-grownup",
    audience: "student",
    title: "어른이 된다는 것",
    question: "어른이 된다는 것은\n무엇이 달라지는 것인가.\n키인가, 나이인가, 다른 무엇인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "나이만 먹은 어른도 있고, 어린 나이에 어른스러운 사람도 있다. 그 차이는 어디서 오는가.",
      },
    ],
  },
  {
    id: "st-fair",
    audience: "student",
    title: "공평함",
    question: "공평하다는 것은\n모두에게 똑같이 나누는 것인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "발 큰 사람과 발 작은 사람에게 같은 신발을 주면 공평한가. 같음과 공평함은 언제 갈라지는가.",
      },
    ],
  },
  {
    id: "st-anger",
    audience: "student",
    title: "화는 어디서 오는가",
    question: "화가 날 때,\n화는 어디에서 오는가.\n그 사람에게서인가, 내 안에서인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "같은 말을 들어도 어떤 날은 웃어넘기고 어떤 날은 화가 난다. 말은 같은데 무엇이 달랐는가.",
      },
    ],
  },
  {
    id: "st-lie",
    audience: "student",
    title: "아무도 모르는 거짓말",
    question: "아무도 모르는 거짓말은,\n그래도 나쁜가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "정말 아무도 모르는가 — 한 사람은 안다. 그 한 사람 앞에서 그대는 어떤 사람이 되어 가는가.",
      },
    ],
  },
  {
    id: "st-habit",
    audience: "student",
    title: "습관과 나",
    question: "생각 없이 습관대로 한 일은,\n내가 한 일인가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "습관은 내가 만들었지만, 지금은 습관이 나를 움직인다. 그렇다면 지금 주인은 누구인가.",
      },
    ],
  },
  {
    id: "st-time",
    audience: "student",
    title: "시간의 빠르기",
    question: "즐거운 날은 빨리 가고,\n지루한 날은 느리게 간다.\n\n시간은 정말 똑같이 흐르는가.",
    masters: [
      {
        name: "풀이",
        era: "",
        text: "시계는 늘 같은 속도로 돈다. 그런데 다르게 느껴진다면 — 흐르는 것은 시간인가, 마음인가.",
      },
    ],
  },
];

// 랜덤으로 건넨다 — 이미 지나온 화두(기록·현재)는 피한다.
// 어른: 고전 화두 전체. 학생: 학생 화두 + 학생에게도 좋은 고전.
export function pickRandomHwadu(
  excludeIds: string[],
  audience: "adult" | "student" = "adult"
): Hwadu {
  const byAudience = HWADU_BANK.filter((h) =>
    audience === "student"
      ? h.audience === "student" || h.forStudent
      : h.audience !== "student"
  );
  const pool = byAudience.filter((h) => !excludeIds.includes(h.id));
  const source = pool.length > 0 ? pool : byAudience;
  return source[Math.floor(Math.random() * source.length)];
}

// 대상별 기본 화두(HWADU_BANK) 개수 — 하드코딩 대신 실제로 센다
export function bankCount(audience: "adult" | "student" = "adult"): number {
  return HWADU_BANK.filter((h) =>
    audience === "student"
      ? h.audience === "student" || h.forStudent
      : h.audience !== "student"
  ).length;
}

export function getHwadu(id: string): Hwadu | undefined {
  // 체험 기록은 "try:이뭣고"처럼 접두어가 붙어 온다 — 벗겨내고 찾는다
  const realId = id.startsWith("try:") ? id.slice(4) : id;
  return HWADU_BANK.find((h) => h.id === realId);
}

// ── 세션(진행 기록)에서 제목/질문 꺼내기 ──

export function sessionTitle(session: Session): string {
  if (session.customQuestion) {
    const q = session.customQuestion.replace(/\s+/g, " ").trim();
    return q.length > 22 ? q.slice(0, 22) + "…" : q;
  }
  return getHwadu(session.hwaduId)?.title ?? "화두";
}

export function sessionQuestion(session: Session): string {
  return session.customQuestion ?? getHwadu(session.hwaduId)?.question ?? "";
}

// 화두를 한 줄로 — 줄바꿈을 공백으로 (제목·본문 렌더용)
export function flatQuestion(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}
