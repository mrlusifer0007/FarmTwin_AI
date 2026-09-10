import { useState } from "react";
import { api } from "../services/api.js";

const BADGE_BY_LABEL = {
  healthy: "badge-healthy",
  moderate: "badge-moderate",
  stressed: "badge-stressed",
};

export default function HealthPredictionCard({ farmId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getHealthPrediction(farmId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <button className="btn-primary" style={{ width: "100%" }} onClick={load}>
        Run AI health prediction
      </button>
    );
  }

  if (loading) return <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>Scoring current conditions...</p>;

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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span className={`badge ${BADGE_BY_LABEL[data.health_label] || ""}`}>{data.health_label}</span>
        <span style={{ fontSize: "0.8rem", color: "#6b6455" }}>
          {Math.round(data.confidence * 100)}% confidence
        </span>
      </div>
      <p style={{ fontSize: "0.75rem", color: "#6b6455", marginTop: "0.5rem" }}>
        Model input: NDVI {data.inputs.ndvi_mean.toFixed(2)}, {data.inputs.rainfall_7d_mm}mm rain (7d),{" "}
        {data.inputs.temperature_avg_7d_c}°C avg (7d)
      </p>
    </div>
  );
}
