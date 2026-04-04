function normalizeText(value = "") {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 1);
}

export function jaccard(left = "", right = "") {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

export function countHangul(text) {
  return (String(text).match(/[가-힣]/g) || []).length;
}

export function countLatin(text) {
  return (String(text).match(/[A-Za-z]/g) || []).length;
}

export function isNaturalLanguage(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return countHangul(normalized) + countLatin(normalized) > 8;
}

const HARD_FAIL_PHRASES = [
  "이 에이전트가",
  "현재 주제 흐름",
  "prompt",
  "agent",
  "operator",
  "workflow",
  "moderation",
  "judge",
];

const ESSAYISH_PHRASES = [
  "생활감",
  "장면",
  "됩니다",
  "실용적인 기준",
  "읽히는 느낌",
  "오래 남는 타입",
  "기억이 정리됩니다",
  "다시 읽어보니",
  "더 현실적으로 보여요",
];

const EMOTION_CUE_GROUPS = {
  curiosity: ["궁금", "왜", "어떻게", "알고 싶", "신기", "흥미", "궁금해"],
  empathy: ["공감", "마음", "이해", "위로", "배려", "따뜻", "같이", "다행", "괜찮", "신경 쓰", "마음이 가"],
  amusement: ["웃기", "재밌", "귀엽", "ㅋㅋ", "ㅎㅎ", "유쾌", "웃음", "재치", "피식"],
  sadness: ["아쉽", "슬프", "허전", "씁쓸", "속상", "외롭", "먹먹", "아쉬움"],
  anger: ["화나", "답답", "짜증", "억울", "별로", "불편", "실망", "불만", "거슬"],
  relief: ["다행", "안심", "무난", "괜찮", "덜", "편해", "안도", "한숨 놓"],
  anticipation: ["기대", "다음", "보고 싶", "기다려", "앞으로", "이어지", "궁금해져", "기대돼"],
  surprise: ["의외", "생각보다", "뜻밖", "놀라", "새롭", "반전", "낯설"],
};

function countEmotionSignals(text = "") {
  const normalized = String(text || "");
  const distinctHits = Object.entries(EMOTION_CUE_GROUPS).reduce((acc, [emotion, phrases]) => {
    const hasHit = phrases.some((phrase) => normalized.includes(phrase));
    if (hasHit) acc.push(emotion);
    return acc;
  }, []);

  return {
    distinctHits,
    coverage: distinctHits.length / Object.keys(EMOTION_CUE_GROUPS).length,
  };
}

function countEssayishSignals(text = "") {
  const normalized = String(text || "");
  return ESSAYISH_PHRASES.filter((phrase) => normalized.includes(phrase)).length;
}

function normalizeList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeText(value)).filter(Boolean))];
}

const SOURCE_TERM_PATTERNS = [
  { pattern: /\bpastel aqua\b/gi, label: "파스텔 아쿠아" },
  { pattern: /\bcream\b/gi, label: "크림" },
  { pattern: /\bshirt(s)?\b/gi, label: "셔츠" },
  { pattern: /\btee(s)?\b/gi, label: "티셔츠" },
  { pattern: /\bblazer(s)?\b/gi, label: "블레이저" },
  { pattern: /\bjacket(s)?\b/gi, label: "자켓" },
  { pattern: /\bcoat(s)?\b/gi, label: "코트" },
  { pattern: /\bdress(es)?\b/gi, label: "드레스" },
  { pattern: /\bbag(s)?\b/gi, label: "가방" },
  { pattern: /\bshoe(s)?\b/gi, label: "신발" },
  { pattern: /\bsneaker(s)?\b/gi, label: "스니커즈" },
  { pattern: /\btrouser(s)?\b/gi, label: "트라우저" },
  { pattern: /\bpant(s)?\b/gi, label: "팬츠" },
  { pattern: /\bskirt(s)?\b/gi, label: "스커트" },
  { pattern: /\bjean(s)?\b/gi, label: "데님" },
  { pattern: /\baccessor(y|ies)\b/gi, label: "액세서리" },
  { pattern: /\blayering\b/gi, label: "레이어링" },
  { pattern: /\boffice wear\b/gi, label: "오피스룩" },
  { pattern: /\boffice style\b/gi, label: "오피스 스타일" },
  { pattern: /\boffice\b/gi, label: "오피스" },
  { pattern: /\bfit\b/gi, label: "핏" },
  { pattern: /\bsize|sizing\b/gi, label: "사이즈" },
  { pattern: /\bprice|pricing\b/gi, label: "가격" },
  { pattern: /\bcolor\b/gi, label: "색감" },
  { pattern: /\bstyle\b/gi, label: "스타일" },
  { pattern: /\boutfit\b/gi, label: "착장" },
  { pattern: /\bootd\b/gi, label: "OOTD" },
  { pattern: /\bcover\b/gi, label: "커버" },
  { pattern: /\belle\b/gi, label: "ELLE" },
  { pattern: /\bsofia coppola\b/gi, label: "소피아 코폴라" },
];

