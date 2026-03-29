import React from "react";

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
    borderRadius: 18,
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
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
    color: "#2563eb",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: "#475569",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  card: {
    borderRadius: 14,
    border: "1px solid #bfdbfe",
    background: "#ffffffcc",
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
    color: "#2563eb",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 1.6,
    color: "#475569",
  },
  notes: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  note: {
    fontSize: 13,
    lineHeight: 1.7,
    color: "#334155",
    background: "#ffffffb8",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
};
