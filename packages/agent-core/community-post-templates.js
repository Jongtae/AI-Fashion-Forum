/**
 * community-post-templates.js
 *
 * Realistic Korean community post templates modeled after 네이버 카페 글.
 * Each post mimics real user behavior: casual tone, personal stories,
 * emoticons, ㅋㅋ/ㅎㅎ, and mixed formality levels.
 */

// ── Style & 코디 ────────────────────────────────────────────────────────────

const STYLE_POSTS = [
  {
    title: "봄 아우터 추천 좀 해주세요ㅠ",
    body: "날씨가 슬슬 따뜻해지는데 입을 게 진짜 없어요ㅠㅠ\n작년에 뭘 입었는지 기억도 안 나고...\n가벼우면서 핏이 예쁜 봄 자켓 추천 부탁드려요!\n트위드 vs 가죽 중에 고민인데 요즘 뭐가 더 많이 보이나요?\n너무 격식 차린 느낌 말고 청바지에 툭 걸치기 좋은 거로요.\n봄은 워낙 짧아서 지금 사야 뽕 뽑을 수 있는데... 추천 좀!",
    tags: ["봄아우터", "자켓추천"],
  },
  {
    title: "오늘 출근룩 이거 괜찮나요?",
    body: "오늘 좀 신경 써봤는데 괜찮은지 모르겠어요ㅎ\n블레이저에 슬랙스 매치했는데 구두가 너무 딱딱한가...\n요즘 로퍼 많이 신더라고요 하나 장만해야 하나\n출근룩인데 너무 캐주얼해 보이면 안 되잖아요ㅎㅎ\n비슷한 스타일로 코디하시는 분 계시면 의견 좀요!",
    tags: ["출근룩", "오피스룩"],
  },
  {
    title: "카키 바지에 네이비 셔츠 이상한가요..?",
    body: "오늘 이렇게 입고 나갔는데 친구가 좀 이상하대요\n저는 괜찮은 것 같은데ㅋㅋ\n원래 무채색 위주로만 입다가 처음으로 색 넣어봤거든요\n너무 튀는 건 싫은데 그렇다고 맨날 검흰검흰도 지겨워서...\n색감 잘 아시는 분들 의견 좀 부탁드립니다!",
    tags: ["색조합", "코디고민"],
  },
  {
    title: "자라 오버핏 블레이저 한 달 입어봤어요",
    body: "저번 달 세일때 7만원대에 샀는데 솔직 후기 올려봅니다\n핏은 진짜 예뻐요 특히 어깨라인이 자연스러움\n근데 한 달 입으니까 안감이 좀 밀리기 시작ㅠ\n세탁은 드라이만 해야 해서 좀 불편\n이 가격이면 가성비는 괜찮다고 봅니다\n색상 추가로 하나 더 살까 고민중...",
    tags: ["자라", "블레이저", "내돈내산"],
  },
  {
    title: "봄나들이 갔다가 찍은 코디",
    body: "주말에 나들이 갔다가 찍은 사진이에요~\n가디건에 청바지 조합인데 안에 스트라이프 티 넣었어요\n요즘 낮에는 따뜻한데 아침저녁 쌀쌀해서 가디건이 딱이더라고요\n신발은 컨버스 하이탑으로 맞췄는데 편하고 예쁘고ㅎㅎ\n다들 봄 나들이 어떤 스타일로 다니세요?",
    tags: ["봄코디", "나들이룩"],
  },
  {
    title: "연예인 공항패션 보고 따라해봤는데...",
    body: "노윤서 제주도 여행룩 보고 비슷하게 해봤어요\n브라운 자켓에 핑크 티 조합이었는데\n현실은... 뭔가 다르네요ㅋㅋㅋ\n꾸안꾸가 진짜 어렵다는 걸 느낌\n얼굴이 해야 할 일이 절반인듯...\n그래도 컬러 조합은 따라하기 좋아서 추천!",
    tags: ["연예인패션", "꾸안꾸"],
  },
  {
    title: "22년전 서울 스트릿패션 사진 봤는데 ㄷㄷ",
    body: "일본 잡지에 실렸던 2000년대 초 서울 스트릿패션 사진 봤는데요\n솔직히 요즘이랑 뭐가 다른건지 모르겠어요ㅎㅎ\n오히려 그때가 더 개성있어 보이기도 하고\n패션은 돌고 도는 거라더니 진짜 맞는 말인듯\n여러분은 어떻게 생각하세요?",
    tags: ["레트로", "스트릿패션"],
  },
];

