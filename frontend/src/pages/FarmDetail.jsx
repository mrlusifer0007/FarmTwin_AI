import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../services/api.js";
import NdviMap from "../components/NdviMap.jsx";
import AppShell from "../components/AppShell.jsx";

export default function FarmDetail({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [farm, setFarm] = useState(null);
  const [allFarms, setAllFarms] = useState([]);
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState("");
  const [loadingGrid, setLoadingGrid] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api.listFarms(user.id).then((list) => setAllFarms(list || [])).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    api
      .getFarm(farmId)
      .then((f) => {
        setFarm(f);
        setLoadingGrid(true);
        api
          .getNdviGrid(farmId, 3)
          .then((result) => setGrid(result.cells))
          .catch(() => {})
          .finally(() => setLoadingGrid(false));
      })
      .catch((err) => setError(err.message));
  }, [farmId]);

  if (!farm) {
    return <p style={{ padding: "2rem" }}>{error || t("common.loading")}</p>;
  }

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={farm.farm_name}
      subtitle={`${farm.crop} \u00b7 ${farm.area_acres ? farm.area_acres.toFixed(2) : "?"} ${t("common.area_acres").replace("Area (", "").replace(")", "")}`}
      actions={
        <Link to="/dashboard" style={{ fontSize: "0.85rem", color: "var(--canopy)", textDecoration: "none", fontWeight: 600 }}>
          {t("farm_detail.back")}
        </Link>
      }
    >
      {error && <p style={{ color: "var(--stress)" }}>{error}</p>}

      <div style={{ maxWidth: 960 }}>
        {/* Multi-Farm Boundary Selector */}
        {allFarms.length > 1 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e7e3d8",
              padding: "1rem 1.4rem",
              marginBottom: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.1rem" }}>🌾</span>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1c2419" }}>{t("dashboard.select_farm")}</div>
                <div style={{ fontSize: "0.76rem", color: "#6e6757" }}>{t("dashboard.registered_fields", { count: allFarms.length })}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              {allFarms.map((f) => {
                const isActive = f.id === farm.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/farms/${f.id}`)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "16px",
                      border: isActive ? "2px solid #2f4d27" : "1px solid #dcd3bf",
                      background: isActive ? "#2f4d27" : "#fcfaf4",
                      color: isActive ? "#ffffff" : "#3b3628",
                      fontSize: "0.82rem",
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {f.farm_name} ({f.crop})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Farm Metadata Card */}
        <div className="card" style={{ marginBottom: "1.5rem", background: "#ffffff", borderRadius: "18px", padding: "1.4rem", border: "1px solid #e7e3d8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#6e6757", fontWeight: 500 }}>{t("dashboard.farm_name").replace(" *", "").toUpperCase()}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1c2419", marginTop: "2px" }}>{farm.farm_name}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#6e6757", fontWeight: 500 }}>{t("common.crop").toUpperCase()}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1c2419", marginTop: "2px" }}>{farm.crop}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#6e6757", fontWeight: 500 }}>{t("dashboard.sowing_date").toUpperCase()}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1c2419", marginTop: "2px" }}>{farm.sowing_date || "N/A"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#6e6757", fontWeight: 500 }}>{t("dashboard.area").toUpperCase()}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1c2419", marginTop: "2px" }}>{farm.area_acres ? `${farm.area_acres.toFixed(2)}` : "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Farm Boundary / Field Health Map Card */}
        <div className="card" style={{ background: "#ffffff", borderRadius: "18px", padding: "1.4rem", border: "1px solid #e7e3d8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1c2419", margin: 0 }}>{t("farm_detail.map_title")}</h3>
            {loadingGrid && <span style={{ fontSize: "0.8rem", color: "#6e6757" }}>{t("farm_detail.loading_zones")}</span>}
          </div>
          
          <NdviMap boundaryGeojson={farm.boundary} gridCells={grid} allBoundaries={allFarms} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.8rem", color: "#6b6455" }}>
            <span>{t("farm_detail.boundary_captured")}</span>
            {grid && (
              <div style={{ display: "flex", gap: "1rem" }}>
                <span><span style={{ color: "#4d7042" }}>&#9632;</span> {t("farm_detail.good_vigor")}</span>
                <span><span style={{ color: "#d9a441" }}>&#9632;</span> {t("farm_detail.moderate")}</span>
                <span><span style={{ color: "#b4472a" }}>&#9632;</span> {t("farm_detail.low_vigor")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
