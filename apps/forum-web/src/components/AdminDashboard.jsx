import React, { useState } from "react";
import OperatorDashboard from "./OperatorDashboard.jsx";
import RunReplayViewer from "./RunReplayViewer.jsx";
import Sprint1ReplayPanel from "./Sprint1ReplayPanel.jsx";

const SECTIONS = [
  {
    id: "operator",
    label: "운영 지표",
    category: "운영",
    description: "모더레이션, 공유 콘텐츠 스트림, 운영 메트릭을 봅니다.",
  },
  {
    id: "replay",
    label: "재생 검토",
    category: "재생",
    description: "최신 run replay를 검토합니다.",
  },
  {
    id: "sprint1",
    label: "실험 로그",
    category: "분석",
    description: "Identity Drift replay와 평가 지표를 봅니다.",
  },
];

export default function AdminDashboard({ timeSpeed = 1 }) {
  const [activeSection, setActiveSection] = useState("home");

  function renderHome() {
    return (
      <div style={styles.homeGrid}>
        <div style={styles.homeHero}>
          <p style={styles.homeKicker}>첫 화면</p>
          <h2 style={styles.homeTitle}>운영 도구 허브</h2>
          <p style={styles.homeText}>
            서비스와 분리된 운영 메뉴를 한곳에 모아두고, 현재 위치와 카테고리를 항상 같은 방식으로 보여줍니다.
          </p>
          <div style={styles.locationLine}>
            <span style={styles.locationBadge}>Admin</span>
            <span style={styles.locationSep}>/</span>
            <span style={styles.locationBadgeActive}>허브 홈</span>
          </div>
        </div>

        <div style={styles.homeCards}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              style={styles.homeCard}
              onClick={() => setActiveSection(section.id)}
            >
              <span style={styles.homeCardCategory}>{section.category}</span>
              <span style={styles.homeCardTitle}>{section.label}</span>
              <span style={styles.homeCardDesc}>{section.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.hero}>
        <div>
          <p style={styles.kicker}>Admin</p>
          <h1 style={styles.title}>운영 도구 허브</h1>
          <p style={styles.description}>
            서비스 화면과 분리된 운영용 메뉴를 이곳에 모았습니다.
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
            <span style={styles.menuDesc}>운영 메뉴와 현재 위치를 한 번에 봅니다.</span>
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
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
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
    borderRadius: 12,
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
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
  },
  homeHero: {
    padding: 20,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
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
    fontSize: 26,
    fontWeight: 800,
    color: "#111827",
  },
  homeText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: "#475569",
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
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)",
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