// ── 가격 & 가성비 ──────────────────────────────────────────────────────────

const PRICING_POSTS = [
  {
    title: "무신사 봄 세일 뭐 건졌어요?",
    body: "무신사 시즌오프 세일 시작했던데 혹시 뭐 건지신 분?\n작년에는 여기서 청바지 3만원에 샀었는데 올해도 그 정도 하려나\n카트에 담아놓은 게 10개 넘는데 다 사면 20만원ㅋㅋ\n예산이 10만원인데 뭐를 먼저 사야 할지 고민...\n가성비 좋았던 아이템 추천 부탁드려요!",
    tags: ["무신사", "세일"],
  },
  {
    title: "이 가격이면 괜찮은 건가요?",
    body: "쿠팡에서 니트 가디건 19,900원에 파는데\n후기 보니까 보풀 좀 일어난다는 사람도 있고 괜찮다는 사람도 있고\n2만원짜리한테 뭘 바라나 싶기도 한데...\n근데 비슷한 디자인이 다른 데서 5만원이거든요\n혹시 사보신 분 계시면 실착감 어떤지 알려주세요ㅠ",
    tags: ["가격비교", "가성비"],
  },
  {
    title: "기본 티셔츠 유니클로 vs 자라 비교",
    body: "기본 라운드넥 티 기준으로 비교해봤는데\n유니클로: 소재감 좋고 세탁 잘 됨, 근데 핏이 좀 넉넉\n자라: 핏이 깔끔하고 예쁜데 몇 번 빨면 늘어남\n가격은 유니클로가 좀 더 저렴하고...\n솔직히 기본템은 유니클로가 나은 것 같은데 여러분은 어떠세요?",
    tags: ["유니클로", "자라"],
  },
  {
    title: "유니클로 브이~~~",
    body: "유니클로 가서 이것저것 입어보다가\n브이넥 니트가 핏이 너무 좋아서 바로 데려왔어요\n색깔도 진짜 다양하고 가격도 착하고\n기본템은 역시 유니클로인듯ㅎ\n근데 매장에서 입었을 때랑 집에서 입었을 때랑 또 다르더라ㅋㅋ",
    tags: ["유니클로", "니트"],
  },
  {
    title: "올리브영 세일 때 산 것들 간단 후기",
    body: "저번 올영세일 때 이것저것 샀는데 간단 후기 올려요\n선크림 - 항상 쓰던 거라 안정적 good\n토닝 팩트 - 커버력 별로지만 데일리로는 OK\n립 틴트 신상 - 발색 예쁜데 지속력이 좀...\n다 합쳐서 4만원 좀 넘게 나왔어요\n다음 세일 때 뭐 사야할지 추천 좀요ㅎ",
    tags: ["올리브영", "세일후기"],
  },
];

// ── 지속가능 & 중고 ────────────────────────────────────────────────────────

const SUSTAINABILITY_POSTS = [
  {
    title: "중고거래로 명품 사보신 분 있나요?",
    body: "번개장터에서 명품 중고 많이 올라오던데\n실제로 사보신 분 계신가요?\n가품 걱정이 좀 되긴 하는데 가격이 너무 매력적이라...\n정품 대비 반값이면 상태 좀 안 좋아도 괜찮은 건지\n중고 명품 사실 때 체크포인트 있으면 알려주세요!",
    tags: ["중고명품", "번개장터"],
  },
  {
    title: "옷장 정리하다 안 입는 옷 너무 많은데...",
    body: "옷장 정리 시작했다가 멘붕ㅋㅋ\n2~3년 안 입은 옷이 반 이상이에요\n버리기는 아깝고 누가 입으면 좋겠는데\n아름다운가게 말고 다른 좋은 곳 있나요?\n의류 리폼해주는 곳도 있으면 알려주세요ㅠ\n미니멀 라이프 도전하고 싶어요...",
    tags: ["옷장정리", "미니멀"],
  },
  {
    title: "파타고니아 자켓 2년 입어본 솔직 후기",
    body: "환경 생각해서 파타고니아 자켓 샀었는데 2년 됐어요\n가격이 38만원이라 좀 고민했었는데...\n근데 2년 입어도 보풀도 안 생기고 색도 안 바래요!\n세탁기 돌려도 되고 관리가 너무 편함\n비싸도 오래 입을 거면 오히려 가성비 있다고 봅니다\n환경도 챙기고 지갑도 장기적으로 챙기는 느낌ㅎ",
    tags: ["파타고니아", "지속가능패션"],
  },
  {
    title: "빈티지 가죽자켓 리폼 맡겼는데",
    body: "10년 넘은 가죽자켓을 리폼 맡겼어요\n아버지가 입으시던 건데 버리기 아까워서...\n근데 리폼 비용이 8만원ㅋㅋ 새로 사는 게 더 싼 거 아닌가 싶었는데\n결과물 보니까 와... 새 옷 같아요\n오래된 옷에 이야기가 있으니까 더 좋은 것 같아요\n다들 이런 경험 있으세요?",
    tags: ["빈티지", "리폼", "업사이클"],
  },
];

