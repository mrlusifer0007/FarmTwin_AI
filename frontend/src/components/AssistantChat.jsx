import { useState } from "react";
import { api } from "../services/api.js";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
];

export default function AssistantChat({ farmId, defaultLanguage = "en" }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const q = question;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "farmer", text: q }]);
    setLoading(true);
    setError("");

    try {
      const result = await api.askAssistant(farmId, q, language);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "0.75rem" }}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.5rem" }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.75rem" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "farmer" ? "flex-end" : "flex-start",
                background: m.role === "farmer" ? "var(--canopy)" : "#f0ead9",
                color: m.role === "farmer" ? "var(--paper)" : "var(--ink)",
                borderRadius: "10px",
                padding: "0.5rem 0.75rem",
                maxWidth: "85%",
                fontSize: "0.88rem",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      {loading && <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>Thinking...</p>}
      {error && <p style={{ fontSize: "0.85rem", color: "var(--stress)" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder=""
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
