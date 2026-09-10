import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import MandiMap from "../components/MandiMap.jsx";
import { CROPS } from "../utils/constants.js";
import { useTranslation } from "react-i18next";

export default function AIAdvisor({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState("");
  const [crop, setCrop] = useState("Wheat");
  const [quantity, setQuantity] = useState(100);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    api.listFarms(user.id).then((f) => {
      setFarms(f);
      if (f.length > 0) {
        setFarmId(f[0].id);
        setCrop(f[0].crop);
      }
      setInitialLoad(false);
    });
  }, [user.id]);

  const fetchAdvice = () => {
    setLoading(true);
    setError("");
    api.getMarketAdvice(crop, { quantity, farmId })
      .then(setAdvice)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialLoad) fetchAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad, farmId]);

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("advisor.title")}
      subtitle={t("advisor.subtitle")}
    >
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="grid grid-4" style={{ alignItems: "end" }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label>{t("advisor.crop")}</label>
            <select value={crop} onChange={(e) => setCrop(e.target.value)}>
              {CROPS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label>{t("advisor.quantity_label")}</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {farms.length > 0 && (
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label>{t("advisor.farm_label")}</label>
              <select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                {farms.map((f) => (<option key={f.id} value={f.id}>{f.farm_name}</option>))}
              </select>
            </div>
          )}
          <button className="btn-primary" onClick={fetchAdvice} disabled={loading}>
            {loading ? t("advisor.calculating") : t("advisor.get_advice")}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--stress)" }}>{error}</p>}

      {advice && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("advisor.smart_route")}</h3>
            <p style={{ color: "#6b6455", marginTop: 0, fontSize: "0.88rem" }}>{t("advisor.smart_route_sub")}</p>
            <MandiMap mandis={advice.mandis} />

            <div className="grid grid-3" style={{ marginTop: "1.25rem" }}>
              {advice.mandis.map((m) => (
                <div
                  key={m.name}
                  className="stat-tile"
                  style={m.name === advice.best_mandi.name ? { borderColor: "var(--canopy)", background: "rgba(77,112,66,0.08)" } : undefined}
                >
                  <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{m.name}</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--soil)", marginBottom: "0.4rem" }}>
                    &#8377;{m.price_per_qtl} {t("advisor.per_quintal")}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#6b6455" }}>{m.distance_km} km &middot; {m.travel_time}</div>
                  <div style={{ fontSize: "0.82rem", color: "#6b6455" }}>{t("advisor.demand")} {m.demand}</div>
                  {m.name === advice.best_mandi.name && (
                    <div className="badge badge-healthy" style={{ marginTop: "0.6rem" }}>{t("advisor.highest_profit")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: "rgba(77,112,66,0.08)", borderColor: "transparent" }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("advisor.recommendation")}</h3>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--soil)", fontSize: "0.92rem", lineHeight: 1.9 }}>
              <li>{t("advisor.current_price")} <strong>&#8377;{advice.today_price} / Quintal</strong></li>
              <li>{t("advisor.predicted_price", { days: advice.predicted_after_days })} <strong>&#8377;{advice.predicted_price} / Quintal</strong></li>
              <li>{t("advisor.best_mandi")} <strong>{advice.best_mandi.name}</strong></li>
              <li>{t("advisor.extra_profit")} <strong>&#8377;{advice.expected_extra_profit}</strong></li>
            </ul>
            <div className="card" style={{ marginTop: "1rem", background: "var(--paper)" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>{t("advisor.final_decision")}</div>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>{advice.final_decision}</p>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6b6455", marginTop: "0.9rem", marginBottom: 0 }}>
              {advice.methodology}
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}