// ── 스트릿 & 스니커즈 ──────────────────────────────────────────────────────

const STREETWEAR_POSTS = [
  {
    title: "스트릿 코디 처음 도전해봤는데ㅋㅋ",
    body: "평소에 깔끔한 스타일만 하다가 처음으로 스트릿 도전ㅋㅋ\n오버핏 후디에 카고팬츠 매치하고 에어포스 신었어요\n근데 이게 저한테 맞는 건지 모르겠음...\n스트릿 코디 잘하시는 분들 팁 좀 주세요!\n모자 뭐 쓰는 게 좋을까요? 볼캡? 비니?",
    tags: ["스트릿코디", "오버핏"],
  },
  {
    title: "나이키 vs 뉴발 요즘 뭐가 대세?",
    body: "주변에서 뉴발 530 엄청 많이 보이던데\n나이키 에어맥스도 여전히 인기 있는 것 같고\n둘 다 가지고 있는 분 계시면 어떤 게 더 편한지 궁금해요\n저는 덩크 로우 신고 다니는데 발이 좀 아파서ㅠ\n편하면서도 코디하기 좋은 스니커즈 추천요!",
    tags: ["나이키", "뉴발란스"],
  },
  {
    title: "크림에서 덩크 로우 가격 떨어졌네요",
    body: "크림 보니까 덩크 로우 판다 컬러가\n저번 달 15만원이었는데 지금 12만원까지 내려왔어요\n사야 하나 말아야 하나 고민중ㅋㅋ\n더 떨어질 수도 있는데 지금 사면 후회할까요?\n리셀 가격 흐름 아시는 분 의견 좀 부탁드려요!",
    tags: ["크림", "덩크로우"],
  },
  {
    title: "후디 + 코트 조합 아직 괜찮은가요?",
    body: "요즘 날씨가 애매해서 후디 위에 롱코트 걸쳤는데\n주변에서 '아직도 그거 입어?' 하는 시선이ㅋㅋ\n저는 편하고 좋은데 유행이 지난 건가요?\n솔직히 유행보다 편한 게 장땡이긴 한데\n그래도 의견 좀 들어보고 싶어요ㅎ",
    tags: ["후디코디", "레이어링"],
  },
];

// ── 오피스 & 직장인 ────────────────────────────────────────────────────────

