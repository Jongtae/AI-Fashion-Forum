import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOperatorDashboard,
  reviewModerationItem,
  fetchLatestReport,
} from "../api/client.js";
import AgentEvolutionPanel from "./AgentEvolutionPanel.jsx";
import PostList from "./PostList.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(value) {
  return value != null ? `${(value * 100).toFixed(1)}%` : "—";
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, badge, badgeColor, children }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>{title}</span>
        {badge != null && (
          <span style={{ ...styles.badge, background: badgeColor ?? "#e0f2fe", color: "#0369a1" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryRow({ label, value, highlight }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={{ ...styles.summaryValue, color: highlight ? "#dc2626" : "#111827" }}>{value}</span>
    </div>
  );
}

// ── Moderation queue item ─────────────────────────────────────────────────────
function ModerationItem({ item, onDecision }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.modItem}>
      <div style={styles.modHeader}>
        <span style={styles.modScore}>
          점수 {item.moderation_score != null ? item.moderation_score.toFixed(3) : "—"}
        </span>
        {item.moderation_label && (
          <span style={styles.modLabel}>{item.moderation_label}</span>
        )}
        <span style={styles.modTime}>{timeAgo(item.created_at)}</span>
        <span style={styles.authorType}>{item.author_type === "agent" ? "🤖" : "👤"}</span>
      </div>
      <div style={styles.modContent}>{item.content_preview}</div>
      {item.moderation_reasons?.length > 0 && (
        <div style={styles.reasonRow}>
          {item.moderation_reasons.map((r) => (
            <span key={r} style={styles.reasonChip}>{r}</span>
          ))}
        </div>
      )}
      <div style={styles.decisionRow}>
        <button style={{ ...styles.decBtn, ...styles.decApprove }} onClick={() => onDecision(item.id, "approve")}>
          승인
        </button>
        <button style={{ ...styles.decBtn, ...styles.decReject }} onClick={() => onDecision(item.id, "reject")}>
          제거
        </button>
        <button style={{ ...styles.decBtn, ...styles.decRecheck }} onClick={() => onDecision(item.id, "recheck")}>
          재검토
        </button>
      </div>
    </div>
  );
}

// ── Thread row ────────────────────────────────────────────────────────────────
function ThreadRow({ thread }) {
  return (
    <div style={styles.threadRow}>
      <div style={styles.threadContent}>{thread.content_preview}</div>
      <div style={styles.threadMeta}>
        <span style={styles.conflictScore}>신고 {thread.report_count}건</span>
        {thread.moderation_score != null && (
          <span style={styles.conflictScore}>점수 {thread.moderation_score.toFixed(3)}</span>
        )}
        <span style={styles.modTime}>{timeAgo(thread.created_at)}</span>
      </div>
    </div>
  );
}

// ── Eval metrics mini panel (from latest run report) ─────────────────────────
function EvalMiniPanel({ report }) {
  if (!report?.metrics) return null;
  const m = report.metrics;
  return (
    <div style={styles.evalMini}>
      <SummaryRow label="Identity Differentiation" value={pct(m.identityDifferentiation)} />
      <SummaryRow label="Echo Chamber Index" value={pct(m.echoChamberIndex)} />
      <SummaryRow label="Moderation Flag Rate" value={pct(m.moderationFlagRate)} />
      <SummaryRow label="Content Diversity" value={pct(m.contentDiversity)} />
      <SummaryRow label="Divergence Legible" value={m.divergenceLegible ? "✓ 충족" : "✗ 미충족"} highlight={!m.divergenceLegible} />
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const queryClient = useQueryClient();
  const operatorUser = { id: "operator-view", type: "user" };

  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ["operator-dashboard"],
    queryFn: fetchOperatorDashboard,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: latestReport } = useQuery({
    queryKey: ["latest-report"],
    queryFn: fetchLatestReport,
    staleTime: 30_000,
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ postId, decision }) => reviewModerationItem(postId, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] }),
  });

  if (isLoading) {
    return <div style={styles.loading}>대시보드 로딩 중...</div>;
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorTitle}>forum-server에 연결할 수 없습니다</div>
        <div style={styles.errorMsg}>
          <code>npm run dev:forum-server</code> (port 4000)와 MongoDB가 실행 중인지 확인하세요.
        </div>
      </div>
    );
  }

  const s = dashboard?.summary ?? {};
  const queue = dashboard?.moderation_queue ?? [];
  const threads = dashboard?.high_conflict_threads ?? [];
  const identityShifts = dashboard?.identity_shift_agents ?? [];
  const lowEng = dashboard?.low_engagement_posts ?? [];
  const agentGrowth = dashboard?.agent_growth ?? null;
  const agentEvolution = dashboard?.agent_evolution ?? [];

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <span style={styles.pageTitle}>Operator Dashboard</span>
        <button style={styles.refreshBtn} onClick={refetch}>새로고침</button>
        {dashboard?.computed_at && (
          <span style={styles.computedAt}>{dashboard.computed_at.slice(11, 19)} 기준</span>
        )}
      </div>

      <SectionCard title="공유 콘텐츠 스트림" badge="Forum">
        <PostList
          currentUser={operatorUser}
          readOnly
          onSelectPost={undefined}
        />
      </SectionCard>

      <AgentEvolutionPanel
        title="에이전트 성장/진화"
        subtitle="서비스와 같은 에이전트 풀을 기준으로 성장과 성격 변화를 확인합니다."
        agentGrowth={agentGrowth}
        evolutions={agentEvolution}
        emptyText="아직 운영 대시보드에 표시할 진화 정보가 없습니다."
      />

      {/* 1. Flag 비율 요약 */}
      <SectionCard
        title="오늘의 Flag 비율"
        badge={pct(s.flag_rate)}
        badgeColor={s.flag_rate > 0.1 ? "#fee2e2" : "#dcfce7"}
      >
        <div style={styles.summaryGrid}>
          <SummaryRow label="전체 포스트" value={s.total_posts ?? "—"} />
          <SummaryRow label="Flag된 포스트" value={s.flagged_posts ?? "—"} highlight={(s.flagged_posts ?? 0) > 0} />
          <SummaryRow label="Flag 비율" value={pct(s.flag_rate)} highlight={(s.flag_rate ?? 0) > 0.1} />
        </div>
      </SectionCard>

      {/* 2. 논쟁성 높은 스레드 Top 5 */}
      <SectionCard title="논쟁성 높은 스레드 Top 5" badge={threads.length}>
        {threads.length === 0 ? (
          <div style={styles.empty}>신고된 스레드 없음</div>
        ) : (
          threads.map((t) => <ThreadRow key={t.id} thread={t} />)
        )}
      </SectionCard>

      {/* 3. 급격한 정체성 변화 에이전트 */}
      <SectionCard
        title="급격한 정체성 변화 에이전트"
        badge={identityShifts.length}
        badgeColor={identityShifts.length > 0 ? "#fef3c7" : "#dcfce7"}
      >
        {identityShifts.length === 0 ? (
          <div style={styles.empty}>임계값 초과 에이전트 없음</div>
        ) : (
          identityShifts.map((agent) => (
            <div key={agent.agentId} style={styles.shiftAgentRow}>
              <div style={styles.agentInfo}>
                <span style={styles.agentId}>{agent.agentId}</span>
                <span style={styles.archetype}>{agent.archetype || "—"}</span>
              </div>
              <span style={styles.shiftMagnitude}>변화도 {agent.shift_magnitude.toFixed(3)}</span>
            </div>
          ))
        )}
      </SectionCard>

      {/* 4. 규칙 위반 후보 + 피드백 인터페이스 */}
      <SectionCard title="규칙 위반 후보 (Moderation Queue)" badge={queue.length} badgeColor="#fee2e2">
        {queue.length === 0 ? (
          <div style={styles.empty}>대기 중인 항목 없음</div>
        ) : (
          queue.map((item) => (
            <ModerationItem
              key={item.id}
              item={item}
              onDecision={(postId, decision) => reviewMutation.mutate({ postId, decision })}
            />
          ))
        )}
        {reviewMutation.isSuccess && (
          <div style={styles.mutationSuccess}>결정이 적용되었습니다.</div>
        )}
      </SectionCard>

      {/* 5. 유저 반응 저하 포스트 */}
      <SectionCard title="유저 반응 저하 포스트 (좋아요·댓글 0)" badge={lowEng.length}>
        {lowEng.length === 0 ? (
          <div style={styles.empty}>해당 포스트 없음</div>
        ) : (
          lowEng.map((p) => (
            <div key={p.id} style={styles.lowEngRow}>
              <span style={styles.lowEngContent}>{p.content_preview}</span>
              <span style={styles.modTime}>{timeAgo(p.created_at)}</span>
              <span style={styles.authorType}>{p.author_type === "agent" ? "🤖" : "👤"}</span>
            </div>
          ))
        )}
      </SectionCard>

      {/* 6. 최신 시뮬레이션 지표 (from run report) */}
      <SectionCard title="최신 시뮬레이션 지표">
        {latestReport ? (
          <>
            <div style={styles.reportMeta}>
              run: <code>{latestReport.run_id}</code> · seed {latestReport.seed}
            </div>
            <EvalMiniPanel report={latestReport} />
          </>
        ) : (
          <div style={styles.empty}>아직 실행된 시뮬레이션 없음 — Replay Viewer에서 실행하세요.</div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  loading: { padding: 32, textAlign: "center", color: "#6b7280" },
  topBar: { display: "flex", alignItems: "center", gap: 10 },
  pageTitle: { fontSize: 16, fontWeight: 700, color: "#111827", flex: 1 },
  refreshBtn: { fontSize: 12, background: "none", border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 10px", cursor: "pointer", color: "#6b7280" },
  computedAt: { fontSize: 11, color: "#9ca3af" },

  errorBox: { padding: 20, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 },
  errorTitle: { fontWeight: 600, color: "#dc2626", marginBottom: 4 },
  errorMsg: { fontSize: 13, color: "#6b7280" },

  sectionCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 },
  badge: { fontSize: 11, borderRadius: 10, padding: "2px 8px", fontWeight: 600 },

  summaryGrid: { display: "flex", flexDirection: "column", gap: 4 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  summaryLabel: { color: "#6b7280" },
  summaryValue: { fontWeight: 600 },

  empty: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },

  threadRow: { padding: "8px 0", borderBottom: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 4 },
  threadContent: { fontSize: 13, color: "#1f2937" },
  threadMeta: { display: "flex", gap: 8, fontSize: 11, color: "#9ca3af" },
  conflictScore: { background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 6px" },

  modItem: { padding: "10px 0", borderBottom: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 6 },
  modHeader: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  modScore: { fontSize: 11, fontWeight: 600, color: "#dc2626" },
  modLabel: { fontSize: 11, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "1px 6px" },
  modContent: { fontSize: 13, color: "#374151" },
  modTime: { fontSize: 11, color: "#9ca3af" },
  authorType: { fontSize: 12 },
  reasonRow: { display: "flex", flexWrap: "wrap", gap: 4 },
  reasonChip: { fontSize: 10, background: "#fef9c3", color: "#713f12", borderRadius: 4, padding: "1px 5px" },
  decisionRow: { display: "flex", gap: 6 },
  decBtn: { fontSize: 11, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 500 },
  decApprove: { background: "#dcfce7", color: "#166534" },
  decReject: { background: "#fee2e2", color: "#991b1b" },
  decRecheck: { background: "#f3f4f6", color: "#374151" },
  mutationSuccess: { fontSize: 12, color: "#16a34a" },

  lowEngRow: { display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #f9fafb" },
  lowEngContent: { fontSize: 13, color: "#4b5563", flex: 1 },

  shiftAgentRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" },
  agentInfo: { display: "flex", alignItems: "center", gap: 8 },
  agentId: { fontSize: 13, fontWeight: 600, color: "#1f2937" },
  archetype: { fontSize: 11, background: "#f0fdf4", color: "#166534", borderRadius: 4, padding: "1px 6px" },
  shiftMagnitude: { fontSize: 11, fontWeight: 600, color: "#b45309" },

  reportMeta: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  evalMini: { display: "flex", flexDirection: "column", gap: 4 },
};
