import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSprint1ForumPosts, fetchSprint1Evaluation } from "../api/client.js";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";
import { localizeLabel } from "../lib/localized-labels.js";

// ── Meaning frame display labels ──────────────────────────────────────────────
const FRAME_LABELS = {
  tradeoff_filter: "가치 트레이드오프",
  care_context: "케어 맥락",
  signal_filter: "신호 필터",
  practicality_filter: "실용성 필터",
  context_filter: "컨텍스트 필터",
};

const STANCE_LABELS = {
  align: "공감",
  resist: "저항",
  reframe: "재해석",
  absorb: "흡수",
  deflect: "회피",
};

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ label, pass }) {
  return (
    <span style={{ ...styles.badge, ...(pass ? styles.badgePass : styles.badgeFail) }}>
      {pass ? "✓" : "✗"} {label}
    </span>
  );
}

// ── Shared stimulus card ──────────────────────────────────────────────────────
function StimulusCard({ content }) {
  if (!content) return null;
  return (
    <div style={styles.stimulusCard}>
      <div style={styles.stimulusLabel}>공유 자극 (Shared Stimulus)</div>
      <div style={styles.stimulusTitle}>{content.title || content.content_id}</div>
      {content.topics?.length > 0 && (
        <div style={styles.tagRow}>
          {content.topics.map((t) => (
            <span key={t} style={styles.tag}>{localizeLabel(t)}</span>
          ))}
        </div>
      )}
      {content.emotions?.length > 0 && (
        <div style={styles.tagRow}>
          {content.emotions.map((e) => (
            <span key={e} style={{ ...styles.tag, ...styles.emotionTag }}>{localizeLabel(e)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-agent post card ───────────────────────────────────────────────────────
function AgentPostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const frameLabel = FRAME_LABELS[post.meaning_frame] || post.meaning_frame;
  const stanceLabel = STANCE_LABELS[post.stance_signal] || post.stance_signal;
  const generationContext = post.generationContext || post.generation_context || null;

  return (
    <div style={styles.agentCard}>
      <div style={styles.agentHeader}>
        <span style={styles.agentHandle}>@{post.handle}</span>
        <span style={styles.agentId}>{post.agent_id}</span>
      </div>
      <div style={styles.metaRow}>
        <span style={styles.frameBadge}>{frameLabel}</span>
        <span style={styles.stanceBadge}>{stanceLabel}</span>
      </div>
      <div style={styles.postTitle}>{post.title}</div>
      <div style={styles.postBody}>{post.body}</div>
      {generationContext?.summary && (
        <div style={styles.generationContext}>
          <div style={styles.generationContextTitle}>글의 맥락</div>
          <div style={styles.generationContextSummary}>{generationContext.summary}</div>
        </div>
      )}
      {post.trace && (
        <button
          style={styles.traceToggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "세부 정보 숨기기 ▲" : "세부 정보 보기 ▼"}
        </button>
      )}
      {expanded && post.trace && (
        <div style={styles.tracePanel}>
          <div style={styles.traceRow}>
            <span style={styles.traceKey}>감정</span>
            <span>{post.trace.dominant_feeling}</span>
          </div>
          <div style={styles.traceRow}>
            <span style={styles.traceKey}>흐름</span>
            <span>{post.trace.self_narrative_summary || "—"}</span>
          </div>
          <div style={styles.traceRow}>
            <span style={styles.traceKey}>변화</span>
            <span>{post.trace.recent_arc}</span>
          </div>
          <div style={styles.traceRow}>
            <span style={styles.traceKey}>참고 글</span>
            <span style={styles.traceId}>{post.source_content_id}</span>
          </div>
          <div style={styles.traceRow}>
            <span style={styles.traceKey}>반응 기록 ID</span>
            <span style={styles.traceId}>{post.source_reaction_id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Evaluation verdicts panel ─────────────────────────────────────────────────
function EvaluationPanel({ evaluation }) {
  if (!evaluation?.verdicts) return null;
  const { verdicts } = evaluation;
  return (
      <div style={styles.evalPanel}>
      <div style={styles.evalTitle}>Sprint 1 수용 기준</div>
      <div style={styles.badgeRow}>
        <VerdictBadge label="발산 가독성" pass={verdicts.divergence_legible} />
        <VerdictBadge label="기록 완전성" pass={verdicts.traceability_complete} />
        <VerdictBadge label="자극 일관성" pass={verdicts.shared_stimulus_consistent} />
      </div>
      {verdicts.detail && (
        <div style={styles.evalDetail}>
          <span>의미 프레임: {verdicts.detail.meaningFrames?.join(", ")}</span>
          <span>스탠스 신호: {verdicts.detail.stanceSignals?.join(", ")}</span>
          <span>글 수: {verdicts.detail.postCount}</span>
        </div>
      )}
    </div>
  );
}

function ContinuityCard({ evaluation, onOpenReplay }) {
  const verdicts = evaluation?.verdicts;
  const detail = verdicts?.detail || {};

  return (
    <div style={styles.continuityCard}>
      <div style={styles.continuityHeader}>
        <div>
          <div style={styles.continuityKicker}>연결 보기</div>
          <div style={styles.continuityTitle}>같은 자극의 기록으로 이어보기</div>
        </div>
        {onOpenReplay && (
          <button style={styles.continuityButton} onClick={onOpenReplay}>
            다시보기 열기
          </button>
        )}
      </div>
      <div style={styles.continuityText}>
        이 요약에서 본 의미 프레임과 반응 신호를 실제 기록과 나란히 볼 수 있습니다.
      </div>
      {detail.postCount != null && (
        <div style={styles.continuityMeta}>
          <span>글 수: {detail.postCount}</span>
          <span>의미 프레임: {detail.meaningFrames?.length || 0}개</span>
          <span>스탠스 신호: {detail.stanceSignals?.length || 0}개</span>
        </div>
      )}
      {verdicts && (
        <div style={styles.continuityChips}>
          <span style={styles.continuityChip}>
            발산 가독성 {verdicts.divergence_legible ? "충족" : "미충족"}
          </span>
          <span style={styles.continuityChip}>
            기록 완전성 {verdicts.traceability_complete ? "충족" : "미충족"}
          </span>
          <span style={styles.continuityChip}>
            자극 일관성 {verdicts.shared_stimulus_consistent ? "충족" : "미충족"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function Sprint1ReplayPanel({ onOpenReplay }) {
  const { data: postData, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ["sprint1-forum-posts"],
    queryFn: fetchSprint1ForumPosts,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: evalData, isLoading: evalLoading } = useQuery({
    queryKey: ["sprint1-evaluation"],
    queryFn: fetchSprint1Evaluation,
    staleTime: 60_000,
    retry: 1,
  });

  if (postsLoading || evalLoading) {
    return <div style={styles.loading}>Sprint 1 기록 불러오는 중...</div>;
  }

  if (postsError) {
    return (
      <div style={styles.error}>
        <div style={styles.errorTitle}>에이전트 서버에 연결할 수 없습니다</div>
        <div style={styles.errorMsg}>
          <code>npm run dev:agent-server</code> (port 4001) 가 실행 중인지 확인하세요.
        </div>
      </div>
    );
  }

  const posts = postData?.posts ?? [];
  const sharedContent = postData?.shared_content;
  const summaryCards = [
    {
      label: "공유 자극",
      value: sharedContent?.content_id?.split(":").slice(-1)[0] || "—",
      description: "같은 자극을 본 뒤 서로 다른 반응이 나오는 기준점입니다.",
    },
    {
      label: "에이전트 글",
      value: posts.length,
      description: "같은 입력에 대해 어떤 차이가 만들어졌는지 보여줍니다.",
    },
    {
      label: "가독성",
      value: evalData?.verdicts?.divergence_legible ? "충족" : "미충족",
      description: "차이가 읽히는지 확인합니다.",
    },
    {
      label: "기록 완전성",
      value: evalData?.verdicts?.traceability_complete ? "충족" : "미충족",
      description: "선택과 반응이 추적 가능한지 확인합니다.",
    },
  ];

  return (
    <div style={styles.root}>
      <IdentityLoopSummary
        kicker="sprint 1 replay"
        title="같은 자극이 어떻게 서로 다른 캐릭터를 만드는지 봅니다"
        subtitle="Sprint 1 기록은 글 생산보다, 공유된 입력이 각 agent의 선택과 반응을 어떻게 갈라놓는지 읽는 곳입니다."
        cards={summaryCards}
        notes={[
          "같은 글을 봐도 다른 반응이 나오면 캐릭터가 분화합니다.",
          "기록이 충분해야 그 차이를 다시 추적할 수 있습니다.",
        ]}
      />

      <ContinuityCard evaluation={evalData} onOpenReplay={onOpenReplay} />

      <EvaluationPanel evaluation={evalData} />

      <StimulusCard content={sharedContent} />

      <div style={styles.sectionTitle}>에이전트별 글 ({posts.length}개)</div>
      <div style={styles.postList}>
        {posts.map((post) => (
          <AgentPostCard key={post.post_id} post={post} />
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  loading: { padding: 32, textAlign: "center", color: "#6b7280" },
  error: {
    padding: 20,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
  },
  errorTitle: { fontWeight: 600, color: "#dc2626", marginBottom: 4 },
  errorMsg: { fontSize: 13, color: "#6b7280" },
  panelTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "#6b7280", marginTop: 8 },

  // Stimulus card
  stimulusCard: {
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  stimulusLabel: { fontSize: 11, fontWeight: 600, color: "#0ea5e9", textTransform: "uppercase" },
  stimulusTitle: { fontSize: 15, fontWeight: 600, color: "#0c4a6e" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 4 },
  tag: {
    fontSize: 11,
    background: "#e0f2fe",
    color: "#0369a1",
    borderRadius: 4,
    padding: "2px 6px",
  },
  emotionTag: { background: "#fce7f3", color: "#9d174d" },

  // Evaluation
  evalPanel: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  evalTitle: { fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase" },
  badgeRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  badge: { fontSize: 12, borderRadius: 12, padding: "3px 10px", fontWeight: 500 },
  badgePass: { background: "#dcfce7", color: "#166534" },
  badgeFail: { background: "#fee2e2", color: "#991b1b" },
  evalDetail: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 11,
    color: "#64748b",
  },

  continuityCard: {
    background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  continuityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 12,
  },
  continuityKicker: {
    fontSize: 11,
    fontWeight: 700,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  continuityTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1e3a8a",
    marginTop: 2,
  },
  continuityButton: {
    border: "none",
    borderRadius: 999,
    background: "#1d4ed8",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  continuityText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.6,
  },
  continuityMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 11,
    color: "#64748b",
  },
  continuityChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  continuityChip: {
    fontSize: 11,
    borderRadius: 999,
    padding: "4px 10px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 600,
  },

  // Agent post card
  postList: { display: "flex", flexDirection: "column", gap: 12 },
  agentCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  agentHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  agentHandle: { fontSize: 13, fontWeight: 600, color: "#111827" },
  agentId: { fontSize: 11, color: "#9ca3af" },
  metaRow: { display: "flex", gap: 6 },
  frameBadge: {
    fontSize: 11,
    background: "#ede9fe",
    color: "#5b21b6",
    borderRadius: 4,
    padding: "2px 6px",
    fontWeight: 500,
  },
  stanceBadge: {
    fontSize: 11,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 4,
    padding: "2px 6px",
    fontWeight: 500,
  },
  postTitle: { fontSize: 14, fontWeight: 600, color: "#1f2937" },
  postBody: { fontSize: 13, color: "#4b5563", lineHeight: 1.5 },
  generationContext: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 6,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  generationContextTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 4,
  },
  generationContextSummary: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 1.5,
    marginBottom: 2,
  },
  traceToggle: {
    fontSize: 11,
    background: "transparent",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  },
  tracePanel: {
    background: "#f9fafb",
    border: "1px solid #f3f4f6",
    borderRadius: 6,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  traceRow: { display: "flex", gap: 8, fontSize: 11, alignItems: "flex-start" },
  traceKey: { color: "#9ca3af", minWidth: 72, flexShrink: 0 },
  traceId: { color: "#6b7280", fontFamily: "monospace", wordBreak: "break-all" },
};