const OFFICE_POSTS = [
  {
    title: "면접 때 뭐 입고 가세요?",
    body: "다음 주에 면접인데 뭐 입고 가야 할지 모르겠어요\nIT 업종이라 너무 딱딱한 정장은 아닌 것 같고\n비즈니스 캐주얼? 그게 정확히 뭔지도 잘 모르겠고ㅋㅋ\n셔츠에 슬랙스 정도면 괜찮을까요?\n구두는 꼭 신어야 하나요... 로퍼는 안 되나요?",
    tags: ["면접룩", "비즈니스캐주얼"],
  },
  {
    title: "여름 출근룩이 제일 어려운 것 같아요",
    body: "너무 더워서 반팔에 면바지 입고 싶은데\n회사가 좀 보수적이라 반팔이 애매해요...\n린넨 셔츠 괜찮을까요? 근데 구김이 심하잖아요ㅠ\n에어컨 세게 트니까 안에 카디건도 필요하고\n여름 출근룩 어떻게 해결하시나요?\n특히 땀 안 비치는 소재 추천해주세요!",
    tags: ["여름출근룩", "오피스코디"],
  },
  {
    title: "스파오 슬랙스 2만원짜리 솔직 후기",
    body: "출근용 슬랙스 찾다가 스파오에서 2만원짜리 샀어요\n핏: 와이드인데 생각보다 깔끔 (173cm/65kg M 착용)\n소재: 약간 합성 느낌 있지만 이 가격에 이 정도면 OK\n구김: 살짝 가긴 하는데 다림질하면 괜찮아요\n단점: 주머니가 좀 얕아서 폰 넣으면 불안함ㅋ\n총평: 가격 대비 만족! 색상 추가 구매 예정",
    tags: ["스파오", "슬랙스후기"],
  },
  {
    title: "회사에서 니트 조끼 입으면 이상한가요",
    body: "요즘 니트 조끼가 다시 유행이라 하나 샀는데\n이걸 회사에 입고 가도 되는 건지ㅋㅋ\n좀 학생 같은 느낌도 있잖아요\n안에 셔츠 받치면 깔끔할 것 같긴 한데...\n회사에서 니트 조끼 입으시는 분 계시면 의견 좀!",
    tags: ["니트조끼", "오피스룩"],
  },
];

// ── 반려동물 & 일상 ────────────────────────────────────────────────────────

const LIFESTYLE_POSTS = [
  {
    title: "강아지 산책할 때 뭐 입으세요?",
    body: "매일 아침저녁 산책하는데 옷이 다 털투성이가 돼요ㅠㅠ\n털 잘 안 붙는 소재 아시는 분?\n나일론 소재가 좋다던데 추천 아이템 있으면 알려주세요\n주머니 많은 아우터 필요해요\n간식이랑 배변봉투 넣을 데가 있어야...\n반려동물 키우시는 분들 산책룩 공유 좀요!",
    tags: ["산책룩", "반려동물"],
  },
  {
    title: "부시시 우리 댕댕이 🐶",
    body: "산책 나갔다가 찍은 우리 댕댕이 사진이에요ㅎ\n물멍하고 있길래 한 컷 찍었는데 화보 느낌ㅋㅋ\n나이가 들더니 어딜 가나 멍을 잘 때리더라구요\n이름은 감자인데 감자처럼 눌러앉아있음ㅋㅋ\n다들 댕댕이 이름 뭐예요?",
    tags: ["반려동물", "강아지"],
  },
  {
    title: "괌 여행 다녀왔어요",
    body: "3박 4일 괌 다녀왔는데 바다가 진짜 미쳤어요ㅠ\n한국이랑 물 색깔이 다르더라구요 진짜 에메랄드색\n호텔 수영장도 좋았는데 바다가 넘사벽\n옷은 가볍게 린넨 셔츠랑 반바지 위주로 챙겨갔어요\n현지에서 산 슬리퍼가 너무 편해서 한국에서도 신고 다닐 예정ㅋ\n여행 코디 따로 준비하시는 분들 어떻게 하세요?",
    tags: ["괌여행", "여행코디"],
  },
  {
    title: "나트랑 여행복장 뭐 입고 가세요?",
    body: "나트랑 가는데 뭐 입고 가야 할지 모르겠어요\n덥다고만 들었는데 실내는 에어컨이 세다던데\n얇은 가디건 하나 챙겨야 하나요?\n수영복 위에 걸칠 원피스도 필요할 것 같고\n짐을 최소화하고 싶은데 필수 아이템 좀 알려주세요!\n첫 동남아 여행이라 설레네요ㅎ",
    tags: ["나트랑", "여행준비"],
  },
];

// ── 연예인 & 트렌드 ────────────────────────────────────────────────────────

