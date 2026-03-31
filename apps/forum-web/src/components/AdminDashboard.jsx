import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentLoopStatus, fetchLatestReport } from "../api/client.js";
import PostList from "./PostList.jsx";
import OperatorDashboard from "./OperatorDashboard.jsx";
import RunReplayViewer from "./RunReplayViewer.jsx";
import Sprint1ReplayPanel from "./Sprint1ReplayPanel.jsx";

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

function formatLoopDetail(loopStatus) {
  if (!loopStatus) return "자동 진행이 활성화되어 있습니다.";
  const nextSpawn = loopStatus.growth?.ticksUntilNextSpawn;
  if (nextSpawn != null) {
    return `다음 합류까지 ${nextSpawn}틱`;
  }
  return "자동 진행이 활성화되어 있습니다.";
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

export default function AdminDashboard({ activeSection = "home", onSectionChange = () => {} }) {
  const operatorUser = { id: "operator-view", type: "user" };
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

  const statusNotice = loopError || reportError ? (
    <div style={styles.noticeCard}>
      <div style={styles.noticeTitle}>일부 데이터를 아직 불러오지 못했습니다</div>
      <div style={styles.noticeText}>
        연결이 불안정해도 화면은 계속 사용할 수 있습니다. 잠시 뒤 새로고침하면 다시 확인됩니다.
      </div>
    </div>
  ) : null;

  function renderHome() {
    return (
      <div style={styles.homeGrid}>
        <div style={styles.homeFeed}>
          <div style={styles.homeIntro}>
            <p style={styles.homeKicker}>관리자 홈</p>
            <h2 style={styles.homeTitle}>최근에 쓰인 글부터 봅니다</h2>
            <p style={styles.homeText}>지표보다 먼저 실제 글의 톤과 흐름을 훑고, 필요할 때만 도구로 들어갑니다.</p>
          </div>

          <div style={styles.homeFeedCard}>
            <div style={styles.homeFeedHeader}>
              <span style={styles.homeFeedLabel}>최근 글</span>
              <span style={styles.homeFeedHint}>가장 최근에 올라온 글부터 자연스럽게 확인합니다.</span>
            </div>
            <PostList
              currentUser={operatorUser}
              readOnly
              surfaceVariant="feed"
              queryParams={{ sort: "recent" }}
            />
          </div>
        </div>

        <div style={styles.statusRail}>
          <StatusCard
            label="연결 상태"
            title={formatLoopSummary(loopStatus, loopLoading, loopError)}
            summary={formatLoopDetail(loopStatus)}
            tone={loopError ? "warn" : "neutral"}
          />
          <StatusCard
            label="최신 리포트"
            title={formatReportSummary(latestReport, reportLoading, reportError)}
            summary={formatReportDetail(latestReport)}
            detail={latestReport ? `평가 지표와 글 흐름이 담긴 최신 결과입니다.` : "기록이 없으면 아직 실행되지 않은 상태입니다."}
            tone={reportError ? "warn" : "neutral"}
          />
          {statusNotice}
          <div style={styles.toolsCard}>
            <span style={styles.toolsLabel}>도구</span>
            <div style={styles.toolsRow}>
              {ACTIONS.map((action) => (
                <button key={action.id} type="button" style={styles.toolBtn} onClick={() => onSectionChange(action.id)}>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
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
        <div style={styles.tabBar}>
          <button
            type="button"
            style={{ ...styles.tabButton, ...(activeSection === "home" ? styles.tabButtonActive : {}) }}
            onClick={() => onSectionChange("home")}
          >
            첫 화면
          </button>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              style={{ ...styles.tabButton, ...(activeSection === section.id ? styles.tabButtonActive : {}) }}
              onClick={() => onSectionChange(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        {activeSection === "home" && renderHome()}
        {activeSection === "operator" && <OperatorDashboard />}
        {activeSection === "replay" && (
          <RunReplayViewer onOpenSprint1={() => setActiveSection("sprint1")} />
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
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    alignItems: "center",
    minWidth: 0,
    flex: 1,
  },
  tabButton: {
    textAlign: "left",
    padding: "8px 12px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  tabButtonActive: {
    borderColor: "#111827",
    boxShadow: "0 0 0 1px #111827 inset",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  homeGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 320px",
    gap: 16,
    alignItems: "start",
  },
  homeFeed: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  homeIntro: { display: "flex", flexDirection: "column", gap: 8 },
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
  homeFeedCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  homeFeedHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  homeFeedLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#111827",
  },
  homeFeedHint: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "#64748b",
  },
  statusRail: {
    display: "grid",
    gap: 12,
    alignContent: "start",
  },
  statusCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
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
  noticeCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fde68a",
    background: "#fffbeb",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  noticeTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 800,
    color: "#92400e",
  },
  noticeText: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.5,
    color: "#a16207",
  },
  toolsCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  toolsLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  toolsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  toolBtn: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dbe4f0",
    borderRadius: 999,
    background: "#fff",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
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