function stripSourceNoise(text = "") {
  return normalizeText(
    String(text || "")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\b\w+\.(com|net|org|co\.jp|jp|kr)\/\S*/gi, " ")
      .replace(/[#@][\p{L}\p{N}_-]+/gu, " ")
      .replace(/\s+/g, " "),
  );
}

function localizeTopicLabelLocal(topic = "") {
  const label = normalizeText(topic);
  if (!label) return "";
  const directMap = {
    fashion: "패션",
    style: "스타일",
    opinion: "의견",
    color: "색감",
    office_style: "오피스 스타일",
    accessories: "액세서리",
    dress: "드레스",
    bottoms: "하의",
    casualwear: "캐주얼",
    streetwear: "스트리트웨어",
    layering: "레이어링",
    outerwear: "아우터",
    price: "가격",
    sizing_fit: "사이즈와 핏",
    ootd: "OOTD",
    jfashion: "일본 패션",
  };
  return directMap[label] || label.replace(/_/g, " ");
}

function joinLabels(labels = []) {
  const items = normalizeList(labels);
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}와 ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}와 ${items[items.length - 1]}`;
}

function extractSourceTerms(text = "", topics = []) {
  const normalized = stripSourceNoise(text);
  const labels = SOURCE_TERM_PATTERNS.flatMap(({ pattern, label }) => (
    normalized.match(pattern) ? [label] : []
  ));
  const topicLabels = (Array.isArray(topics) ? topics : []).map((topic) => localizeTopicLabelLocal(topic));
  return normalizeList([...labels, ...topicLabels]).slice(0, 6);
}

function splitSourceSentences(text = "") {
  return stripSourceNoise(text)
    .split(/(?<=[.!?？])\s+/)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);
}

function pickSourceSentence(sentences = [], matcher) {
  return sentences.find((sentence) => matcher(sentence)) || "";
}

function buildTopicFallback(topics = [], fallback = "이 글") {
  const labels = (Array.isArray(topics) ? topics : []).map((topic) => localizeTopicLabelLocal(topic)).filter(Boolean);
  return joinLabels(labels.slice(0, 2)) || fallback;
}

function hasQuestionOrComparison(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  return (
    /[?？]/.test(normalized) ||
    /(what|which|how|need advice|pair with|goes with|thoughts|think|recommend|better|vs|versus|choose|advice)/i.test(normalized) ||
    /(어떤|어느|뭐가|뭐|어떻게|조언|추천|비교|둘 중|중에서|vs|vs\.|괜찮|어울|궁금)/.test(normalized)
  );
}

function scoreAnchorPreservation({
  text = "",
  sourceIntent = "",
  sourceAnchorTerms = [],
  sourceTopics = [],
  concreteAnchor = false,
  hasQuestion = false,
} = {}) {
  const normalizedText = normalizeText(text).toLowerCase();
  const normalizedTerms = normalizeList(sourceAnchorTerms).map((term) => term.toLowerCase());
  const normalizedTopics = normalizeList(sourceTopics).map((topic) => topic.toLowerCase());
  const anchorHits = normalizedTerms.filter((term) => term && normalizedText.includes(term)).length;
  const topicHits = normalizedTopics.filter((topic) => topic && normalizedText.includes(topic)).length;
  const anchorCoverage = normalizedTerms.length ? anchorHits / normalizedTerms.length : 0;
  const topicCoverage = normalizedTopics.length ? topicHits / normalizedTopics.length : 0;

  let intentFit = 0.34;
  if (sourceIntent === "question") {
    intentFit = hasQuestion ? 1 : 0.28;
  } else if (sourceIntent === "comparison") {
    intentFit = /(비교|둘 중|어느 쪽|중 뭐가|더 나을까|vs|versus|같이 보면|다르게 읽)/.test(normalizedText) ? 1 : 0.32;
  } else if (sourceIntent === "controversy") {
    intentFit = /(의견|반응이 갈|갈릴|호불호|논쟁|불편|다르게 읽)/.test(normalizedText) ? 1 : 0.28;
  } else if (sourceIntent === "fact") {
    intentFit = concreteAnchor ? 0.88 : /(기사|커버|발표|보도|내용|신호|사진|패션|가격|색감|오피스)/.test(normalizedText) ? 0.8 : 0.34;
  } else if (sourceIntent === "reason") {
    intentFit = /(이유|왜|근거|배경)/.test(normalizedText) ? 1 : 0.3;
  } else if (sourceIntent === "discussion") {
    intentFit = concreteAnchor ? 0.7 : 0.42;
  } else {
    intentFit = concreteAnchor ? 0.62 : 0.38;
  }

  return clamp(
    0.22 +
      anchorCoverage * 0.34 +
      topicCoverage * 0.12 +
      intentFit * 0.26 +
      (concreteAnchor ? 0.06 : 0.02),
  );
}

function scoreClaimSurface({
  text = "",
  sourceIntent = "",
  sourceAnchorTerms = [],
  sourceTopics = [],
  concreteAnchor = false,
  hasQuestion = false,
} = {}) {
  const normalizedText = normalizeText(text).toLowerCase();
  const normalizedTerms = normalizeList(sourceAnchorTerms).map((term) => term.toLowerCase());
  const normalizedTopics = normalizeList(sourceTopics).map((topic) => topic.toLowerCase());
  const anchorHits = normalizedTerms.filter((term) => term && normalizedText.includes(term)).length;
  const topicHits = normalizedTopics.filter((topic) => topic && normalizedText.includes(topic)).length;
  const anchorCoverage = normalizedTerms.length ? anchorHits / normalizedTerms.length : 0;
  const topicCoverage = normalizedTopics.length ? topicHits / normalizedTopics.length : 0;

  let directClaim = 0.2;
  if (sourceIntent === "question") {
    directClaim = /(궁금|어느|어떤|뭐가|어떻게|질문|조언|추천|비교|둘 중|중 뭐가)/.test(normalizedText) ? 1 : 0.18;
  } else if (sourceIntent === "comparison") {
    directClaim = /(비교|둘 중|어느 쪽|중 뭐가|vs|versus|차이|다르게 읽|갈려)/.test(normalizedText) ? 1 : 0.16;
  } else if (sourceIntent === "controversy") {
    directClaim = /(의견|반응|갈리|호불호|논쟁|반대|불편|다르게 읽)/.test(normalizedText) ? 1 : 0.16;
  } else if (sourceIntent === "fact") {
    directClaim = /(기사|커버|발표|내용|신호|사진|가격|색감|핏|사이즈|오피스|아이템|브랜드)/.test(normalizedText) ? 1 : 0.18;
  } else if (sourceIntent === "reason") {
    directClaim = /(이유|왜|근거|배경|기준)/.test(normalizedText) ? 1 : 0.2;
  } else {
    directClaim = concreteAnchor ? 0.62 : 0.24;
  }

  const openingForce = hasQuestion || directClaim > 0.6 ? 1 : 0.26;

  return clamp(
    0.16 +
      anchorCoverage * 0.24 +
      topicCoverage * 0.08 +
      openingForce * 0.26 +
      directClaim * 0.24 +
      (concreteAnchor ? 0.08 : 0.03),
  );
}

function hasConcreteAnchor(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  return (
    /(shirt|shirted|shirting|shirt(s)?|shoes?|pants?|trousers?|bag(s)?|dress(es)?|jacket(s)?|coat(s)?|fit|size|price|color|layer|layering|office|ootd|style|outfit|sizing|accessories|패션|핏|사이즈|가격|색감|아우터|레이어링|오피스|코디|착장|가방|셔츠|바지|원피스|자켓|코트|신발|액세서리)/.test(normalized)
  );
}

export function classifySourceIntent({ title = "", body = "", topics = [] } = {}) {
  const text = `${normalizeText(title)} ${normalizeText(body)} ${Array.isArray(topics) ? topics.join(" ") : ""}`.trim();
  const lowered = text.toLowerCase();

  if (/(?:\bvs\.?\b|\bversus\b|\bbetter\b|\bcompare\b|\bcomparison\b|\beither\b|\bor\b)/i.test(lowered) || /둘 중|어느 쪽|비교/.test(text)) {
    return "comparison";
  }

  if (/(what do you all think|what do you think|thoughts|opinion|need advice|advice|how do you|how would you|which one|which is better|pair with|what goes with|what to wear with|should i|should we)/i.test(lowered)) {
    return "question";
  }

  if (/(debate|controversy|controversial|split|hot take|disagree|argument|drama|논쟁|반응이 갈리|호불호)/i.test(lowered)) {
    return "controversy";
  }

  if (/(news|article|report|covered|released|launch|announced|cover looks|define effortless style|엘레|커버|기사|보도|발표)/i.test(lowered)) {
    return "fact";
  }

  if (/(why|reason|because|why this|why it|why do)/i.test(lowered) || /왜|이유|근거/.test(text)) {
    return "reason";
  }

  if (hasQuestionOrComparison(text)) {
    return "question";
  }

  if (hasConcreteAnchor(text)) {
    return "observation";
  }

  return "discussion";
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scoreCommunityDraft(item) {
  const content = String(item.content || "");
  const title = String(item.title || "");
  const text = `${title} ${content}`.trim();
  const sourceIntent = normalizeText(item.sourceIntent || "").toLowerCase();
  const sourceAnchorTerms = Array.isArray(item.sourceAnchorTerms) ? item.sourceAnchorTerms : [];
  const sourceTopics = Array.isArray(item.sourceTopics) ? item.sourceTopics : [];
  const tokens = tokenize(text);
  const uniqueRatio = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const length = content.length;
  const hasQuestion = hasQuestionOrComparison(text);
  const hasHookWords = /(같이|왜|어떻게|느껴|보이|궁금|달라|이유|생각|어느|비교|다른 쪽|한 번 더|먼저 보인|답이)/.test(text);
  const hasHardFailPhrase = HARD_FAIL_PHRASES.some((phrase) => text.includes(phrase));
  const repeatedFirstTokens = tokens.slice(0, 4).join(" ");
  const emotionSignals = countEmotionSignals(text);
  const essayishSignals = countEssayishSignals(text);
  const concreteAnchor = hasConcreteAnchor(text);
  const anchorPreservation = scoreAnchorPreservation({
    text,
    sourceIntent,
    sourceAnchorTerms,
    sourceTopics,
    concreteAnchor,
    hasQuestion,
  });
  const claimSurface = scoreClaimSurface({
    text,
    sourceIntent,
    sourceAnchorTerms,
    sourceTopics,
    concreteAnchor,
    hasQuestion,
  });
  const humanLikeLength = length >= 25 && length <= 260 ? 1 : length < 25 ? 0.28 : 0.64;
  const communityFit = clamp(
    0.34 +
      (hasQuestion ? 0.24 : 0) +
      (hasHookWords ? 0.18 : 0) +
      (concreteAnchor ? 0.12 : 0) +
      (item.kind === "comment" ? 0.16 : 0.08) -
      essayishSignals * 0.06,
  );
  const emotionBelievability = clamp(
    0.2 +
      emotionSignals.coverage * 0.42 +
      (emotionSignals.distinctHits.length >= 2 ? 0.12 : 0.04) +
      (item.kind === "comment" ? 0.08 : 0.04) +
      (hasHardFailPhrase ? -0.14 : 0),
  );
  const humanLikeness = clamp(
    humanLikeLength * 0.3 +
      uniqueRatio * 0.22 +
      (isNaturalLanguage(text) ? 0.18 : 0.05) +
      (concreteAnchor ? 0.08 : 0.03) +
      (hasHardFailPhrase ? 0 : 0.16) -
      essayishSignals * 0.05,
  );
  const socialPull = clamp(
    0.22 +
      (hasQuestion ? 0.24 : 0) +
      (hasHookWords ? 0.16 : 0) +
      (concreteAnchor ? 0.12 : 0) +
      (item.kind === "comment" ? 0.18 : 0.12) +
      (content.includes("같이") ? 0.08 : 0),
  );
  const variety = clamp(
    uniqueRatio * 0.46 +
      (repeatedFirstTokens.split(" ").length >= 3 ? 0.12 : 0.02) +
      (hasHardFailPhrase ? 0 : 0.28) -
      essayishSignals * 0.03,
  );
  const consistency = clamp(
    0.5 +
      (item.authorDisplayName ? 0.08 : 0) +
      (item.authorType === "agent" ? 0.06 : 0) +
      (item.replyTargetType ? 0.1 : 0.04),
  );

  const overall_score = clamp(
    humanLikeness * 0.3 +
      socialPull * 0.22 +
      variety * 0.16 +
      consistency * 0.1 +
      communityFit * 0.08 +
      emotionBelievability * 0.05 +
      anchorPreservation * 0.06 +
      claimSurface * 0.12,
  );

  const verdict = hasHardFailPhrase
    ? "fail"
    : overall_score >= 0.72
      ? "pass"
      : overall_score >= 0.52
        ? "needs_revision"
        : "fail";

  const issues = [];
  if (hasHardFailPhrase) issues.push("Contains internal/system-like phrases.");
  if (uniqueRatio < 0.46) issues.push("Lexical variety is low.");
  if (length < 35) issues.push("Content is very short.");
  if (length > 260) issues.push("Content is a bit long for a feed item.");
  if (!hasQuestion && !hasHookWords) issues.push("Social hook is weak.");
  if (emotionBelievability < 0.42) issues.push("Emotional signal is thin.");
  if (essayishSignals > 0) issues.push("Language feels too essay-like or abstract.");
  if (anchorPreservation < 0.42) issues.push("Concrete source anchors are weak.");
  if (claimSurface < 0.38) issues.push("Source claim is too abstract or flattened.");

  const strengths = [];
  if (hasQuestion) strengths.push("Has a reply-inviting question or comparison.");
  if (hasHookWords) strengths.push("Contains a conversational hook.");
  if (concreteAnchor) strengths.push("Keeps a concrete content anchor.");
  if (anchorPreservation >= 0.68) strengths.push("Preserves concrete source anchors.");
  if (claimSurface >= 0.68) strengths.push("Keeps the source claim visible.");
  if (emotionSignals.distinctHits.length > 0) strengths.push(`Emotion cues present: ${emotionSignals.distinctHits.join(", ")}.`);
  if (isNaturalLanguage(text)) strengths.push("Reads like natural language.");
  if (!hasHardFailPhrase) strengths.push("Avoids obvious system-language leakage.");

  return {
    id: item.id || null,
    kind: item.kind || "post",
    author: item.authorDisplayName || null,
    overall_score,
    verdict,
    dimension_scores: {
      human_likeness: humanLikeness,
      social_pull: socialPull,
      variety,
      consistency,
      community_fit: communityFit,
      emotional_believability: emotionBelievability,
      anchor_preservation: anchorPreservation,
      claim_surface: claimSurface,
    },
    summary:
      verdict === "pass"
        ? "Feels human, specific, and thread-worthy."
        : verdict === "needs_revision"
          ? "Usable, but repetition or hook strength could be improved."
          : "Too repetitive, synthetic, or low-signal for the community feed.",
    strengths,
    issues,
    signals: {
      question_like: hasQuestion,
      concrete_anchor: concreteAnchor,
      essayish_count: essayishSignals,
      emotion_hits: emotionSignals.distinctHits,
      claim_surface: claimSurface,
    },
  };
}

export function deriveDiscussionAnchors({ title = "", body = "", topics = [] } = {}) {
  const intent = classifySourceIntent({ title, body, topics });
  const normalizedTopics = Array.isArray(topics) ? topics.map((topic) => normalizeText(topic)).filter(Boolean) : [];
  const topicLabel = buildTopicFallback(normalizedTopics, "이 글");
  const secondaryTopic = localizeTopicLabelLocal(normalizedTopics[1] || normalizedTopics[0] || "") || topicLabel;
  const sourceText = stripSourceNoise(`${title} ${body}`);
  const sourceTitle = stripSourceNoise(title);
  const sourceBody = stripSourceNoise(body);
  const sourceTerms = extractSourceTerms(sourceText, normalizedTopics);
  const sourceSentences = splitSourceSentences(`${sourceTitle}. ${sourceBody}`);
  const concreteSourceLine = [sourceTitle, ...sourceSentences]
    .map((entry) => normalizeText(entry))
    .find((entry) => entry && entry.length >= 8 && entry.length <= 80) || "";
  const baseAnchor = joinLabels(sourceTerms.slice(0, 2)) || topicLabel;
  const comparisonPair = joinLabels(sourceTerms.slice(0, 2)) || joinLabels([topicLabel, secondaryTopic]);
  const questionSentence = pickSourceSentence(sourceSentences, (sentence) => hasQuestionOrComparison(sentence));
  const comparisonSentence = pickSourceSentence(
    sourceSentences,
    (sentence) => /(better|vs|versus|which|pair with|goes with|what to wear with|둘 중|비교|어느 쪽)/i.test(sentence),
  );
  const controversySentence = pickSourceSentence(
    sourceSentences,
    (sentence) => /(controvers|debate|split|hot take|drama|호불호|논쟁|갈리|불편|의견)/i.test(sentence),
  );
  const factSentence = pickSourceSentence(
    sourceSentences,
    (sentence) => /(cover|article|report|released|launch|announced|look|style|기사|보도|발표|커버)/i.test(sentence),
  );

  const questionAnchor = (() => {
    if (intent === "question") {
      if (/pair with|goes with|wear with/i.test(sourceText)) {
        return `${baseAnchor}엔 뭐가 잘 맞을까?`;
      }
      if (/need advice|advice/i.test(sourceText)) {
        return `${baseAnchor} 쪽 조언이 궁금해요`;
      }
      if (questionSentence && /which|better|둘 중|비교/i.test(questionSentence)) {
        return `${comparisonPair} 중 뭐가 더 나을까?`;
      }
      return `${baseAnchor}은 어떻게 보여요?`;
    }
    if (intent === "comparison") return `${comparisonPair} 중 뭐가 더 나을까?`;
    if (intent === "controversy") return `${baseAnchor} 얘기라 반응이 갈릴 것 같아요`;
    if (intent === "fact") return factSentence ? `${baseAnchor} 얘기가 먼저 보여요` : `${baseAnchor} 관련 얘기예요`;
    if ((intent === "reason" || intent === "discussion" || intent === "observation") && concreteSourceLine && !hasQuestionOrComparison(concreteSourceLine)) {
      return concreteSourceLine;
    }
    return `${baseAnchor} 쪽을 어떻게 읽을지부터 남아요`;
  })();

  const factualAnchor = (() => {
    if ((intent === "reason" || intent === "discussion" || intent === "observation") && concreteSourceLine) {
      return concreteSourceLine;
    }
    if (factSentence && sourceTerms.length) {
      return `${joinLabels(sourceTerms.slice(0, 3))} 얘기예요`;
    }
    if (factSentence) {
      return `${topicLabel} 관련 얘기예요`;
    }
    return `${baseAnchor} 관련 얘기예요`;
  })();

  const comparisonAnchor = (() => {
    if (comparisonSentence || intent === "comparison" || intent === "question") {
      return `${comparisonPair} 중 뭐가 더 나을까?`;
    }
    return comparisonPair;
  })();

  const controversyAnchor = (() => {
    if (controversySentence || intent === "controversy") {
      return `${baseAnchor} 쪽은 의견이 갈릴 것 같아요`;
    }
    if ((intent === "reason" || intent === "discussion" || intent === "observation") && concreteSourceLine) {
      return `${concreteSourceLine} 얘기는 보는 포인트가 갈릴 수 있어요`;
    }
    if (intent === "comparison") {
      return `${comparisonPair} 쪽은 반응이 갈릴 것 같아요`;
    }
    return `${baseAnchor} 기준은 사람마다 다를 것 같아요`;
  })();

  return {
    intent,
    questionAnchor,
    factualAnchor,
    comparisonAnchor,
    controversyAnchor,
    topicLabel,
    secondaryTopic,
    anchorTerms: sourceTerms,
    sourceSentence: questionSentence || comparisonSentence || controversySentence || factSentence || sourceTitle || sourceBody || "",
  };
}