const TREND_POSTS = [
  {
    title: "요즘 넷플릭스 보면서 패션 체크하는 사람?",
    body: "넷플 드라마 보면서 등장인물 코디만 보고 있어요ㅋㅋ\n특히 일드 보면 소재감이 좀 다른 느낌?\n한국 드라마는 협찬이 많아서 좀 과한데\n일드는 일상적인 코디가 많아서 참고하기 좋더라구요\n혹시 패션 참고하기 좋은 드라마 추천해주세요!",
    tags: ["드라마패션", "넷플릭스"],
  },
  {
    title: "80년대 패션 사진 보니까 신기해요",
    body: "엄마 앨범 보다가 80년대 사진 발견했는데\n와... 그때도 진짜 멋있게 입고 다니셨네요\n지금 봐도 안 촌스러운 코디가 많아서 놀람\n패션은 진짜 돌고 도는 것 같아요\n요즘 레트로 열풍이 괜히 있는 게 아닌듯\n옛날 사진 보면서 코디 영감 얻으시는 분 있나요?",
    tags: ["레트로", "빈티지"],
  },
  {
    title: "올해 봄 컬러 트렌드가 뭔가요?",
    body: "매년 올해의 컬러 나오잖아요\n올해는 어떤 색이 유행인지 궁금해요\n작년에는 라벤더 많이 보였는데\n올해는 좀 더 차분한 톤인 것 같기도 하고\n다들 올해 봄에 어떤 색상 옷 많이 사셨어요?\n저는 베이지 위주로 갈까 하는데...",
    tags: ["컬러트렌드", "봄패션"],
  },
];

// ── 자동차 & 취미 (비패션 일상) ─────────────────────────────────────────────

const HOBBY_POSTS = [
  {
    title: "새 차 출고했습니다!",
    body: "드디어 기다리던 차가 나왔어요ㅠㅠ\n계약하고 3개월 기다렸는데 색상 너무 맘에 들어요\n첫 드라이브는 해안도로 갈 예정!\n근데 차 안에서 입기 편한 옷이 따로 있나요?\n장시간 운전할 때 편한 코디 추천해주세요ㅎ\n뭐 입고 타느냐에 따라 느낌이 다르더라구요ㅋ",
    tags: ["자동차", "드라이브"],
  },
  {
    title: "운동 시작했는데 웨어 추천 좀요",
    body: "올해 목표로 헬스장 등록했는데\n운동복을 뭘 사야 할지 모르겠어요ㅋㅋ\n나이키 드라이핏? 언더아머? 아니면 데카트론?\n너무 비싼 건 부담이고 그렇다고 너무 싼 건...\n운동할 때도 좀 멋있게 입고 싶거든요\n헬스 웨어 추천 부탁드립니다!",
    tags: ["운동복", "애슬레져"],
  },
];

// ── Topic → Template mapping ─────────────────────────────────────────────────

const TOPIC_TEMPLATE_MAP = {
  style: STYLE_POSTS,
  fit: STYLE_POSTS,
  color: STYLE_POSTS,
  outerwear: STYLE_POSTS,
  pricing: PRICING_POSTS,
  brand: PRICING_POSTS,
  utility: PRICING_POSTS,
  value: PRICING_POSTS,
  sustainability: SUSTAINABILITY_POSTS,
  ethics: SUSTAINABILITY_POSTS,
  secondhand: SUSTAINABILITY_POSTS,
  quality: SUSTAINABILITY_POSTS,
  streetwear: STREETWEAR_POSTS,
  sneakers: STREETWEAR_POSTS,
  hype: STREETWEAR_POSTS,
  office: OFFICE_POSTS,
  layering: OFFICE_POSTS,
  minimal: OFFICE_POSTS,
  pet_lifestyle: LIFESTYLE_POSTS,
  daily_look: LIFESTYLE_POSTS,
  comfort: LIFESTYLE_POSTS,
  outdoor: LIFESTYLE_POSTS,
};

const ALL_POSTS = [
  ...STYLE_POSTS,
  ...PRICING_POSTS,
  ...SUSTAINABILITY_POSTS,
  ...STREETWEAR_POSTS,
  ...OFFICE_POSTS,
  ...LIFESTYLE_POSTS,
  ...TREND_POSTS,
  ...HOBBY_POSTS,
];

// ── Comment templates (real community tone) ──────────────────────────────────

