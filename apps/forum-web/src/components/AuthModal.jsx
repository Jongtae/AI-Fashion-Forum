import React, { useState } from "react";
import { register, login } from "../api/client.js";

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const res = await fn(form);
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("auth_user", JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.activeTab : {}) }}
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            style={{ ...styles.tab, ...(mode === "register" ? styles.activeTab : {}) }}
            onClick={() => setMode("register")}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            placeholder="사용자명 (3–30자)"
            value={form.username}
            onChange={update("username")}
            style={styles.input}
            required
          />
          {mode === "register" && (
            <input
              placeholder="표시 이름"
              value={form.displayName}
              onChange={update("displayName")}
              style={styles.input}
              required
            />
          )}
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={form.password}
            onChange={update("password")}
            style={styles.input}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#fff", borderRadius: 12, padding: 28, width: 340,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  tabs: { display: "flex", marginBottom: 20, borderBottom: "1px solid #e5e7eb" },
  tab: {
    flex: 1, padding: "8px 0", background: "none", border: "none",
    fontSize: 15, cursor: "pointer", color: "#6b7280", borderBottom: "2px solid transparent",
    marginBottom: -1,
  },
  activeTab: { color: "#111827", fontWeight: 600, borderBottomColor: "#111827" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6,
    fontSize: 14, color: "#111827", background: "#fff",
  },
  error: { color: "#dc2626", fontSize: 13, margin: 0 },
  submitBtn: {
    padding: "10px", background: "#111827", color: "#fff", border: "none",
    borderRadius: 6, fontSize: 15, cursor: "pointer", fontWeight: 600,
  },
};
