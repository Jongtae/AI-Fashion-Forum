import React, { useState } from "react";
import OperatorDashboard from "./OperatorDashboard.jsx";
import RunReplayViewer from "./RunReplayViewer.jsx";
import Sprint1ReplayPanel from "./Sprint1ReplayPanel.jsx";

const SECTIONS = [
  {
    id: "operator",
    label: "Operator",
    description: "운영 지표, 모더레이션, 공유 콘텐츠 스트림을 봅니다.",
  },
  {
    id: "replay",
    label: "Replay Viewer",
    description: "최신 run replay를 검토합니다.",
  },
  {
    id: "sprint1",
    label: "Sprint 1",
    description: "Identity Drift replay와 평가 지표를 봅니다.",
  },
];

export default function AdminDashboard({ timeSpeed = 1 }) {
  const [activeSection, setActiveSection] = useState("operator");

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
              <span style={styles.menuLabel}>{section.label}</span>
              <span style={styles.menuDesc}>{section.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        {activeSection === "operator" && <OperatorDashboard />}
        {activeSection === "replay" && <RunReplayViewer timeSpeed={timeSpeed} />}
        {activeSection === "sprint1" && <Sprint1ReplayPanel />}
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
};