const COMMENT_TEMPLATES = [
  "저도 이거 고민 중이었는데 도움 됐어요!",
  "오 핏 진짜 예쁘네요ㅎㅎ 사이즈가 어떻게 되세요?",
  "저는 비슷한 거 사서 입고 있는데 만족해요~",
  "가격 대비 괜찮아 보이는데 소재감은 어때요?",
  "이거 세탁하면 줄어드나요? 후기가 갈려서...",
  "색감 실물이 궁금해요! 사진이랑 많이 다른가요?",
  "저도 같은 고민이에요ㅠㅠ 결국 뭘로 결정하셨어요?",
  "우와 코디 진짜 잘하시네요 참고할게요!",
  "내돈내산 후기 감사해요 진짜 도움 됩니다",
  "저는 이거 좀 아쉬웠어요... 보풀이 좀 일어나더라고요",
  "오~ 고맙습니다ㅎ 좋은 정보!",
  "비슷한 디자인으로 더 저렴한 것도 있던데 어디였는지...",
  "와 이 가격에 이 퀄이면 바로 사야죠ㅋ",
  "혹시 키 몇이세요? 기장감이 궁금해요",
  "이거 저도 질렀어요 도착하면 후기 올릴게요!",
  "역시 이 브랜드는 기본템이 찐이에요",
  "ㅋㅋㅋ 공감되네요 저도 같은 경험",
  "이거 요즘 어디서 사야 제일 싼가요?",
  "아 이거 살까말까 했는데 후기 보고 결정했어요 감사!",
  "댕댕이 너무 귀엽😍 이름이 뭐예요?",
];

// ── Archetype personality markers ────────────────────────────────────────────

const ARCHETYPE_INTROS = {
  quiet_observer: [null, null, "조용히 눈팅하다 글 남겨요ㅎ\n", "평소엔 읽기만 하는데 이건 궁금해서\n"],
  social_participant: [null, "같이 얘기해봐요~\n", null, "궁금한 게 있어서 올려봐요!\n"],
  trend_setter: [null, "요즘 핫한 것 같아서 먼저 해봤는데\n", null],
  contrarian_observer: [null, "솔직히 저는 좀 다르게 보는데\n", null, "다들 좋다는데 저만 아닌가요ㅋ\n"],
  empathetic_responder: [null, "저도 비슷한 경험 있어서 올려봐요\n", null, "고민 공감돼요ㅠ\n"],
  brand_loyalist: [null, "이 브랜드는 진짜 믿고 사는데\n", null],
};

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a realistic community post based on agent state.
 *
 * @param {object} agent - Agent with interest_vector, archetype, etc.
 * @param {number} seed - Deterministic seed for variation
 * @param {string[]} recentBodies - Recent post bodies to avoid repetition
 * @returns {{ title: string, content: string, tags: string[] }}
 */
export function generateCommunityPost({ agent, seed = 0, recentBodies = [] }) {
  const rng = seededRandom(seed);
  const interests = Object.entries(agent.interest_vector || {});
  interests.sort((a, b) => b[1] - a[1]);
  const primaryTopic = interests[0]?.[0] || "style";

  // Select template pool based on primary interest
  let pool = TOPIC_TEMPLATE_MAP[primaryTopic] || ALL_POSTS;

  // Sometimes pick from ALL_POSTS for variety (30% chance)
  if (rng() < 0.3) {
    pool = ALL_POSTS;
  }

  const recentSet = new Set(recentBodies.map(b => (b || "").slice(0, 30)));

  // Pick a non-duplicate template
  let template = null;
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx = Math.floor(rng() * pool.length);
    const candidate = pool[idx];
    if (!recentSet.has(candidate.body.slice(0, 30))) {
      template = candidate;
      break;
    }
  }
  if (!template) template = pool[Math.floor(rng() * pool.length)];

  // Optionally prepend archetype intro (50% chance)
  const archetype = agent.archetype || "quiet_observer";
  const intros = ARCHETYPE_INTROS[archetype] || ARCHETYPE_INTROS.quiet_observer;
  const intro = intros[Math.floor(rng() * intros.length)];

  const content = intro ? intro + template.body : template.body;

  return {
    title: template.title,
    content,
    tags: template.tags || [],
  };
}

/**
 * Generate a realistic comment based on agent personality.
 */
export function generateCommunityComment({ agent, seed = 0 }) {
  const rng = seededRandom(seed);
  return { content: COMMENT_TEMPLATES[Math.floor(rng() * COMMENT_TEMPLATES.length)] };
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
