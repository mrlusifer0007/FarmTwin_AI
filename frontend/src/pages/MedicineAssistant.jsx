import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { CROPS } from "../utils/constants.js";

export default function MedicineAssistant({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [crop, setCrop] = useState(location.state?.crop || "Wheat");

  const [messages, setMessages] = useState([
    { role: "bot", text: t("medicine.greeting") },
  ]);
  const [question, setQuestion] = useState(location.state?.question || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const SUGGESTIONS = [
    t("medicine.s1"),
    t("medicine.s2"),
    t("medicine.s3"),
    t("medicine.s4"),
  ];

  useEffect(() => {
    if (location.state?.question) {
      handleAsk(location.state.question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAsk = async (text) => {
    const q = (text ?? question).trim();
    if (!q) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    setError("");
    try {
      const res = await api.askMedicineAssistant(q, crop, user.language);
      setMessages((prev) => [...prev, { role: "bot", text: res.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("medicine.title")}
      subtitle={t("medicine.subtitle")}
    >
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="field-group">
          <label>{t("medicine.crop")}</label>
          <select value={crop} onChange={(e) => setCrop(e.target.value)} style={{ width: 200 }}>
            {CROPS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="chat-thread" style={{ marginBottom: "0.75rem" }}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : "bot"}`}>
              {m.text}
            </div>
          ))}
          {loading && <div className="chat-bubble bot">{t("medicine.thinking")}</div>}
        </div>

        {error && <p style={{ color: "var(--stress)", fontSize: "0.85rem" }}>{error}</p>}

        <div className="suggestion-row">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => handleAsk(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder=""
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
            {t("common.send")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
