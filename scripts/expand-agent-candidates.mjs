#!/usr/bin/env node
/**
 * expand-agent-candidates.mjs
 *
 * Generates 30+ diverse agent state candidates from archetype/personality
 * combinations. Does not require MongoDB — runs offline from combinatorial
 * templates and deterministic seeding.
 *
 * Usage:
 *   node scripts/expand-agent-candidates.mjs
 *   node scripts/expand-agent-candidates.mjs --output data/agent-state-candidates.json
 *   node scripts/expand-agent-candidates.mjs --count 50
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/agent-state-candidates.json");

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, count: 36 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--output" && argv[i + 1]) { args.output = path.resolve(process.cwd(), argv[++i]); }
    if (argv[i] === "--count" && argv[i + 1]) { args.count = Math.max(6, Number(argv[++i]) || 36); }
  }
  return args;
}

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }
function round(v) { return Math.round(v * 100) / 100; }
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

const ARCHETYPES = [
  "quiet_observer",
  "social_participant",
  "trend_setter",
  "contrarian_observer",
  "empathetic_responder",
  "brand_loyalist",
];

const PERSONALITY_PRESETS = [
  { label: "open_curious", openness: 0.82, conformity: 0.35, conflict_tolerance: 0.65 },
  { label: "cautious_conformist", openness: 0.38, conformity: 0.85, conflict_tolerance: 0.30 },
  { label: "assertive_independent", openness: 0.55, conformity: 0.25, conflict_tolerance: 0.75 },
  { label: "warm_communal", openness: 0.68, conformity: 0.60, conflict_tolerance: 0.45 },
  { label: "skeptical_detached", openness: 0.42, conformity: 0.40, conflict_tolerance: 0.70 },
  { label: "playful_spontaneous", openness: 0.75, conformity: 0.30, conflict_tolerance: 0.55 },
];

const TOPIC_POOLS = [
  { primary: "style", secondary: ["fit", "color", "outerwear"] },
  { primary: "pricing", secondary: ["brand", "utility", "value"] },
  { primary: "sustainability", secondary: ["ethics", "secondhand", "quality"] },
  { primary: "streetwear", secondary: ["sneakers", "brand", "hype"] },
  { primary: "office", secondary: ["layering", "fit", "minimal"] },
  { primary: "pet_lifestyle", secondary: ["daily_look", "comfort", "outdoor"] },
];

const EMOTION_PROFILES = [
  { dominant: "curiosity", secondary: "anticipation" },
  { dominant: "empathy", secondary: "relief" },
  { dominant: "amusement", secondary: "surprise" },
  { dominant: "anger", secondary: "sadness" },
  { dominant: "anticipation", secondary: "curiosity" },
  { dominant: "relief", secondary: "empathy" },
];

const KO_NAMES = [
  "김서연", "이준혁", "박소율", "정민재", "한유진", "최도현",
  "강하은", "윤시우", "임채린", "오지훈", "배수빈", "서예준",
  "조하린", "류태윤", "황민서", "문재현", "신지아", "노현우",
  "송은채", "권도윤", "안서진", "장시현", "유지우", "홍다인",
  "전예빈", "양수호", "허은서", "백태민", "남지현", "심도영",
  "고유라", "차민준", "맹서현", "봉지율", "성하윤", "탁수연",
  "진예솔", "엄재윤", "변서아", "위도현", "감하진", "편유진",
  "석민서", "태지안", "종유빈", "라은호", "빈서율", "달지훈",
  "솔하온", "란채영",
];

const HANDLES = KO_NAMES.map(name =>
  name.replace(/\s/g, "").toLowerCase()
    .replace(/[가-힣]/g, (ch) => {
      const code = ch.charCodeAt(0) - 0xAC00;
      const lead = Math.floor(code / 588);
      const vowel = Math.floor((code % 588) / 28);
      return String.fromCharCode(0x1100 + lead) + String.fromCharCode(0x1161 + vowel);
    }).slice(0, 12)
);

const COMMENT_REGISTERS = ["casual_polite", "casual_playful", "semi_formal"];
const CADENCES = ["short_reply", "balanced_reply", "thoughtful_reply"];

function generateCandidate(index, rng) {
  const agentId = `A${String(index + 1).padStart(2, "0")}`;
  const archetype = ARCHETYPES[index % ARCHETYPES.length];
  const personality = PERSONALITY_PRESETS[index % PERSONALITY_PRESETS.length];
  const topics = TOPIC_POOLS[index % TOPIC_POOLS.length];
  const emotion = EMOTION_PROFILES[index % EMOTION_PROFILES.length];
  const name = KO_NAMES[index % KO_NAMES.length];
  const handle = HANDLES[index % HANDLES.length] || `agent${index}`;

  // Add jitter to personality axes
  const jitter = () => round(clamp((rng() - 0.5) * 0.2));

  const seedAxes = {
    curiosity: round(clamp(0.3 + rng() * 0.5)),
    status_drive: round(clamp(0.15 + rng() * 0.5)),
    care_drive: round(clamp(0.15 + rng() * 0.5)),
    novelty_drive: round(clamp(0.2 + rng() * 0.5)),
    skepticism: round(clamp(0.15 + rng() * 0.5)),
    belonging_drive: round(clamp(0.15 + rng() * 0.5)),
  };

  // Boost archetype-specific axes
  if (archetype === "trend_setter") { seedAxes.status_drive += 0.2; seedAxes.novelty_drive += 0.15; }
  if (archetype === "contrarian_observer") { seedAxes.skepticism += 0.25; }
  if (archetype === "empathetic_responder") { seedAxes.care_drive += 0.25; seedAxes.belonging_drive += 0.15; }
  if (archetype === "social_participant") { seedAxes.belonging_drive += 0.2; seedAxes.care_drive += 0.1; }
  if (archetype === "brand_loyalist") { seedAxes.status_drive += 0.15; seedAxes.belonging_drive += 0.1; }

  Object.keys(seedAxes).forEach(k => { seedAxes[k] = round(clamp(seedAxes[k])); });

  const interestVector = {};
  interestVector[topics.primary] = round(clamp(0.6 + rng() * 0.4));
  for (const sec of topics.secondary) {
    interestVector[sec] = round(clamp(0.2 + rng() * 0.5));
  }

  const beliefVector = {
    "social-feedback-matters": round(clamp(0.3 + personality.conformity * 0.5 + jitter())),
    "topic-diversity-matters": round(clamp(0.3 + personality.openness * 0.5 + jitter())),
    "sparse-response-is-valid": archetype === "quiet_observer" ? round(clamp(0.7 + jitter())) : round(clamp(0.3 + rng() * 0.4)),
    "conflict-can-reveal-truth": round(clamp(0.2 + personality.conflict_tolerance * 0.5 + jitter())),
    "memory-should-track-recurrent-topics": round(clamp(0.5 + rng() * 0.4)),
  };

  const emotionBias = {};
  const emotions = ["curiosity", "empathy", "amusement", "sadness", "anger", "relief", "anticipation", "surprise"];
  for (const em of emotions) {
    emotionBias[em] = round(clamp(0.12 + rng() * 0.3));
  }
  emotionBias[emotion.dominant] = round(clamp(emotionBias[emotion.dominant] + 0.25));
  emotionBias[emotion.secondary] = round(clamp(emotionBias[emotion.secondary] + 0.15));

  const avatarIndex = (index % 20) + 1;

  return {
    snapshot_id: `init:seed:${agentId}`,
    agent_id: agentId,
    round: 0,
    tick: 0,
    source_seed_profile_id: `seed:${agentId}`,
    source_author_type: "agent",
    archetype,
    handle: name,
    display_name: name,
    avatar_url: `/agent-avatars/agent-avatar-${avatarIndex}.png`,
    avatar_locale: "ko",
    seed_axes: seedAxes,
    mutable_axes: {
      attention_bias: round(clamp(0.3 + rng() * 0.4)),
      belief_shift: round(clamp(0.1 + rng() * 0.3)),
      affect_intensity: round(clamp(0.15 + rng() * 0.35)),
      identity_confidence: round(clamp(0.2 + rng() * 0.4)),
      social_posture: round(clamp(0.2 + rng() * 0.4)),
      novelty_openness: round(clamp(0.2 + rng() * 0.5)),
    },
    interest_vector: interestVector,
    belief_vector: beliefVector,
    openness: round(clamp(personality.openness + jitter())),
    conformity: round(clamp(personality.conformity + jitter())),
    conflict_tolerance: round(clamp(personality.conflict_tolerance + jitter())),
    relationship_summary: {
      trust_circle_size: Math.floor(rng() * 4) + 1,
      muted_topics: Math.floor(rng() * 2),
    },
    recentMemories: [
      { kind: "topic_summary", text: `주요 관심 주제: ${topics.primary}, ${topics.secondary[0]}` },
      { kind: "social_summary", text: `${archetype} 성향으로 포럼에 참여 중` },
      { kind: "style_note", text: `댓글 말투는 ${pick(COMMENT_REGISTERS, rng)} 중심으로 유지` },
    ],
    durableMemories: [
      { kind: "seed_behavior", text: `Primary mode: ${archetype}` },
      { kind: "topic_memory", text: `Top topics: ${topics.primary}, ${topics.secondary.join(", ")}` },
      { kind: "emotion_baseline", text: `감정 기조: ${emotion.dominant} / ${emotion.secondary}` },
    ],
    seed_profile: {
      comment_style: {
        register: pick(COMMENT_REGISTERS, rng),
        cadence: pick(CADENCES, rng),
        openerMarkers: pick([["근데", "오히려"], ["저는", "개인적으로"], ["사실", "솔직히"], ["음", "그 부분"]], rng),
        endingMarkers: pick([["같아요", "보여요"], ["느껴져요", "더라고요"], ["네요", "싶어요"]], rng),
        sampleComments: [],
        voiceNotes: [
          "댓글 말투는 짧고 구어체로 둔다.",
          `감정 기조는 ${emotion.dominant} / ${emotion.secondary} 중심으로 흐른다.`,
        ],
      },
      emotional_bias: emotionBias,
      emotion_signature: {
        dominantEmotion: emotion.dominant,
        secondaryEmotion: emotion.secondary,
      },
    },
  };
}

async function main() {
  const { output, count } = parseArgs(process.argv);
  const rng = seededRandom(42);
  const candidates = [];

  for (let i = 0; i < count; i++) {
    candidates.push(generateCandidate(i, rng));
  }

  const result = {
    exportedAt: new Date().toISOString(),
    source: {
      generator: "expand-agent-candidates.mjs",
      profileCount: candidates.length,
    },
    model: "agent-state-candidates",
    candidates,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[expand-agents] Generated ${candidates.length} candidates → ${output}`);

  // Summary
  const archetypeCounts = {};
  for (const c of candidates) {
    archetypeCounts[c.archetype] = (archetypeCounts[c.archetype] || 0) + 1;
  }
  console.log("[expand-agents] Archetype distribution:", archetypeCounts);
}

main().catch((err) => { console.error(err); process.exit(1); });
