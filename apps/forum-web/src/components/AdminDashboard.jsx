import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentLoopStatus, fetchLatestReport } from "../api/client.js";
import OperatorDashboard from "./OperatorDashboard.jsx";
import RunReplayViewer from "./RunReplayViewer.jsx";
import Sprint1ReplayPanel from "./Sprint1ReplayPanel.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";

const SECTIONS = [
  {
    id: "operator",
    label: "글 흐름",
    category: "흐름",
    description: "글의 반응 흐름과 공유 콘텐츠 지표를 봅니다.",
  },
  {
    id: "replay",
    label: "기록 보기",
    category: "기록",
    description: "최근 기록을 확인합니다.",
  },
  {
    id: "sprint1",
    label: "흐름 기록",
    category: "흐름",
    description: "흐름 기록과 평가 지표를 봅니다.",
  },
];

const ACTIONS = [
  {
    id: "operator",
    label: "글 흐름 확인",
    description: "현재 글 흐름과 운영 지표를 먼저 확인합니다.",
  },
  {
    id: "replay",
    label: "기록 열기",
    description: "최근 실행 기록과 에이전트 반응 흐름을 봅니다.",
  },
  {
    id: "sprint1",
    label: "흐름 기록 보기",
    description: "캐릭터 변화와 Sprint 1 분석을 비교합니다.",
  },
];

function formatLoopSummary(loopStatus, isLoading, error) {
  if (isLoading) return "시뮬레이션 상태를 불러오는 중...";
  if (error) return "시뮬레이션 연결 실패";
  if (!loopStatus) return "시뮬레이션이 아직 시작되지 않았습니다.";

  return `라운드 ${loopStatus.currentRound ?? 0} · 에이전트 ${loopStatus.agentCount ?? 0}명`;
}

function formatLoopDetail(loopStatus, timeSpeed) {
  if (!loopStatus) return `실행 속도 ${timeSpeed}x`;
  const nextSpawn = loopStatus.growth?.ticksUntilNextSpawn;
  if (nextSpawn != null) {
    return `다음 합류까지 ${nextSpawn}틱 · 실행 속도 ${timeSpeed}x`;
  }
  return `실행 속도 ${timeSpeed}x`;
}

function formatReportSummary(report, isLoading, error) {
  if (isLoading) return "최신 리포트를 불러오는 중...";
  if (error) return "최신 리포트를 아직 찾지 못했습니다.";
  if (!report) return "최근 실행 기록이 없습니다.";

  return `기록 ${report.run_id || "—"} · 씨드 ${report.seed ?? "—"}`;
}

function formatReportDetail(report) {
  if (!report?.computed_at) return "아직 생성 시각이 없습니다.";
  return `마지막 생성 ${report.computed_at.slice(11, 19)} 기준`;
}

function StatusCard({ label, title, summary, detail, tone = "neutral" }) {
  return (
    <div style={{ ...styles.statusCard, ...(tone === "warn" ? styles.statusCardWarn : {}) }}>
      <span style={styles.statusLabel}>{label}</span>
      <div style={styles.statusTitle}>{title}</div>
      <div style={styles.statusSummary}>{summary}</div>
      {detail && <div style={styles.statusDetail}>{detail}</div>}
    </div>
  );
}

