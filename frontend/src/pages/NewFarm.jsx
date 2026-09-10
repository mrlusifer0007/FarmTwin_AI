import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BoundaryMap from "../components/BoundaryMap.jsx";
import AppShell from "../components/AppShell.jsx";
import { api } from "../services/api.js";
import { CROPS } from "../utils/constants.js";

export default function NewFarm({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [farmName, setFarmName] = useState("");
  const [crop, setCrop] = useState("Soybean");
  const [sowingDate, setSowingDate] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleBoundaryChange = useCallback((geojson) => setBoundary(geojson), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boundary) {
      setError(t("dashboard.farm_boundary_sub"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.createFarm({
        user_id: user?.id || "",
        farm_name: farmName,
        crop,
        sowing_date: sowingDate || null,
        boundary,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell user={user} role={role} onSwitchRole={onSwitchRole} onLogout={onLogout} onLanguageChange={onLanguageChange} title={t("dashboard.register_farm")}>
      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="field-group">
                <label htmlFor="farmName">{t("dashboard.farm_name").replace(" *", "")}</label>
                <input
                  id="farmName"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder=""
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="crop">{t("common.crop")}</label>
                <select id="crop" value={crop} onChange={(e) => setCrop(e.target.value)}>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="sowingDate">{t("dashboard.sowing_date")}</label>
                <input
                  id="sowingDate"
                  type="date"
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>{t("dashboard.farm_boundary")}</label>
            <p style={{ fontSize: "0.85rem", color: "#6b6455", marginTop: 0 }}>
              {t("dashboard.farm_boundary_sub")}
            </p>
            <BoundaryMap onBoundaryChange={handleBoundaryChange} />
            {boundary && (
              <p style={{ fontSize: "0.85rem", color: "var(--canopy)", marginTop: "0.75rem" }}>
                {t("dashboard.boundary_captured")}
              </p>
            )}
          </div>

          {error && <p style={{ color: "var(--stress)" }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t("common.saving") : t("dashboard.save_farm").replace("💾 ", "")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
