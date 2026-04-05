/**
 * community-post-templates.js
 *
 * Two-tier Korean community post generation:
 *
 * Tier 1 — Fixed templates (generateCommunityPost):
 *   ~50 hand-crafted realistic 네이버 카페 posts. Used as fallback when
 *   no external discussion seeds are available.
 *
 * Tier 2 — Compositional generation (generateSignalReactivePost):
 *   Combines external "discussion seeds" with agent personality to produce
 *   unlimited unique posts. A seed provides (subject, context, tensionPoint,
 *   possibleAngles) and the generator fills title/body patterns with these
 *   slots, modulated by archetype voice markers.
 *
 *   Combinatorial diversity:
 *     8 reaction types × ~15 title patterns × ~20 body patterns × 6 archetype voices
 *     = ~14,400 structural variations per seed, with unlimited seeds from live crawl data.
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
    title: "헨리코튼 블루종 어때요?",
    body: "헨리코튼 블루종 매장에서 입어봤는데 핏이 괜찮더라구요\n가격은 20만원대인데 소재감이 좋아서 고민중\n비슷한 가격대에 블루종 추천 있으면 알려주세요!\n색상은 네이비 아니면 카키 고민인데 뭐가 나을까요\n봄에 딱 좋을 것 같은데 여러분 의견 좀요ㅎ",
    tags: ["헨리코튼", "블루종", "봄자켓"],
  },
  {
    title: "주니폼 빙니폼 비교샷 올려봐요~~",
    body: "저 둘 다 가지고 있어서 비교샷 올려봅니다~\n주니폼이 좀 더 슬림한 핏이고 빙니폼은 여유있는 편\n소재는 빙니폼이 더 두꺼워서 겨울엔 빙니폼 추천\n봄가을에는 주니폼이 활용도 높은 것 같아요\n다들 어떤 스타일 더 좋아하세요? 댓글로 알려주세요!",
    tags: ["주니폼", "빙니폼", "비교"],
  },
  {
    title: "미니멀은 먼가여?",
    body: "요즘 미니멀 스타일 좋아한다고 하면 다들 아 그냥 검흰이요? 하는데\n아닌데ㅋㅋ 미니멀이 그냥 단순한 게 아니거든요\n실루엣이랑 소재감으로 승부하는 건데...\n혹시 미니멀 잘 하시는 분들 코디 공유 좀 해주세요\n진짜 미니멀이 뭔지 같이 얘기해봐요",
    tags: ["미니멀", "코디철학"],
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
  {
    title: "비 예보로 한강이 한산해요 🌧",
    body: "비 온다고 해서 한강 나왔는데 사람이 없어요ㅎ\n오히려 좋아~ 한적하게 산책하기 딱이네요\n레인코트 입고 나왔는데 비 안 오면 어쩌지ㅋㅋ\n요즘 고어텍스 바람막이 하나 있으면 비 올 때 진짜 좋더라구요\n다들 비 오는 날 어디 가세요?",
    tags: ["한강", "비오는날", "일상"],
  },
  {
    title: "다 힘들죠? 저만 그런거 아니죠? 😢",
    body: "요즘 회사 일이 너무 힘들어서 옷 살 기운도 없어요ㅠ\n근데 힘들 때 새 옷 하나 사면 기분전환 되지 않나요?\n저는 스트레스 받으면 양말이라도 하나 사거든요ㅋ\n소소한 쇼핑이 힐링인 분들 있으면 손~\n오늘도 다들 수고하셨어요 파이팅!",
    tags: ["일상", "힐링", "공감"],
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
  {
    title: "새로운 반지의 제왕 영화 캐스팅 근황 ㅎㄷㄷ",
    body: "아라곤 역할 캐스팅 소식 봤는데 의상이 궁금해지네요\n오리지널 영화 의상이 워낙 아이코닉했잖아요\n판타지 영화 의상에서 영감 받아서 코디하는 사람도 있더라\n다크 아카데미아 느낌이 요즘 또 유행이라\n중세풍 액세서리 어디서 사는지 아시는 분?",
    tags: ["영화", "다크아카데미아"],
  },
  {
    title: "환율이 여행에 끼치는 영향.. 💸",
    body: "환율 1400원 넘었는데 해외 직구 하시는 분들 어떠세요\n미국 브랜드 직구가 거의 의미가 없어졌어요ㅠ\n국내 정가랑 비슷하거나 오히려 더 비쌈\n일본은 아직 괜찮은 편인데 그것도 예전만 못하고\n환율 안정될 때까지 국내 브랜드 위주로 살까 고민...",
    tags: ["환율", "해외직구"],
  },
];

// ── 악세서리 & 소품 ──────────────────────────────────────────────────────────

const ACCESSORY_POSTS = [
  {
    title: "해밀턴 카키필드 머피 38mm와 함께 ✌️",
    body: "드디어 질렀습니다 해밀턴 카키필드 머피 38mm\n손목 둘레 16cm인데 딱 좋아요\n나토 스트랩으로 바꾸니까 분위기가 확 달라지네요\n시계를 즐기는 법 중 하나가 스트랩 놀이인듯ㅎ\n출근할 때 가죽, 주말에 나토 이렇게 돌려차고 있어요\n시계 차시는 분들 스트랩 몇 개 돌리세요?",
    tags: ["시계", "해밀턴", "스트랩"],
  },
  {
    title: "시계를 즐기는 법(빼꼼샷)",
    body: "오늘 시계 빼꼼샷 찍어봤어요ㅋㅋ\n소매에서 살짝 보이는 게 포인트죠\n사진 찍다 보니까 시계 한 개론 부족해서 또 지를 뻔...\n다들 데일리 시계 뭐 차세요?\n가성비 좋은 입문용 추천 좀 해주세요!",
    tags: ["시계", "데일리워치"],
  },
  {
    title: "가방 하나로 코디 분위기 바뀌네요",
    body: "맨날 백팩만 메다가 토트백 하나 샀는데\n와 이렇게 분위기가 달라질 줄 몰랐어요\n같은 옷인데 가방만 바꿨는데 좀 더 세련돼 보임\n남자 토트백 추천 있으면 알려주세요~\n예산은 10만원 이하로 보고 있어요ㅎ",
    tags: ["가방", "토트백", "남자가방"],
  },
  {
    title: "선글라스 얼굴형별 추천 정리해봄",
    body: "선글라스 고를 때 얼굴형이 중요하더라구요\n둥근형 - 각진 프레임 / 각진형 - 라운드 프레임\n이게 기본인데 직접 써봐야 아는 거긴 해요ㅋㅋ\n저는 젠틀몬스터 마몽 쓰고 있는데 만족!\n다들 올여름 선글라스 뭐 쓰실 예정이에요?",
    tags: ["선글라스", "젠틀몬스터"],
  },
];

// ── 시즌 & 이벤트 ────────────────────────────────────────────────────────────

const SEASONAL_POSTS = [
  {
    title: "벚꽃 명소 가서 찍은 코디 🌸",
    body: "주말에 여의도 벚꽃 보러 갔다가 사진 찍었어요\n화이트 니트에 베이지 슬랙스 조합인데\n벚꽃이랑 잘 어울려서 만족ㅎㅎ\n근데 사람 너무 많아서 사진 찍기 힘들었음...\n다들 벚꽃 코디 어떻게 하셨어요?",
    tags: ["벚꽃", "봄코디", "여의도"],
  },
  {
    title: "올해 첫 돔타프 피칭 🏕",
    body: "캠핑 시즌 시작!! 올해 첫 피칭 다녀왔어요\n새로 산 돔타프가 생각보다 설치 쉬워서 놀람\n캠핑할 때는 편한 게 최고라 카고팬츠에 플리스 입었는데\n밤에는 아직 쌀쌀해서 패딩 조끼 필수더라구요\n캠핑 다니시는 분들 캠핑룩 공유해요~~",
    tags: ["캠핑", "아웃도어", "캠핑룩"],
  },
  {
    title: "개강룩 고민중인데 같이 얘기해요 📚",
    body: "다음 주 개강인데 첫날 뭐 입고 갈지 고민ㅋㅋ\n너무 꾸미면 부담스럽고 안 꾸미면 촌스럽고\n작년엔 맨날 후디에 청바지였는데 올해는 좀 바꿔보고 싶어요\n깔끔한 캐주얼 느낌으로 가볼까 하는데\n대학생 분들 개강 첫날 뭐 입으세요?",
    tags: ["개강룩", "대학생코디"],
  },
  {
    title: "장마철 신발 뭐 신으세요? 😭",
    body: "비 오는 날 가죽 신발 신고 나갔다가 망했어요ㅠ\n레인부츠는 좀 과한 것 같고...\n고어텍스 운동화가 답인가요?\n아니면 그냥 저렴한 거 하나 장마용으로 사는 게 나은지\n비 올 때 신발 어떻게 해결하시는지 궁금해요!",
    tags: ["장마", "레인슈즈"],
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
  {
    title: "테슬라 모델Y 주니퍼 보고왔어요 (실물) 🚗",
    body: "전시장에서 실물 보고 왔는데 사진이랑 확 다르네요\n실물이 훨씬 나아요 특히 사이드 라인이 깔끔\n근데 실내 소재감이 좀 아쉬웠어요\n시승은 다음 주에 할 예정인데 기대됩니다\n혹시 오너분 계시면 실연비 어때요?",
    tags: ["테슬라", "자동차", "보고왔어요"],
  },
  {
    title: "RRL 5번째 (feat. 레더모토자켓) 🏍",
    body: "RRL 레더 모토자켓 드디어 데려왔어요\n착용감이 처음엔 빡빡한데 입을수록 몸에 맞춰지는 느낌\n빈티지 감성 좋아하시는 분들한테 강추합니다\n가격이 좀 하긴 하는데 가죽은 오래 입으니까...\n에이징 과정을 즐기는 게 가죽의 매력이죠ㅎ",
    tags: ["RRL", "레더자켓", "빈티지"],
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
  accessory: ACCESSORY_POSTS,
  watch: ACCESSORY_POSTS,
  bag: ACCESSORY_POSTS,
  sunglasses: ACCESSORY_POSTS,
  seasonal: SEASONAL_POSTS,
  camping: SEASONAL_POSTS,
  weather: SEASONAL_POSTS,
  travel: LIFESTYLE_POSTS,
  hobby: HOBBY_POSTS,
  vintage: HOBBY_POSTS,
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
  ...ACCESSORY_POSTS,
  ...SEASONAL_POSTS,
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
  "와 실물 보고 오셨군요 부럽 😍",
  "이 조합 진짜 찐이다 🔥🔥",
  "저도 같은 거 질렀어요ㅋㅋ 컬러만 다르게 ✌️",
  "오 시계 취향 좋으시네요~ 저도 입문하고 싶어요",
  "비교샷 감사해요!! 고민 해결됐어요 🙏",
  "ㅋㅋㅋ 공감 100% 저도 그랬어요",
  "캠핑 코디 너무 좋네요 🏕 어디서 사셨어요?",
  "환율 진짜 미쳤죠ㅠ 직구 포기했어요 💸",
];

// ── Archetype personality markers ────────────────────────────────────────────

const ARCHETYPE_INTROS = {
  quiet_observer: [null, null, "이거 보자마자 그냥 지나치긴 어렵더라고요\n", "오늘은 이 얘기가 먼저 걸리네요\n"],
  social_participant: [null, "같이 보기 좋은 얘기라 바로 들고 왔어요\n", null, "이건 댓글 붙을 것 같아서 먼저 올려봐요\n"],
  trend_setter: [null, "요즘 진짜 자주 보여서 바로 체크해봤어요\n", null],
  contrarian_observer: [null, "저는 여기서 다른 포인트가 먼저 걸렸어요\n", null, "다들 좋다는데 저는 이 부분이 더 보이네요\n"],
  empathetic_responder: [null, "이 얘기는 바로 공감부터 가더라고요\n", null, "저도 비슷한 쪽이라 말 얹어봐요\n"],
  brand_loyalist: [null, "이쪽은 일단 신상부터 체크하게 되네요\n", null],
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

// ════════════════════════════════════════════════════════════════════════════
// Tier 2 — Compositional signal-reactive generation
// ════════════════════════════════════════════════════════════════════════════

// ── Korean particle helper ──────────────────────────────────────────────────

function hasJongseong(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7AF) return false;
  return (code - 0xAC00) % 28 !== 0;
}

function particle(word, type) {
  if (!word) return word;
  const last = word[word.length - 1];
  const jong = hasJongseong(last);
  switch (type) {
    case "은는": return word + (jong ? "은" : "는");
    case "이가": return word + (jong ? "이" : "가");
    case "을를": return word + (jong ? "을" : "를");
    case "와과": return word + (jong ? "과" : "와");
    case "으로": return word + (jong ? "으로" : "로");
    default: return word;
  }
}

const LOW_SIGNAL_SUBJECT_PATTERNS = [
  /^need advice$/iu,
  /^what do you/i,
  /^what pair/i,
  /^click for more/i,
  /^thoughts?$/iu,
  /^help$/iu,
  /^question$/iu,
  /https?:\/\//i,
  /instagram|tiktok|facebook|myslink|suno\.com/i,
  /^♬/u,
  /⬇️|👀|🆙|#\s/u,
];

const SIGNAL_SUBJECT_LOCALIZATION = [
  { pattern: /\bwide[\s-]?pant(s)?\b/gi, label: "와이드팬츠" },
  { pattern: /\bshirt(s)?\b/gi, label: "셔츠" },
  { pattern: /\bjacket(s)?\b/gi, label: "자켓" },
  { pattern: /\bcoat(s)?\b/gi, label: "코트" },
  { pattern: /\bsneaker(s)?\b/gi, label: "스니커즈" },
  { pattern: /\bshoe(s)?\b/gi, label: "신발" },
  { pattern: /\bdenim|jean(s)?\b/gi, label: "데님" },
  { pattern: /\bslacks?\b|\btrouser(s)?\b/gi, label: "슬랙스" },
  { pattern: /\bblazer(s)?\b/gi, label: "블레이저" },
  { pattern: /\bcardigan(s)?\b/gi, label: "가디건" },
  { pattern: /\bhoodie(s)?\b/gi, label: "후드" },
  { pattern: /\btee(s)?\b|\bt-?shirt(s)?\b/gi, label: "티셔츠" },
  { pattern: /\bbag(s)?\b/gi, label: "가방" },
  { pattern: /\bcover\b/gi, label: "커버" },
  { pattern: /\bairport\b/gi, label: "공항패션" },
  { pattern: /\bcelebrity\b/gi, label: "연예인" },
  { pattern: /\btravel|trip|vacation|beach\b/gi, label: "여행" },
  { pattern: /\bdog|cat|pet\b/gi, label: "반려동물" },
  { pattern: /\bprice|pricing\b/gi, label: "가격" },
  { pattern: /\bsale|discount\b/gi, label: "세일" },
  { pattern: /\bstyle\b/gi, label: "스타일" },
  { pattern: /\boutfit\b/gi, label: "착장" },
  { pattern: /\boffice\b/gi, label: "오피스룩" },
];

const CATEGORY_SUBJECT_DEFAULTS = {
  fashion: ["코디", "화제 아이템", "스타일 포인트"],
  beauty: ["뷰티 아이템", "화제 사진", "오늘 본 룩"],
  celebrity: ["화제 사진", "커버 반응", "연예인 착장"],
  culture: ["화제 장면", "오늘 본 사진", "반응 갈린 포인트"],
  retail: ["세일 정보", "가격 변화", "쇼핑 포인트"],
  pricing: ["가격 변화", "세일 정보", "쇼핑 타이밍"],
  office_style: ["오피스 코디", "출근 조합", "출근룩 포인트"],
  travel: ["여행 준비", "여행 사진", "여행룩"],
  pet: ["반려동물 사진", "산책룩", "반려동물 얘기"],
  daily: ["오늘 본 글", "화제 글", "화제 포인트"],
};

function normalizeSeedText(value = "") {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#*_`~]+/g, " ")
    .replace(/[⬇️👀🆙🌖🇲🇨🦊]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countHangul(text = "") {
  return (String(text).match(/[가-힣]/g) || []).length;
}

function countLatin(text = "") {
  return (String(text).match(/[A-Za-z]/g) || []).length;
}

function isKoreanDominant(text = "") {
  const normalized = normalizeSeedText(text);
  const hangulCount = countHangul(normalized);
  if (hangulCount === 0) {
    return false;
  }
  return hangulCount >= countLatin(normalized);
}

function isLowSignalSubject(text = "") {
  const normalized = normalizeSeedText(text);
  if (!normalized) {
    return true;
  }
  if (normalized.length <= 2) {
    return true;
  }
  if (LOW_SIGNAL_SUBJECT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  return false;
}

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function extractLocalizedSeedTerms(values = []) {
  return uniqueList((Array.isArray(values) ? values : []).flatMap((value) => {
    const normalized = normalizeSeedText(value);
    if (!normalized) {
      return [];
    }
    return SIGNAL_SUBJECT_LOCALIZATION.flatMap(({ pattern, label }) => (normalized.match(pattern) ? [label] : []));
  }));
}

function pickBySeed(items = [], seed = 0) {
  if (!items.length) {
    return "";
  }
  return items[Math.abs(Number(seed) || 0) % items.length];
}

function pickFallbackSubject(discussionSeed = {}, reactionType = "general_reaction", seed = 0) {
  const categories = Array.isArray(discussionSeed.categoryTags) ? discussionSeed.categoryTags : [];
  const categoryDefaults = categories.flatMap((tag) => CATEGORY_SUBJECT_DEFAULTS[tag] || []);
  const reactionDefaults = {
    product_reaction: ["신상 아이템", "실물 후기", "이번 출시"],
    price_reaction: ["세일 정보", "가격 변화", "쇼핑 타이밍"],
    celebrity_reaction: ["화제 사진", "커버 반응", "연예인 착장"],
    season_reaction: ["날씨", "계절 코디", "오늘 코디"],
    trend_reaction: ["화제 아이템", "화제 코디", "유행 포인트"],
    comparison_reaction: ["두 조합", "비교 포인트", "고르는 기준"],
    event_reaction: ["행사 후기", "주말 일정", "이벤트 분위기"],
    general_reaction: ["화제 글", "오늘 본 글", "화제 포인트"],
  }[reactionType] || ["요즘 얘기", "오늘 본 글", "화제 포인트"];

  return pickBySeed(uniqueList([...categoryDefaults, ...reactionDefaults]), seed) || "요즘 얘기";
}

function buildSeedSubject(discussionSeed = {}, reactionType = "general_reaction", seed = 0) {
  const rawSubject = normalizeSeedText(discussionSeed.subjectKo || "");
  const rawTitle = normalizeSeedText(discussionSeed.rawTitle || "");
  const context = normalizeSeedText(discussionSeed.contextKo || "");
  const localizedTerms = extractLocalizedSeedTerms([rawSubject, rawTitle, context]);

  const directCandidates = [rawSubject, rawTitle].filter((value) => (
    value &&
    isKoreanDominant(value) &&
    !isLowSignalSubject(value) &&
    value.length <= 24
  ));
  const candidate = uniqueList([...directCandidates, ...localizedTerms])[0];
  if (candidate) {
    return candidate;
  }

  return pickFallbackSubject(discussionSeed, reactionType, seed);
}

function escapeRegExp(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeReactiveTitle(title = "", subject = "") {
  const normalizedSubject = normalizeSeedText(subject);
  let normalized = normalizeSeedText(title);

  if (!normalized) {
    return "";
  }

  if (normalizedSubject) {
    const escapedSubject = escapeRegExp(normalizedSubject);
    normalized = normalized
      .replace(new RegExp(`${escapedSubject}은`, "g"), particle(normalizedSubject, "은는"))
      .replace(new RegExp(`${escapedSubject}는`, "g"), particle(normalizedSubject, "은는"))
      .replace(new RegExp(`${escapedSubject}이`, "g"), particle(normalizedSubject, "이가"))
      .replace(new RegExp(`${escapedSubject}가`, "g"), particle(normalizedSubject, "이가"))
      .replace(new RegExp(`${escapedSubject}을`, "g"), particle(normalizedSubject, "을를"))
      .replace(new RegExp(`${escapedSubject}를`, "g"), particle(normalizedSubject, "을를"))
      .replace(new RegExp(`${escapedSubject}과`, "g"), particle(normalizedSubject, "와과"))
      .replace(new RegExp(`${escapedSubject}와`, "g"), particle(normalizedSubject, "와과"));
  }

  return normalized
    .replace(/\b요즘\s+요즘\b/gu, "요즘")
    .replace(/\b오늘\s+오늘\b/gu, "오늘")
    .replace(/갑자기\s+요즘\s+/gu, "요즘 ")
    .replace(/갑자기\s+오늘\s+/gu, "오늘 ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Reaction type title patterns ────────────────────────────────────────────
// Slots: {subject}, {context}, {angle}, {tension}

const REACTION_TITLE_PATTERNS = {
  product_reaction: [
    "{subject} 나왔는데 어떤가요",
    "{subject} 정보 아시는 분?",
    "드디어 {subject} 나왔네요",
    "{subject} 실물 보신 분 있나요?",
    "{subject} 사도 될까요?",
    "{subject} 솔직히 어때요?",
    "{subject} 전작이랑 비교하면?",
    "{subject} 이번에 괜찮은가요",
    "이번 {subject} 핏이 궁금해요",
    "{subject} 오늘 나왔던데 🔥",
    "{subject} 살까말까 고민중...",
    "{subject} 리뷰 있나요?",
    "신상 {subject} 보고왔어요",
    "{subject} 이거 어떻게 보세요?",
    "{subject} 입어본 분 후기 좀요",
  ],
  price_reaction: [
    "{subject} 이 가격이면 괜찮은 건가요?",
    "{subject} 세일 시작했네요!",
    "{subject} 가격 좀 봐주세요ㅋ",
    "{subject} 할인 정보 공유해요",
    "{subject} 가성비 어때요?",
    "요즘 {subject} 가격이 미쳤어요",
    "{subject} 이거 지금 사야 하나요?",
    "{subject} 최저가 찾았는데 공유합니다",
    "💸 {subject} 세일 뭐 건졌어요?",
    "{subject} 쿠폰 있으면 알려주세요ㅠ",
    "{subject} 가격 비교해봤어요",
    "이 정도면 {subject} 사도 되죠?",
    "{subject} 언제 사는 게 제일 싼가요?",
    "{subject} 직구 vs 국내 가격 비교",
    "{subject} 적정가가 얼마인가요",
  ],
  celebrity_reaction: [
    "{subject} 봤는데 코디 미쳤어요",
    "{subject} 스타일 따라해봤는데...",
    "{subject} 이거 뭔지 아시는 분?",
    "{subject} 공항패션 어떠세요",
    "{subject} 입은 거 브랜드 찾아요",
    "{subject} 화보 보고 영감 받았어요",
    "{subject} 보고 드레스코드 고민 중",
    "어제 {subject} 진짜 멋있었어요 😍",
    "{subject} 착용 아이템 정리해봤어요",
    "{subject} 보고 같은 거 찾는 중ㅋ",
    "{subject} 스타일 어떻게 생각하세요?",
    "{subject} 옷 정보 좀 알려주세요!",
  ],
  season_reaction: [
    "오늘 날씨에 {subject} 입어야 할까요",
    "{subject}인데 뭐 입고 나갔어요?",
    "갑자기 {subject}이라 옷이 없어요ㅠ",
    "{subject} 코디 어떻게 하세요?",
    "오늘 {subject} 진짜 미쳤다ㅋㅋ",
    "{subject}에 맞는 아우터 추천요",
    "날씨 {subject}인데 다들 반팔이에요?",
    "🌸 {subject} 나들이룩 공유해요",
    "{subject}라서 겹겹이 레이어링 했어요",
    "{subject} 대비 옷 정리 시작합니다",
    "이 날씨에 {subject} 입고 다니는 사람?",
    "요즘 {subject}라 옷장 대환장ㅋㅋ",
  ],
  trend_reaction: [
    "{subject} 요즘 되게 많이 보이던데",
    "{subject} 유행이라는데 다들 어때요?",
    "{subject} 저만 이상하게 느끼나요?ㅋ",
    "{subject} 실제로 해보신 분?",
    "검색 급상승 {subject} 뭔데 이게",
    "{subject} 요즘 왜 이렇게 핫해요?",
    "{subject} 진짜 할 만한 건가요",
    "다들 {subject} 어떻게 생각해요?",
    "{subject} 해본 후기 올려봅니다",
    "요즘 {subject} 안 하면 뒤처지는 건가요ㅋ",
    "{subject} 드디어 해봤어요!",
    "{subject} 궁금해서 올려봐요",
  ],
  comparison_reaction: [
    "{subject} 중 뭐가 더 나을까요?",
    "{subject} 비교해봤어요",
    "{subject} 고민 중인데 의견 좀요",
    "{subject} 차이가 뭔가요?",
    "{subject} 둘 다 써본 분 계신가요?",
    "{subject} 비교샷 올려봐요~~",
    "{subject} 어디서 사는 게 나을까요",
    "{subject} 실물 비교 해봤는데ㅋㅋ",
    "{subject} 사용감 비교 부탁드려요!",
    "{subject} 고르는 기준이 뭐예요?",
    "솔직히 {subject} 중 추천하자면",
    "{subject} 어떤 게 코디하기 좋아요?",
  ],
  event_reaction: [
    "{subject} 다녀왔어요!",
    "{subject} 가시는 분 복장 어때요?",
    "{subject} 후기 간단히 올려봅니다",
    "{subject} 옷 뭐 입고 가세요?",
    "{subject} 보고왔는데 꿀팁 공유",
    "{subject} 누가 갔다왔나요?",
    "이번 {subject} 진짜 대박이었어요ㅠ",
    "{subject} 준비하는 분 계세요?",
    "{subject} 드레스코드 뭐가 좋을까요",
    "주말 {subject} 가시는 분 같이 얘기해요~",
    "{subject} 갔다가 찍은 사진이에요",
    "{subject} 분위기 어떤지 궁금하시죠?",
  ],
  general_reaction: [
    "{subject} 어떻게 생각하세요?",
    "{subject} 얘기 좀 해봐요",
    "요즘 {subject} 관련 궁금한 게 있어요",
    "{subject} 경험 있으신 분?",
    "{subject} 의견 좀 들어보고 싶어요",
    "갑자기 {subject} 생각이 나서",
    "{subject} 저만 이런 건가요ㅋ",
    "다들 {subject}은 어떻게 하세요?",
    "{subject} 관련 꿀팁 있으면 공유해요",
    "{subject} 얘기하고 싶어서 올려봐요",
    "{subject} 고민인데 도와주세요ㅠ",
    "{subject} 이거 진짜인가요?",
  ],
};

// ── Reaction type body patterns ─────────────────────────────────────────────
// Slots: {subject}, {context}, {angle}, {tension}
// {nl} = newline for readability

const REACTION_BODY_PATTERNS = {
  product_reaction: [
    "{context}\n실물 보신 분 있으면 후기 좀요!\n{angle} 궁금해요",
    "오늘 {subject} 소식 봤는데 {tension}\n전작이랑 비교하면 어떨지...\n다들 의견 좀 주세요ㅎ",
    "{subject} 드디어 나왔던데\n{context}\n솔직히 {tension}\n사야 하나 말아야 하나 고민중이에요ㅋ\n{angle} 아시는 분 계시면 알려주세요!",
    "{context}\n{tension}\n근데 디자인은 진짜 예뻐요\n고민되네... 다들 어떻게 생각하세요?",
    "매장에서 {subject} 보고왔어요\n{context}\n{tension}\n핏은 괜찮은데 소재감이 좀 아쉽기도 하고\n{angle} 어떤지 알려주세요ㅎ",
    "{subject} 이번 시즌에 나왔는데\n{context}\n{tension}\n사진으로 봤을 때랑 실물이 좀 달라 보여서\n실착 해보신 분 있나요?",
  ],
  price_reaction: [
    "{context}\n{tension}\n이 가격이면 사도 되는 건지...\n비슷한 거 더 싸게 산 분 있나요?",
    "세일 정보 공유해요\n{context}\n{tension}\n카트에 담아놓고 고민 중인데ㅋ\n살까말까 도와주세요!",
    "{subject} 가격 비교해봤는데\n{context}\n{tension}\n결국 어디서 사는 게 제일 나은 건지...\n다들 어디서 사시나요?",
    "{subject} {context}\n솔직히 {tension}\n근데 비슷한 디자인이 다른 데서 더 비싸거든요\n이거 지금이 기회인가요?",
    "💸 {subject} 가격이\n{context}\n{tension}\n이거 언제 더 떨어질까요?\n아니면 지금 사야 할까요ㅠ",
    "{context}\n{tension}\n가성비로 따지면 어떤지 궁금해요\n써보신 분 후기 좀 부탁드립니다!",
  ],
  celebrity_reaction: [
    "{subject} 스타일 봤는데 진짜 예뻐요ㅠ\n{context}\n따라해보고 싶은데 현실은..ㅋㅋ\n{angle} 어디 브랜드인지 아시는 분?",
    "어제 {subject} 봤는데\n{context}\n{tension}\n비슷한 느낌 연출하려면 뭘 사야 하나요?\n예산은 10~20만원 정도인데...",
    "{subject} 착장 분석해봤어요\n{context}\n핵심은 {angle}인 것 같아요\n비슷한 분위기 코디 하시는 분 팁 좀요!",
    "{context}\n{subject} 스타일 진짜 꾸안꾸의 정석\n{tension}\n얼굴이 해야 할 일이 절반인듯ㅋㅋ\n그래도 컬러 조합은 참고할 만해요!",
  ],
  season_reaction: [
    "오늘 {subject}이라 옷 고르다 멘붕ㅋㅋ\n{context}\n{tension}\n다들 오늘 뭐 입고 나갔어요?\n레이어링 꿀팁 있으면 공유해주세요!",
    "{subject} 날씨에 딱 맞는 코디 찾는 중\n{context}\n{tension}\n아침이랑 낮이랑 온도차가 너무 커서...\n가디건? 자켓? 뭐가 나을까요",
    "{context}\n{subject}라서 옷장 정리 시작했어요\n{tension}\n계절 바뀔 때마다 입을 게 없는 건 저만 그런 건가요ㅠ\n{angle} 추천해주세요!",
    "🌤 오늘 {subject}\n{context}\n{tension}\n이런 날 나들이 가면 뭐 입으세요?\n가볍게 입기 좋은 아우터 추천 부탁!",
  ],
  trend_reaction: [
    "{subject} 요즘 되게 많이 보이던데\n{context}\n{tension}\n실제로 해본 분 있으면 후기 좀 부탁드려요!\n잘못하면 애매해질 것 같아서...",
    "검색 급상승이라 찾아봤는데\n{context}\n{subject}인데 {tension}\n다들 이거 어떻게 생각하세요?\n유행 따라가야 하나 말아야 하나ㅋ",
    "{subject} 요즘 핫하길래 도전해봤어요\n{context}\n{tension}\n근데 이게 나한테 맞는 건지 모르겠음ㅋㅋ\n비슷하게 해보신 분 조언 좀요!",
    "{context}\n{subject} 유행이라는데\n{tension}\n솔직히 호불호 갈릴 것 같은데 여러분은?\n저는 개인적으로 괜찮아 보이는데...",
  ],
  comparison_reaction: [
    "{subject} 비교하다 보니 보기보다 기준이 확 갈리네요\n{context}\n{tension}\n둘 다 써본 분 계시면 의견 좀 부탁드려요!",
    "{subject} 고민 중인데\n{context}\n{tension}\n결국 뭘로 가야 할지...\n비슷한 고민 하신 분 어떻게 결정하셨어요?",
    "{subject} 실제로 비교해봤어요\n{context}\n{tension}\n핏은 A가 좋고 소재는 B가 좋고 가격은...\n종합하면 뭐가 나은 건지 의견 좀요ㅎ",
    "비교 후기 올려봅니다\n{subject}\n{context}\n{tension}\n둘 다 장단점이 있어서 고민이에요\n어떤 쪽을 더 중요하게 보세요?",
  ],
  event_reaction: [
    "{subject} 다녀왔어요!\n{context}\n{tension}\n생각보다 사람 많았는데 분위기 좋았어요\n혹시 가시는 분 있으면 참고하세요~",
    "{subject} 가는데 뭐 입고 가야 할지 모르겠어요\n{context}\n{tension}\n너무 격식 차린 것도 그렇고 너무 캐주얼한 것도 그렇고\n다들 어떤 스타일로 가세요?",
    "{subject} 후기 간단히 올려봅니다\n{context}\n{tension}\n전체적으로 만족이었어요\n갔다가 찍은 사진도 올릴게요ㅎ",
    "이번 {subject} 진짜 대박\n{context}\n{tension}\n아직 안 가신 분들 꼭 가보세요!\n시간 되면 주말에 한번 더 갈 예정ㅎㅎ",
  ],
  general_reaction: [
    "{subject}에 대해 좀 얘기해봐요\n{context}\n{tension}\n저만 이렇게 느끼는 건지 궁금해서 올려봅니다\n다들 의견 있으면 댓글로!",
    "요즘 {subject} 생각이 많아져서\n{context}\n{tension}\n비슷한 경험 있으신 분 계시면 공유해주세요ㅎ",
    "{context}\n{subject} 관련해서 궁금한 게 있어요\n{tension}\n아시는 분 있으면 알려주세요!\n검색해도 잘 안 나오네요ㅠ",
    "갑자기 {subject} 생각이 나서 올려봐요\n{context}\n{tension}\n저만 이런 건가요ㅋㅋ\n비슷한 분 있으면 같이 얘기해요~",
  ],
};

// ── Extended archetype voice system ─────────────────────────────────────────

const ARCHETYPE_VOICE = {
  quiet_observer: {
    intros: [null, null, "이거는 그냥 지나치기 어려워서 바로 적어봐요\n", "오늘은 이 얘기가 먼저 눈에 들어오네요\n"],
    midMarkers: ["개인적으로는", "솔직히 잘 모르겠는데", "조심스럽지만", "이건 좀"],
    closings: ["다들 어떻게 생각하세요?", "의견 궁금해요", "조용히 듣고 있을게요ㅎ", "답글 달아주시면 감사해요"],
    emojiFreq: 0.1,
  },
  social_participant: {
    intros: [null, "같이 보기 좋은 얘기라 먼저 올려봐요\n", null, "이건 바로 댓글 붙을 것 같더라고요\n", "오늘 이거 보고 바로 찾아봤어요\n"],
    midMarkers: ["근데 진짜", "아 그리고", "참고로", "저는 사실"],
    closings: ["다들 의견 남겨주세요!", "같이 고민해봐요~", "댓글 기다릴게요ㅎ", "비슷한 분 있으면 ✋"],
    emojiFreq: 0.3,
  },
  trend_setter: {
    intros: [null, "요즘 자꾸 보여서 저도 바로 체크해봤어요\n", null, "이건 한번쯤 직접 봐야겠더라고요\n"],
    midMarkers: ["확실히", "솔직히 이건", "요즘 트렌드가", "제가 보기엔"],
    closings: ["먼저 해본 후기입니다ㅎ", "궁금한 거 있으면 물어보세요!", "참고하세요~ 🔥", "이건 진짜 추천"],
    emojiFreq: 0.4,
  },
  contrarian_observer: {
    intros: [null, "저는 여기서 다른 포인트가 먼저 보였어요\n", null, "좋다는 반응 많던데 저는 이쪽이 더 걸리네요\n", "같은 글이어도 저는 다르게 읽히더라고요\n"],
    midMarkers: ["근데 이게 진짜", "오히려", "반대로 보면", "솔직히 말해서"],
    closings: ["저만 이렇게 보나요ㅋ", "다른 의견 있으면 말해주세요", "아닌가... 그냥 제 생각입니다", "반박 환영이에요"],
    emojiFreq: 0.1,
  },
  empathetic_responder: {
    intros: [null, "이 얘기는 저도 바로 공감되더라고요\n", null, "보자마자 저도 비슷한 경험이 떠올랐어요\n", "이 부분은 저도 그냥 지나치기 어렵네요\n"],
    midMarkers: ["저도 그랬었는데", "공감 가네요", "이해해요 진짜", "비슷한 상황이었어요"],
    closings: ["힘내세요 ㅎㅎ", "같이 고민해봐요ㅠ", "도움이 됐으면 좋겠어요", "비슷한 분들 화이팅! 💪"],
    emojiFreq: 0.25,
  },
  brand_loyalist: {
    intros: [null, "이쪽은 신상 뜨면 일단 보게 되더라고요\n", null, "이번에도 먼저 체크하게 됐어요\n"],
    midMarkers: ["역시", "이건 진짜", "이 브랜드는 확실히", "항상 느끼는 건데"],
    closings: ["이 브랜드 진짜 찐이에요", "역시 믿고 사는 브랜드", "추천합니다 강추 🔥", "후회 없을 거예요"],
    emojiFreq: 0.2,
  },
};

const REACTION_OPENERS = {
  product_reaction: [
    "{subject} 뜬 거 보고 실물 얘기부터 찾게 되네요",
    "{subject} 소식 보자마자 후기부터 궁금해졌어요",
    "{subject}는 바로 입어본 사람 말이 듣고 싶더라고요",
  ],
  price_reaction: [
    "{subject}는 가격 뜨자마자 계산기부터 켜게 되네요",
    "{subject}는 세일 붙은 순간 얘기가 달라지더라고요",
    "{subject}는 예쁜 것보다 가격부터 보게 됐어요",
  ],
  celebrity_reaction: [
    "{subject}는 사진 뜨자마자 저장부터 하게 되네요",
    "{subject}는 오늘 반응이 어디서 갈리는지 바로 보이더라고요",
    "{subject}는 보고 나면 아이템부터 찾게 돼요",
  ],
  season_reaction: [
    "{subject} 얘기는 오늘 옷 고를 때 바로 떠오르네요",
    "{subject}라서 다들 뭘 입는지 궁금해졌어요",
    "{subject}만 되면 코디 얘기가 바로 붙더라고요",
  ],
  trend_reaction: [
    "{subject}는 요즘 자꾸 보여서 한번은 얘기하게 되네요",
    "{subject}는 다들 어디서 꽂히는지 궁금했어요",
    "{subject}는 실제로 해본 사람 말이 제일 궁금하더라고요",
  ],
  comparison_reaction: [
    "{subject}는 같이 놓고 봐야 차이가 보이더라고요",
    "{subject}는 비교해보면 기준이 바로 갈리네요",
    "{subject}는 결국 뭐부터 보는지가 다를 것 같아요",
  ],
  event_reaction: [
    "{subject}는 뜨자마자 일정부터 다시 보게 되네요",
    "{subject}는 다녀온 사람 얘기가 바로 궁금해졌어요",
    "{subject}는 분위기부터 먼저 체크하게 돼요",
  ],
  general_reaction: [
    "{subject}는 그냥 넘기기보다 한 번 더 보게 되네요",
    "{subject}는 딱 보고 바로 말 붙이고 싶었어요",
    "{subject}는 다들 어디서 걸리는지 궁금하더라고요",
  ],
};

const EMOJIS = ["😊", "ㅎㅎ", "ㅋㅋ", "ㅠㅠ", "🔥", "✌️", "💸", "😍", "👍", "🏕", "🌸", "💪", "🐶", "🎉", ""];

// ── Compositional generator ─────────────────────────────────────────────────

/**
 * Generate a unique community post by combining an external discussion seed
 * with agent personality. Produces unlimited diversity.
 *
 * @param {object} params
 * @param {number} params.seed - Deterministic variation seed
 * @param {object} params.agent - Agent with archetype, interest_vector
 * @param {object} params.discussionSeed - External signal seed
 * @param {string} params.discussionSeed.subjectKo - Main subject (e.g., "나이키 에어맥스 DN8")
 * @param {string} params.discussionSeed.contextKo - Context (e.g., "4월 5일 출시, 189,000원")
 * @param {string} params.discussionSeed.tensionPoint - Tension (e.g., "가격이 좀 오른 것 같은데")
 * @param {string[]} params.discussionSeed.possibleAngles - Discussion angles
 * @param {string} params.discussionSeed.reactionType - One of 8 reaction types
 * @param {string[]} params.discussionSeed.categoryTags - Topic tags
 * @param {string[]} [params.recentBodies] - Recent post bodies to avoid
 * @returns {{ title: string, content: string, tags: string[] }}
 */
