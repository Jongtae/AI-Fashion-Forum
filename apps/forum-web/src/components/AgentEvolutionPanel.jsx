import React from "react";

const ARCHETYPE_LABELS = {
  quiet_observer: "조용한 관찰자",
  trend_seeker: "트렌드 추구자",
  community_regular: "커뮤니티 일반인",
  brand_loyalist: "브랜드 충성자",
  contrarian_commenter: "반론자",
  empathetic_responder: "공감 응답자",
};

function formatStepLabel(step) {
  if (step?.round != null) {
    return `R${step.round}`;
  }

  if (step?.tick != null) {
    return `T${step.tick}`;
  }

  return "—";
}

function StepCard({ step }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepHeader}>
        <span style={styles.stepLabel}>{formatStepLabel(step)}</span>
        <span style={styles.stepArc}>{step.recentArc || "stable"}</span>
      </div>
      <div style={styles.stepMeta}>
        <span>서사 {step.narrativeCount ?? 0}개</span>
        {step.joinedTick != null && <span>합류 {step.joinedTick}틱</span>}
      </div>
      {step.selfNarrativeSummary && (
        <div style={styles.stepSummary}>{step.selfNarrativeSummary}</div>
      )}
      {step.driftTail?.length > 0 && (
        <div style={styles.stepDrift}>
          {step.driftTail.map((item) => (
            <div key={item} style={styles.driftLine}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvolutionCard({ item }) {
  const latest = item.latestStep || item.timeline?.[item.timeline.length - 1] || null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.handle}>@{item.handle || item.agentId}</div>
          <div style={styles.displayName}>{item.displayName || item.agentId}</div>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.badge}>{ARCHETYPE_LABELS[item.archetype] || item.archetype || "—"}</span>
          {item.shiftMagnitude != null && (
            <span style={styles.shiftBadge}>변화 {Number(item.shiftMagnitude).toFixed(3)}</span>
          )}
        </div>
      </div>

      <div style={styles.metaRow}>
        <span>합류 {item.joinedTick != null ? `${item.joinedTick}틱` : "—"}</span>
        <span>현재 아크 {latest?.recentArc || "stable"}</span>
        <span>현재 서사 {latest?.narrativeCount ?? 0}개</span>
      </div>

      {item.timeline?.length > 0 && (
        <div style={styles.timeline}>
          {item.timeline.map((step) => (
            <StepCard key={`${item.agentId}:${step.round ?? step.tick}`} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentEvolutionPanel({
  title = "에이전트 진화",
  subtitle = "현재 상태와 최근 변화 흐름을 함께 봅니다.",
  agentGrowth = null,
  evolutions = [],
  emptyText = "아직 진화 타임라인이 없습니다.",
}) {
  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Evolution</div>
          <div style={styles.title}>{title}</div>
          <div style={styles.subtitle}>{subtitle}</div>
        </div>
        {agentGrowth && (
          <div style={styles.growthSummary}>
            <span>에이전트 {agentGrowth.currentCount ?? 0}명</span>
            <span>목표 {agentGrowth.desiredCount ?? agentGrowth.maxCount ?? "—"}명</span>
            <span>{agentGrowth.growthStage || "unknown"}</span>
          </div>
        )}
      </div>

      {agentGrowth && (
        <div style={styles.growthBar}>
          <span>초기 {agentGrowth.initialCount ?? 0}명</span>
          <span>간격 {agentGrowth.growthInterval ?? 4}틱</span>
          {agentGrowth.ticksUntilNextSpawn != null && (
            <span>다음 합류까지 {agentGrowth.ticksUntilNextSpawn}틱</span>
          )}
        </div>
      )}

      {evolutions.length === 0 ? (
        <div style={styles.empty}>{emptyText}</div>
      ) : (
        <div style={styles.list}>
          {evolutions.map((item) => (
            <EvolutionCard key={item.agentId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    border: "1px solid #dbeafe",
    borderRadius: 12,
    background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
    padding: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "start",
    flexWrap: "wrap",
  },
  kicker: {
    fontSize: 11,
    fontWeight: 700,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    marginTop: 2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
  },
  growthSummary: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    fontSize: 11,
    color: "#1d4ed8",
  },
  growthBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 11,
    color: "#64748b",
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 10,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
  },
  handle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#111827",
  },
  displayName: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  headerMeta: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  badge: {
    fontSize: 10,
    borderRadius: 999,
    padding: "3px 8px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
  },
  shiftBadge: {
    fontSize: 10,
    borderRadius: 999,
    padding: "3px 8px",
    background: "#fef3c7",
    color: "#92400e",
    fontWeight: 700,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 11,
    color: "#64748b",
  },
  timeline: {
    display: "grid",
    gap: 8,
  },
  stepCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 10,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  stepArc: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7c3aed",
  },
  stepMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 10,
    color: "#64748b",
  },
  stepSummary: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.5,
  },
  stepDrift: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  driftLine: {
    fontSize: 10,
    color: "#475569",
    background: "#eef2ff",
    borderRadius: 6,
    padding: "4px 6px",
  },
  empty: {
    padding: 16,
    borderRadius: 8,
    border: "1px dashed #cbd5e1",
    color: "#64748b",
    background: "#fff",
    fontSize: 13,
  },
};

