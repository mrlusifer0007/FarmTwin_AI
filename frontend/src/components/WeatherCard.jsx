import { useState } from "react";
import { api } from "../services/api.js";

export default function WeatherCard({ farmId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getWeather(farmId);
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
        Load weather
      </button>
    );
  }

  if (loading) return <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>Fetching weather...</p>;

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

  const { current, rainfall_7d_mm, rainfall_30d_mm, temperature_avg_7d_c, humidity_avg_7d_pct } = data;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
      <Stat label="Now" value={current.temperature_c !== null ? `${current.temperature_c}°C` : "n/a"} />
      <Stat label="Humidity" value={current.humidity_pct !== null ? `${current.humidity_pct}%` : "n/a"} />
      <Stat label="Rainfall (7d)" value={rainfall_7d_mm !== null ? `${rainfall_7d_mm} mm` : "n/a"} />
      <Stat label="Rainfall (30d)" value={rainfall_30d_mm !== null ? `${rainfall_30d_mm} mm` : "n/a"} />
      <Stat label="Avg temp (7d)" value={temperature_avg_7d_c !== null ? `${temperature_avg_7d_c}°C` : "n/a"} />
      <Stat label="Avg humidity (7d)" value={humidity_avg_7d_pct !== null ? `${humidity_avg_7d_pct}%` : "n/a"} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "#6b6455", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--soil)" }}>{value}</div>
    </div>
  );
}
