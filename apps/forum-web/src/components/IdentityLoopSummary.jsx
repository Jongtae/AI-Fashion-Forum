import React from "react";
import { chatTheme } from "../lib/chat-ui-theme.js";

function ValueCard({ label, value, description }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
      {description && <div style={styles.cardDescription}>{description}</div>}
    </div>
  );
}

export default function IdentityLoopSummary({
  kicker = "identity loop",
  title,
  subtitle,
  cards = [],
  notes = [],
}) {
  return (
    <section style={styles.root}>
      <div style={styles.header}>
        <p style={styles.kicker}>{kicker}</p>
        {title && <h2 style={styles.title}>{title}</h2>}
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      {cards.length > 0 && (
        <div style={styles.grid}>
          {cards.map((card) => (
            <ValueCard
              key={`${card.label}-${card.value}`}
              label={card.label}
              value={card.value}
              description={card.description}
            />
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div style={styles.notes}>
          {notes.map((note) => (
            <div key={note} style={styles.note}>
              {note}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  root: {
    padding: 18,
    borderRadius: chatTheme.radiusXL,
    border: `1px solid ${chatTheme.shellBorder}`,
    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 248, 252, 0.98) 100%)`,
    boxShadow: chatTheme.shadow,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  kicker: {
    margin: 0,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: chatTheme.accent,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: chatTheme.text,
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: chatTheme.textMuted,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  card: {
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelSoft,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: chatTheme.textMuted,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 800,
    color: chatTheme.text,
    lineHeight: 1.2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 1.6,
    color: chatTheme.textMuted,
  },
  notes: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  note: {
    fontSize: 13,
    lineHeight: 1.7,
    color: chatTheme.textSoft,
    background: "rgba(255,255,255,0.7)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: chatTheme.radiusMD,
    padding: 12,
  },
};
