import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { IconSun, IconDroplet, IconWind } from "../components/icons.jsx";
import { useTranslation } from "react-i18next";

function formatTime(iso) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function WeatherIntelligence({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listFarms(user.id).then((f) => {
      setFarms(f);
      if (f.length) setFarmId(f[0].id);
      else setLoading(false);
    });
  }, [user.id]);

  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    setError("");
    api.getWeather(farmId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [farmId]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const weekday = (dateStr) => {
    if (dateStr === todayStr) return t("weather.today_label");
    return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short" });
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("weather.title")}
      subtitle={t("weather.subtitle")}
      actions={
        farms.length > 1 && (
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} style={{ width: "auto" }}>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.farm_name}</option>
            ))}
          </select>
        )
      }
    >
      {farms.length === 0 && !loading && (
        <div className="card empty-state">
          <p>{t("weather.register_prompt")}</p>
        </div>
      )}

      {loading && <p style={{ color: "#6b6455" }}>{t("weather.fetching")}</p>}
      {error && <p style={{ color: "var(--stress)" }}>{error}</p>}

      {data && (
        <>
          <div className="grid grid-4" style={{ marginBottom: "1.25rem" }}>
            <StatCard label={t("weather.temperature")} value={`${data.current.temperature_c ?? "–"}°C`} sub={`Feels like ${data.current.feels_like_c ?? "–"}°C`} accent="tile-accent-stress" />
            <StatCard label={t("weather.humidity")} value={`${data.current.humidity_pct ?? "–"}%`} icon={<IconDroplet />} accent="tile-accent-sky" />
            <StatCard label={t("weather.wind")} value={`${data.current.wind_kmh ?? "–"} km/h`} icon={<IconWind />} accent="tile-accent-canopy" />
            <StatCard label={t("weather.condition")} value={data.current.condition} icon={<IconSun />} accent="tile-accent-amber" />
          </div>

          <div className="grid grid-2" style={{ marginBottom: "1.25rem", alignItems: "start" }}>
            <div className="card">
              <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("weather.today")}</h3>
              <div className="grid grid-2">
                <MiniField label={t("weather.sunrise")} value={formatTime(data.today.sunrise)} />
                <MiniField label={t("weather.sunset")} value={formatTime(data.today.sunset)} />
                <MiniField label={t("weather.rain_chance")} value={`${data.today.rain_chance_pct ?? "–"}%`} />
                <MiniField label={t("weather.pressure")} value={`${data.current.pressure_hpa ?? "–"} hPa`} />
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("weather.air_quality")}</h3>
              {data.air_quality ? (
                <>
                  <div style={{ background: "rgba(77,112,66,0.12)", borderRadius: 10, padding: "1rem", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.78rem", color: "#6b6455" }}>AQI</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--soil)" }}>{data.air_quality.aqi ?? "–"}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--healthy)", fontWeight: 600 }}>{data.air_quality.aqi_label}</div>
                  </div>
                  <MiniField label={t("weather.pm25")} value={`${data.air_quality.pm2_5 ?? "–"} µg/m³`} />
                  <MiniField label={t("weather.uv")} value={data.today.uv_index_max ?? "–"} />
                </>
              ) : (
                <p style={{ color: "#6b6455", fontSize: "0.9rem" }}>{t("weather.aqi_unavailable")}</p>
              )}
            </div>
          </div>

          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="card">
              <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("weather.forecast")}</h3>
              {data.forecast_7d.map((day) => (
                <div className="list-row" key={day.date}>
                  <span style={{ width: 70, fontWeight: 600 }}>{weekday(day.date)}</span>
                  <span style={{ flex: 1, color: "#6b6455", fontSize: "0.85rem" }}>{day.condition}</span>
                  <span style={{ fontWeight: 600 }}>{Math.round(day.temp_max_c)}&deg;</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card">
                <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem", color: "var(--stress)" }}>{t("weather.alerts")}</h3>
                {data.alerts.length === 0 && <p style={{ color: "#6b6455", fontSize: "0.9rem" }}>{t("weather.no_alerts")}</p>}
                {data.alerts.map((a, i) => (
                  <div key={i} style={{ background: a.level === "warning" ? "var(--amber-light)" : "var(--sky-light)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{a.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "#6b6455" }}>{a.detail}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("weather.advice")}</h3>
                {data.advice.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.6rem", padding: "0.5rem 0", fontSize: "0.88rem" }}>
                    <span style={{ color: "var(--canopy)" }}>&#8226;</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SoilProfilePanel farmId={farmId} />
        </>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="stat-tile">
      <div className="stat-label" style={{ display: "flex", justifyContent: "space-between" }}>
        {label}
        {icon && <span style={{ color: "var(--canopy)" }}>{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: "0.78rem", color: "#6b6455", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

function MiniField({ label, value }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", color: "#6b6455" }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SoilProfilePanel({ farmId }) {
  const { t } = useTranslation();
  const [soil, setSoil] = useState(null);
  useEffect(() => { if (!farmId) return; api.getSoilProfile(farmId).then(setSoil).catch(() => {}); }, [farmId]);
  if (!soil) return null;
  return (
    <div style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e7e3d8", padding: "1.4rem", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", marginTop: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
        <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🧪</div>
        <div>
          <h2 style={{ fontSize: "1.18rem", fontWeight: 700, color: "#1c2419", margin: 0 }}>Soil Profile & Taxonomy</h2>
          <div style={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 500 }}>{soil.source}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.85rem" }}>
        {[
          { label: t("dashboard.soil_type"), val: soil.soil_type },
          { label: t("dashboard.soil_ph"), val: soil.ph },
          { label: t("dashboard.clay"), val: `${soil.clay_pct}%` },
          { label: t("dashboard.sand"), val: `${soil.sand_pct}%` },
          { label: t("dashboard.org_carbon"), val: `${soil.organic_carbon_g_kg} g/kg` },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "12px", padding: "0.8rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.76rem", color: "#92400e" }}>{label}</div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#78350f", marginTop: "2px" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