export default function AdminDashboard({ timeSpeed = 1 }) {
  const [activeSection, setActiveSection] = useState("home");
  const { data: loopStatus, isLoading: loopLoading, error: loopError } = useQuery({
    queryKey: ["admin-loop-status"],
    queryFn: fetchAgentLoopStatus,
    refetchInterval: 15_000,
    retry: 1,
  });

  const { data: latestReport, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ["admin-latest-report"],
    queryFn: async () => {
      try {
        return await fetchLatestReport();
      } catch (error) {
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  });

  function renderHome() {
    const summaryCards = [
      {
        label: "현재 라운드",
        value: loopStatus?.currentRound ?? 0,
        description: "시뮬레이션이 지금 어디까지 왔는지 보여줍니다.",
      },
      {
        label: "에이전트",
        value: loopStatus?.agentCount ?? 0,
        description: "같은 콘텐츠를 소비하고 반응하는 참여자 수입니다.",
      },
      {
        label: "최근 기록",
        value: latestReport?.run_id || "—",
        description: "선택과 반응이 상태로 누적된 결과입니다.",
      },
      {
        label: "다음 포인트",
        value: activeSection === "home" ? "흐름 선택" : activeSection,
        description: "어떤 흐름을 열어볼지 결정하는 진입점입니다.",
      },
    ];

    return (
      <div style={styles.homeGrid}>
        <div style={styles.homeHero}>
          <p style={styles.homeKicker}>운영 허브</p>
          <h2 style={styles.homeTitle}>운영 화면</h2>
          <p style={styles.homeText}>흐름과 기록을 확인합니다.</p>
          <IdentityLoopSummary
            kicker="operator view"
            title="운영 요약"
            subtitle="흐름과 기록만 간단히 봅니다."
            cards={summaryCards}
            notes={[
              "흐름 확인",
              "기록 확인",
            ]}
          />
          <div style={styles.quickActions}>
            {ACTIONS.map((action) => (
              <button key={action.id} type="button" style={styles.quickAction} onClick={() => setActiveSection(action.id)}>
                <span style={styles.quickActionLabel}>{action.label}</span>
                <span style={styles.quickActionDesc}>{action.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.statusRail}>
          <StatusCard
            label="연결 상태"
            title={formatLoopSummary(loopStatus, loopLoading, loopError)}
            summary={formatLoopDetail(loopStatus, timeSpeed)}
            detail="자동 진행 중이면 이 값이 계속 갱신됩니다."
            tone={loopError ? "warn" : "neutral"}
          />
          <StatusCard
            label="최신 리포트"
            title={formatReportSummary(latestReport, reportLoading, reportError)}
            summary={formatReportDetail(latestReport)}
            detail={latestReport ? `평가 지표와 글 흐름이 담긴 최신 결과입니다.` : "기록이 없으면 아직 실행되지 않은 상태입니다."}
            tone={reportError ? "warn" : "neutral"}
          />
          <StatusCard
            label="다음 할 일"
            title={activeSection === "home" ? "흐름 카드에서 한 곳을 선택하세요" : "선택한 화면을 아래에서 확인하세요"}
            summary="왼쪽 카드로 목적을 읽고, 오른쪽 바로가기로 바로 이동합니다."
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.hero}>
        <div>
          <p style={styles.kicker}>허브</p>
          <h1 style={styles.title}>포럼 흐름 허브</h1>
          <p style={styles.description}>
            서비스 화면과 분리된 운영 전용 공간입니다. 무엇을 보고 무엇을 해야 하는지 바로 보이도록 정리했습니다.
          </p>
        </div>
        <div style={styles.menuGrid}>
          <button
            type="button"
            style={{
              ...styles.menuCard,
              ...(activeSection === "home" ? styles.menuCardActive : {}),
            }}
            onClick={() => setActiveSection("home")}
          >
            <span style={styles.menuCategory}>허브</span>
            <span style={styles.menuLabel}>첫 화면</span>
            <span style={styles.menuDesc}>흐름 메뉴와 현재 위치를 한 번에 봅니다.</span>
          </button>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              style={{
                ...styles.menuCard,
                ...(activeSection === section.id ? styles.menuCardActive : {}),
              }}
              onClick={() => setActiveSection(section.id)}
            >
              <span style={styles.menuCategory}>{section.category}</span>
              <span style={styles.menuLabel}>{section.label}</span>
              <span style={styles.menuDesc}>{section.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        {activeSection === "home" && renderHome()}
        {activeSection === "operator" && <OperatorDashboard />}
        {activeSection === "replay" && (
          <RunReplayViewer
            timeSpeed={timeSpeed}
            onOpenSprint1={() => setActiveSection("sprint1")}
          />
        )}
        {activeSection === "sprint1" && (
          <Sprint1ReplayPanel onOpenReplay={() => setActiveSection("replay")} />
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  kicker: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "6px 0 0",
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
  },
  description: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    alignItems: "stretch",
    minWidth: 0,
    flex: 1,
  },
  menuCard: {
    textAlign: "left",
    padding: 14,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minHeight: 96,
  },
  menuCategory: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  menuCardActive: {
    borderColor: "#111827",
    boxShadow: "0 0 0 1px #111827 inset",
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  menuDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  homeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  homeHero: {
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  homeKicker: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  homeTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
  },
  homeText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#475569",
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  quickAction: {
    textAlign: "left",
    padding: 14,
    borderRadius: 10,
    border: "1px solid #dbe4f0",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: "#111827",
  },
  quickActionDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.45,
  },
  statusRail: {
    display: "grid",
    gap: 12,
    alignContent: "start",
  },
  statusCard: {
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: 18,
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statusCardWarn: {
    borderColor: "#fecaca",
    background: "#fff",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.35,
  },
  statusSummary: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
  },
  statusDetail: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5,
  },
  locationLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  locationBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d4ed8",
    background: "#dbeafe",
    borderRadius: 999,
    padding: "4px 10px",
  },
  locationBadgeActive: {
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
    background: "#e2e8f0",
    borderRadius: 999,
    padding: "4px 10px",
  },
  locationSep: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 700,
  },
  homeCards: {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: 10,
  },
  homeCard: {
    textAlign: "left",
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "pointer",
  },
  homeCardCategory: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  homeCardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#111827",
  },
  homeCardDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
  },
};
