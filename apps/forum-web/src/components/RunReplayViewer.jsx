import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLatestReplay, triggerRun } from "../api/client.js";
import AgentEvolutionPanel from "./AgentEvolutionPanel.jsx";

const REPLAY_REFRESH_MS = 5_000;

// ── Label maps ────────────────────────────────────────────────────────────────
const FRAME_LABELS = {
  tradeoff_filter: "가치 트레이드오프",
  care_context: "케어 맥락",
  signal_filter: "신호 필터",
  practicality_filter: "실용성 필터",
  context_filter: "컨텍스트 필터",
};

const STANCE_LABELS = {
  skeptical: "회의적",
  empathetic: "공감",
  practical: "실용적",
  observant: "관찰적",
  amplify: "증폭",
  reserved: "유보",
};

const ARCHETYPE_LABELS = {
  quiet_observer: "조용한 관찰자",
  trend_seeker: "트렌드 추구자",
  community_regular: "커뮤니티 일반인",
  brand_loyalist: "브랜드 충성자",
  contrarian_commenter: "반론자",
  empathetic_responder: "공감 응답자",
};

const STORAGE_KEYS = {
  lastAnchor: "replay-viewer:last-anchor",
  runForm: "replay-viewer:last-run-form",
  agentStateExpanded: "replay-viewer:agent-state-expanded",
};

const ANCHOR_LABELS = {
  "run-panel": "기록 실행",
  "continuity-card": "연결 보기",
  "run-meta": "기록 메타",
  metrics: "평가 지표",
  evolution: "에이전트 변화",
  exposure: "반응 기록",
  posts: "글 흐름",
  "agent-state": "에이전트 상태",
};

function readStorage(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures in private mode / disabled storage environments
  }
}

function formatAnchorLabel(anchor) {
  return ANCHOR_LABELS[anchor] || anchor || "—";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(value) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function score(value) {
  if (value == null) return "—";
  return value.toFixed(3);
}

// ── Metric row ────────────────────────────────────────────────────────────────
function MetricRow({ label, value, description, isBoolean }) {
  const display = isBoolean
    ? (value ? "✓ 충족" : "✗ 미충족")
    : typeof value === "number"
    ? pct(value)
    : String(value ?? "—");

  const valueColor = isBoolean
    ? value
      ? "#16a34a"
      : "#dc2626"
    : "#111827";

  return (
    <div style={styles.metricRow}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: valueColor }}>{display}</div>
      {description && <div style={styles.metricDesc}>{description}</div>}
    </div>
  );
}

