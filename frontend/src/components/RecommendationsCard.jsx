import { useState } from "react";
import { api } from "../services/api.js";

const PRIORITY_COLOR = {
  high: "var(--stress)",
  medium: "var(--wheat)",
  low: "var(--healthy)",
  info: "#6b6455",
};

export default function RecommendationsCard({ farmId }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getRecommendations(farmId);
      setRecs(result.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!recs && !loading && !error) {
    return (
      <button className="btn-primary" style={{ width: "100%" }} onClick={load}>
        Get recommendations
      </button>
    );
  }

  if (loading) return <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>Building recommendations...</p>;

  if (error) {
    return (
      <div>
        <p style={{ fontSize: "0.85rem", color: "var(--stress)" }}>{error}</p>
        <button className="btn-primary" style={{ width: "100%" }} onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {recs.map((r, i) => (
        <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: PRIORITY_COLOR[r.priority] || "#6b6455",
              marginTop: "0.4rem",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "0.88rem" }}>{r.action}</span>
        </li>
      ))}
    </ul>
  );
}
