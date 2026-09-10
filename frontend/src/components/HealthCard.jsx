import { useState } from "react";
import { api } from "../services/api.js";

function healthLabel(ndviMean) {
  if (ndviMean === null || ndviMean === undefined) return { label: "Unknown", badge: "" };
  if (ndviMean >= 0.6) return { label: "Healthy", badge: "badge-healthy" };
  if (ndviMean >= 0.35) return { label: "Moderate", badge: "badge-moderate" };
  return { label: "Stressed", badge: "badge-stressed" };
}

export default function HealthCard({ farmId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkHealth = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getNdvi(farmId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <button className="btn-primary" style={{ width: "100%" }} onClick={checkHealth}>
        Check crop health
      </button>
    );
  }

  if (loading) return <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>Fetching latest Sentinel-2 scene...</p>;

  if (error) {
    return (
      <div>
        <p style={{ fontSize: "0.85rem", color: "var(--stress)" }}>{error}</p>
        <button className="btn-primary" style={{ width: "100%" }} onClick={checkHealth}>
          Retry
        </button>
      </div>
    );
  }

  const { current, stress } = data;
  const { label, badge } = healthLabel(current.ndvi_mean);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span className={`badge ${badge}`}>{label}</span>
        <span style={{ fontSize: "0.8rem", color: "#6b6455" }}>{current.date}</span>
      </div>
      <p style={{ fontSize: "0.9rem", margin: "0.25rem 0" }}>
        NDVI mean: <strong>{current.ndvi_mean?.toFixed(2) ?? "n/a"}</strong>
        {"  "}(range {current.ndvi_min?.toFixed(2)}–{current.ndvi_max?.toFixed(2)})
      </p>
      {stress.flag && (
        <p style={{ fontSize: "0.85rem", color: "var(--stress)", marginTop: "0.5rem" }}>
          ⚠️ {stress.message}
        </p>
      )}
      {!stress.flag && stress.change_pct !== null && (
        <p style={{ fontSize: "0.8rem", color: "#6b6455" }}>
          {stress.change_pct >= 0 ? "+" : ""}
          {stress.change_pct}% vs. previous observation
        </p>
      )}
    </div>
  );
}