// ── Metrics panel ─────────────────────────────────────────────────────────────
function MetricsPanel({ report }) {
  if (!report?.metrics) return null;
  const m = report.metrics;

  return (
    <div style={styles.metricsPanel}>
      <div style={styles.sectionHeader}>평가 지표 (8개)</div>
      <div style={styles.metricsGrid}>
        <MetricRow label="고유성" value={m.identityDifferentiation} description="에이전트 간 취향/관심 거리" />
        <MetricRow label="보이는 참여" value={m.visibleParticipationRate} description="눈에 보이는 행동 비율" />
        <MetricRow label="일관성" value={m.consistencyScore} description="에이전트 일관성 평균" />
        <MetricRow label="갈등 밀도" value={m.conflictHeat} description="갈등 신호 비율" />
        <MetricRow label="글 다양성" value={m.contentDiversity} description="의미 프레임 다양도" />
        <MetricRow label="반향실 정도" value={m.echoChamberIndex} description="같은 흐름 재강화 비율" />
        <MetricRow label="표시율" value={m.moderationFlagRate} description="조심스러운/날카로운 반응 비율" />
        <MetricRow label="흐름이 읽히는가" value={m.divergenceLegible} isBoolean description="흐름 구분이 충분히 보이는지" />
      </div>
      {report.post_summary && (
        <div style={styles.postSummaryRow}>
          <span style={styles.summaryLabel}>프레임 분포:</span>
          {Object.entries(report.post_summary.meaning_frame_distribution ?? {}).map(([f, n]) => (
            <span key={f} style={styles.frameChip}>{FRAME_LABELS[f] || f} × {n}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ContinuityCard({ replay, onOpenSprint1 }) {
  const frames = replay?.report?.post_summary?.meaning_frame_distribution || {};
  const frameEntries = Object.entries(frames);

  return (
    <div style={styles.continuityCard}>
      <div style={styles.continuityHeader}>
        <div>
          <div style={styles.continuityKicker}>연결 보기</div>
          <div style={styles.continuityTitle}>이번 기록에서 스프린트 요약으로 돌아가기</div>
        </div>
        {onOpenSprint1 && (
          <button style={styles.continuityButton} onClick={onOpenSprint1}>
            Sprint 요약 열기
          </button>
        )}
      </div>
      <div style={styles.continuityText}>
        같은 자극에서 어떤 반응 흐름이 나왔는지 보고, 같은 맥락의 Sprint 1 요약과 비교해 볼 수 있습니다.
      </div>
      <div style={styles.continuityMeta}>
        <span>기록: {replay?.run_id || "—"}</span>
        <span>씨드: {replay?.seed ?? "—"}</span>
        <span>글 수: {replay?.posts?.length ?? 0}</span>
      </div>
      {frameEntries.length > 0 && (
        <div style={styles.continuityChips}>
          {frameEntries.map(([frame, count]) => (
            <span key={frame} style={styles.continuityChip}>
              {FRAME_LABELS[frame] || frame} × {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Exposure trace for one agent ──────────────────────────────────────────────
function AgentExposureRow({ agentId, exposure }) {
  if (!exposure) return null;
  return (
    <div style={styles.exposureRow}>
      <span style={styles.agentChip}>{agentId}</span>
      <span style={styles.exposureDetail}>
        콘텐츠 {exposure.reaction_count}개 반응 · 메모리 {exposure.writebacks}회 기록
      </span>
      {exposure.selected_content_ids?.slice(0, 2).map((id) => (
        <span key={id} style={styles.contentIdChip}>{id.split(":").slice(-1)[0]}</span>
      ))}
    </div>
  );
}

// ── Post card with generation trace ──────────────────────────────────────────
function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const frameLabel = FRAME_LABELS[post.meaning_frame] || post.meaning_frame;
  const stanceLabel = STANCE_LABELS[post.stance_signal] || post.stance_signal;

  return (
    <div style={styles.postCard}>
      <div style={styles.postHeader}>
        <span style={styles.postHandle}>@{post.handle}</span>
        <span style={styles.postAgentId}>{post.agent_id}</span>
        {post.postError && <span style={styles.errorBadge}>저장 실패</span>}
      </div>
      <div style={styles.badgeRow}>
        <span style={styles.frameBadge}>{frameLabel}</span>
        <span style={styles.stanceBadge}>{stanceLabel}</span>
      </div>
      <div style={styles.postTitle}>{post.title}</div>
      <div style={styles.postBody}>{post.body}</div>
      <button style={styles.traceBtn} onClick={() => setExpanded((v) => !v)}>
        {expanded ? "배경 숨기기 ▲" : "배경 보기 ▼"}
      </button>
      {expanded && (
        <div style={styles.tracePanel}>
          <div style={styles.traceTitle}>작성 배경</div>
          <div style={styles.traceGrid}>
            <span style={styles.traceKey}>참고 글</span>
            <span style={styles.traceVal}>{post.source_content_id?.split(":").slice(-1)[0] || "—"}</span>
            <span style={styles.traceKey}>읽기 방식</span>
            <span style={styles.traceVal}>{frameLabel}</span>
            <span style={styles.traceKey}>반응 톤</span>
            <span style={styles.traceVal}>{stanceLabel}</span>
            {post.trace?.dominant_feeling && (
              <>
                <span style={styles.traceKey}>중심 감정</span>
                <span style={styles.traceVal}>{post.trace.dominant_feeling}</span>
              </>
            )}
            {post.trace?.resonance_score != null && (
              <>
                <span style={styles.traceKey}>반응 강도</span>
                <span style={styles.traceVal}>{score(post.trace.resonance_score)}</span>
              </>
            )}
            {post.trace?.self_narrative_summary && (
              <>
                <span style={styles.traceKey}>자기 흐름</span>
                <span style={styles.traceVal}>{post.trace.self_narrative_summary}</span>
              </>
            )}
            {post.trace?.recent_arc && (
              <>
                <span style={styles.traceKey}>최근 흐름</span>
                <span style={styles.traceVal}>{post.trace.recent_arc}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent state panel ─────────────────────────────────────────────────────────
function AgentStatePanel({ agents, expanded, onToggle }) {
  if (!agents?.length) return null;

  return (
    <div style={styles.agentStatePanel}>
      <button style={styles.sectionHeaderBtn} onClick={onToggle}>
        에이전트 상태 ({agents.length}명) {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div style={styles.agentStateGrid}>
          {agents.map((agent) => (
            <div key={agent.agent_id} style={styles.agentStateCard}>
              <div style={styles.agentStateHeader}>
                <span style={styles.agentStateHandle}>@{agent.handle}</span>
                <span style={styles.agentStateArchetype}>
                  {ARCHETYPE_LABELS[agent.archetype] || agent.archetype}
                </span>
              </div>
              {agent.mutable_state?.recent_arc && (
                <div style={styles.arcRow}>아크: {agent.mutable_state.recent_arc}</div>
              )}
              {agent.mutable_state?.drift_log?.slice(-2).map((log, i) => (
                <div key={i} style={styles.driftLog}>{log}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Run trigger panel ─────────────────────────────────────────────────────────
function RunTriggerPanel({
  onRunComplete,
  timeSpeed = 1,
  seed,
  ticks,
  onSeedChange,
  onTicksChange,
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => triggerRun({ seed, ticks, speed: timeSpeed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-replay"] });
      onRunComplete?.();
    },
  });

  return (
    <div style={styles.runPanel}>
      <div style={styles.runPanelTitle}>새 기록 만들기</div>
      <div style={styles.runInputRow}>
        <label style={styles.runLabel}>
          Seed
          <input
            style={styles.runInput}
            type="number"
            value={seed}
            onChange={(e) => onSeedChange(Number(e.target.value))}
            min={0}
          />
        </label>
        <label style={styles.runLabel}>
          Ticks
          <input
            style={styles.runInput}
            type="number"
            value={ticks}
            onChange={(e) => onTicksChange(Math.min(10, Math.max(1, Number(e.target.value))))}
            min={1}
            max={10}
          />
        </label>
        <button
          style={{ ...styles.runBtn, ...(mutation.isPending ? styles.runBtnDisabled : {}) }}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "기록 만드는 중..." : `▶ 기록 만들기 (${timeSpeed}x)`}
        </button>
      </div>
      {mutation.isError && (
        <div style={styles.runError}>
          오류: {mutation.error?.message || "agent-server에 연결할 수 없습니다."}
        </div>
      )}
      {mutation.isSuccess && (
        <div style={styles.runSuccess}>
          완료 — 글: {mutation.data?.posts_created}, 기록: {mutation.data?.replay_file}
        </div>
      )}
    </div>
  );
}

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function RunReplayViewer({ timeSpeed = 1, onOpenSprint1 }) {
  const storedRunForm = readStorage(STORAGE_KEYS.runForm, { seed: 42, ticks: 5 });
  const [seed, setSeed] = useState(storedRunForm.seed ?? 42);
  const [ticks, setTicks] = useState(storedRunForm.ticks ?? 5);
  const [agentStateExpanded, setAgentStateExpanded] = useState(
    () => readStorage(STORAGE_KEYS.agentStateExpanded, false) === true
  );
  const [activeAnchor, setActiveAnchor] = useState(
    () => readStorage(STORAGE_KEYS.lastAnchor, "run-panel") || "run-panel"
  );
  const [restoreStatus, setRestoreStatus] = useState("대기 중");
  const [restoredAnchor, setRestoredAnchor] = useState("");
  const restoreAnchorRef = useRef(false);

  const {
    data: replay,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["latest-replay"],
    queryFn: fetchLatestReplay,
    retry: 1,
    staleTime: 10_000,
    refetchInterval: (query) => (query.state.data ? REPLAY_REFRESH_MS : false),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    writeStorage(STORAGE_KEYS.runForm, { seed, ticks });
  }, [seed, ticks]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.agentStateExpanded, agentStateExpanded);
  }, [agentStateExpanded]);

  useEffect(() => {
    if (!replay || restoreAnchorRef.current) {
      return;
    }

    const target = window.localStorage.getItem(STORAGE_KEYS.lastAnchor) || activeAnchor;
    if (!target) {
      setRestoreStatus("복원 대상 없음");
      return;
    }

    const node = document.querySelector(`[data-replay-anchor="${target}"]`);
    if (!node) {
      setRestoreStatus("복원 위치를 찾지 못함");
      return;
    }

    restoreAnchorRef.current = true;
    setRestoredAnchor(target);
    setRestoreStatus("마지막 위치 복원됨");
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [replay, activeAnchor]);

  useEffect(() => {
    if (!replay) return undefined;

    const nodes = Array.from(document.querySelectorAll("[data-replay-anchor]"));
    if (nodes.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const anchor = visible
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
          .target.getAttribute("data-replay-anchor");

        if (anchor) {
          setActiveAnchor(anchor);
          writeStorage(STORAGE_KEYS.lastAnchor, anchor);
        }
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: "-10% 0px -65% 0px",
      }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [replay, agentStateExpanded]);

  return (
    <div style={styles.root}>
      <div data-replay-anchor="run-panel">
        <RunTriggerPanel
          onRunComplete={refetch}
          timeSpeed={timeSpeed}
          seed={seed}
          ticks={ticks}
          onSeedChange={setSeed}
          onTicksChange={setTicks}
        />
      </div>

      <div style={styles.liveHint}>
        <div style={styles.liveHintMain}>
          {isFetching ? "최근 기록을 확인 중…" : "최근 기록을 5초마다 자동 갱신합니다."}
          {dataUpdatedAt ? (
            <span style={styles.liveHintMeta}>
              마지막 갱신: {new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")}
            </span>
          ) : null}
        </div>
        <div style={styles.anchorStatusRow}>
          <span style={styles.anchorStatusChip}>현재 위치: {formatAnchorLabel(activeAnchor)}</span>
          <span style={styles.anchorStatusChip}>복원 상태: {restoreStatus}</span>
          {restoredAnchor ? (
            <span style={styles.anchorStatusChipSoft}>복원 앵커: {formatAnchorLabel(restoredAnchor)}</span>
          ) : null}
        </div>
      </div>

      {isLoading && <div style={styles.loading}>기록 불러오는 중...</div>}

      {error && !isLoading && (
        <div style={styles.noReplay}>
          <div style={styles.noReplayTitle}>아직 기록이 없습니다</div>
          <div style={styles.noReplayMsg}>위 실행 버튼으로 첫 기록을 만들어보세요.</div>
        </div>
      )}

      {replay && (
        <>
          <div data-replay-anchor="continuity-card">
            <ContinuityCard replay={replay} onOpenSprint1={onOpenSprint1} />
          </div>

          <div style={styles.runMeta} data-replay-anchor="run-meta">
            <span style={styles.runMetaItem}>기록: <code>{replay.run_id}</code></span>
            <span style={styles.runMetaItem}>씨드: {replay.seed}</span>
            <span style={styles.runMetaItem}>진행 틱: {replay.ticks}</span>
            <span style={styles.runMetaItem}>{replay.created_at?.slice(0, 19).replace("T", " ")}</span>
          </div>

          <div data-replay-anchor="metrics">
            <MetricsPanel report={replay.report} />
          </div>

          <div data-replay-anchor="evolution">
            <AgentEvolutionPanel
              title="에이전트 변화 흐름"
              subtitle="기록된 에이전트 변화와 각자의 최근 흐름을 봅니다."
              agentGrowth={replay.agent_growth}
              evolutions={replay.agent_evolution ?? []}
              emptyText="아직 진화 정보가 없습니다."
            />
          </div>

          <div style={styles.sectionHeader} data-replay-anchor="exposure">
            반응 기록 ({Object.keys(replay.exposures ?? {}).length}명)
          </div>
          <div style={styles.exposureList}>
            {Object.entries(replay.exposures ?? {}).map(([id, exp]) => (
              <AgentExposureRow key={id} agentId={id} exposure={exp} />
            ))}
          </div>

          <div style={styles.sectionHeader} data-replay-anchor="posts">
            글 흐름 ({replay.posts?.length ?? 0}개)
          </div>
          <div style={styles.postList}>
            {(replay.posts ?? []).map((post) => (
              <PostCard key={post.post_id} post={post} />
            ))}
          </div>

          <div data-replay-anchor="agent-state">
            <AgentStatePanel
              agents={replay.agents}
              expanded={agentStateExpanded}
              onToggle={() => setAgentStateExpanded((value) => !value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  liveHint: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 12,
  },
  liveHintMain: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  liveHintMeta: {
    color: "#64748b",
    whiteSpace: "nowrap",
  },
  anchorStatusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  anchorStatusChip: {
    fontSize: 11,
    color: "#1d4ed8",
    background: "#dbeafe",
    borderRadius: 999,
    padding: "3px 8px",
    fontWeight: 600,
  },
  anchorStatusChipSoft: {
    fontSize: 11,
    color: "#475569",
    background: "#e2e8f0",
    borderRadius: 999,
    padding: "3px 8px",
    fontWeight: 600,
  },
  loading: { padding: 32, textAlign: "center", color: "#6b7280" },

  // Run trigger
  runPanel: {
    background: "#1e293b",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  runPanelTitle: { fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  runInputRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  runLabel: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" },
  runInput: {
    width: 72,
    padding: "4px 8px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 4,
    color: "#f1f5f9",
    fontSize: 13,
  },
  runBtn: {
    padding: "6px 18px",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 14,
  },
  runBtnDisabled: { background: "#475569", cursor: "not-allowed" },
  runError: { fontSize: 12, color: "#f87171" },
  runSuccess: { fontSize: 12, color: "#4ade80" },

  // Run metadata
  runMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 12,
    color: "#6b7280",
    padding: "8px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  runMetaItem: {},

  // No replay state
  noReplay: {
    padding: 24,
    background: "#f8fafc",
    borderRadius: 8,
    border: "1px dashed #cbd5e1",
    textAlign: "center",
  },
  noReplayTitle: { fontWeight: 600, color: "#334155", marginBottom: 6 },
  noReplayMsg: { fontSize: 13, color: "#64748b" },

  // Section headers
  sectionHeader: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeaderBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  },

  // Metrics
  metricsPanel: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  metricsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" },
  metricRow: { display: "flex", flexDirection: "column", gap: 1 },
  metricLabel: { fontSize: 11, color: "#94a3b8" },
  metricValue: { fontSize: 15, fontWeight: 600 },
  metricDesc: { fontSize: 10, color: "#cbd5e1" },
  postSummaryRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" },
  summaryLabel: { fontWeight: 600 },
  frameChip: { background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "2px 6px" },

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

  // Exposure list
  exposureList: { display: "flex", flexDirection: "column", gap: 4 },
  exposureRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" },
  agentChip: { background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2px 6px", fontWeight: 600, fontSize: 11 },
  exposureDetail: { color: "#6b7280" },
  contentIdChip: { background: "#f0f9ff", color: "#0369a1", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontFamily: "monospace" },

  // Post cards
  postList: { display: "flex", flexDirection: "column", gap: 12 },
  postCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  postHeader: { display: "flex", alignItems: "center", gap: 8 },
  postHandle: { fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 },
  postAgentId: { fontSize: 11, color: "#9ca3af" },
  errorBadge: { fontSize: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 6px" },
  badgeRow: { display: "flex", gap: 6 },
  frameBadge: { fontSize: 11, background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "2px 6px", fontWeight: 500 },
  stanceBadge: { fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 6px", fontWeight: 500 },
  postTitle: { fontSize: 14, fontWeight: 600, color: "#1f2937" },
  postBody: { fontSize: 13, color: "#4b5563", lineHeight: 1.55 },
  traceBtn: { fontSize: 11, background: "none", border: "none", color: "#6b7280", cursor: "pointer", textAlign: "left", padding: 0 },
  tracePanel: { background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: 10 },
  traceTitle: { fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 },
  traceGrid: {
    display: "grid",
    gridTemplateColumns: "max-content 1fr",
    gap: "3px 12px",
    fontSize: 11,
    alignItems: "start",
  },
  traceKey: { color: "#9ca3af", whiteSpace: "nowrap" },
  traceVal: { color: "#374151", wordBreak: "break-word" },

  // Agent state
  agentStatePanel: { border: "1px solid #f3f4f6", borderRadius: 8, padding: 12 },
  agentStateGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 },
  agentStateCard: { background: "#f9fafb", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 4 },
  agentStateHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  agentStateHandle: { fontSize: 12, fontWeight: 600, color: "#111827" },
  agentStateArchetype: { fontSize: 10, color: "#9ca3af" },
  arcRow: { fontSize: 11, color: "#0369a1" },
  driftLog: { fontSize: 10, color: "#64748b", fontFamily: "monospace" },
};