export function generateSignalReactivePost({ seed = 0, agent = {}, discussionSeed = {}, recentBodies = [] }) {
  const rng = seededRandom(seed);

  const reactionType = discussionSeed.reactionType || "general_reaction";
  const subject = buildSeedSubject(discussionSeed, reactionType, seed);
  const context = discussionSeed.contextKo || "";
  const tension = discussionSeed.tensionPoint || "좀 고민이 되네요";
  const angles = discussionSeed.possibleAngles || [];
  const angle = angles.length > 0 ? angles[Math.floor(rng() * angles.length)] : "자세한 후기";

  // Pick title pattern
  const titlePatterns = REACTION_TITLE_PATTERNS[reactionType] || REACTION_TITLE_PATTERNS.general_reaction;
  const titlePattern = titlePatterns[Math.floor(rng() * titlePatterns.length)];

  // Pick body pattern
  const bodyPatterns = REACTION_BODY_PATTERNS[reactionType] || REACTION_BODY_PATTERNS.general_reaction;
  const bodyPattern = bodyPatterns[Math.floor(rng() * bodyPatterns.length)];

  // Fill slots
  const fillSlots = (template) => template
    .replace(/\{subject\}/g, subject)
    .replace(/\{context\}/g, context)
    .replace(/\{tension\}/g, tension)
    .replace(/\{angle\}/g, angle);

  let title = normalizeReactiveTitle(fillSlots(titlePattern), subject);
  let body = fillSlots(bodyPattern);

  // Apply archetype voice
  const archetype = agent.archetype || "quiet_observer";
  const voice = ARCHETYPE_VOICE[archetype] || ARCHETYPE_VOICE.quiet_observer;
  const reactionOpeners = REACTION_OPENERS[reactionType] || REACTION_OPENERS.general_reaction;
  const opener = fillSlots(reactionOpeners[Math.floor(rng() * reactionOpeners.length)]);

  // Family-specific opener keeps the post grounded in the concrete signal.
  if (opener) {
    body = `${opener}\n${body}`;
  }

  // Mid-marker injection (40% chance, insert after first newline)
  if (rng() < 0.4) {
    const marker = voice.midMarkers[Math.floor(rng() * voice.midMarkers.length)];
    const firstNl = body.indexOf("\n");
    if (firstNl > 0) {
      body = body.slice(0, firstNl + 1) + marker + " " + body.slice(firstNl + 1);
    }
  }

  // Closing (70% chance)
  if (rng() < 0.7) {
    const closing = voice.closings[Math.floor(rng() * voice.closings.length)];
    body = body.trimEnd() + "\n" + closing;
  }

  // Emoji insertion (based on archetype frequency)
  if (rng() < voice.emojiFreq) {
    const emoji = EMOJIS[Math.floor(rng() * EMOJIS.length)];
    if (emoji && !title.includes(emoji)) {
      // Sometimes add to title, sometimes to body end
      if (rng() < 0.3) {
        title = title + " " + emoji;
      } else {
        body = body.trimEnd() + " " + emoji;
      }
    }
  }

  // Dedup check
  const recentSet = new Set((recentBodies || []).map(b => (b || "").slice(0, 40)));
  if (recentSet.has(body.slice(0, 40))) {
    // Re-pick body pattern to try to avoid collision
    const altIdx = (Math.floor(rng() * bodyPatterns.length) + 1) % bodyPatterns.length;
    body = fillSlots(bodyPatterns[altIdx]);
  }

  // Build tags from seed
  const tags = (discussionSeed.categoryTags || []).slice(0, 3);
  if (tags.length === 0 && subject.length <= 10) {
    tags.push(subject);
  }

  return { title, content: body, tags };
}

// ── Unified entry point ─────────────────────────────────────────────────────

/**
 * Smart post generator: uses discussionSeed if available (infinite diversity),
 * falls back to fixed templates otherwise.
 *
 * @param {object} params
 * @param {object} params.agent - Agent with archetype, interest_vector, handle
 * @param {number} [params.seed] - Variation seed
 * @param {string[]} [params.recentBodies] - Recent bodies for dedup
 * @param {object} [params.discussionSeed] - External signal seed (optional)
 * @returns {{ title: string, content: string, tags: string[] }}
 */
export function generatePost({ agent, seed = 0, recentBodies = [], discussionSeed = null }) {
  if (discussionSeed && discussionSeed.subjectKo) {
    return generateSignalReactivePost({ seed, agent, discussionSeed, recentBodies });
  }
  return generateCommunityPost({ agent, seed, recentBodies });
}

// ── Utilities ───────────────────────────────────────────────────────────────

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
